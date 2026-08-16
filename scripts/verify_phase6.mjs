import puppeteer from "puppeteer-core";
const URL = "http://localhost:5173/";
const errors = [];
let fails = 0;
function mark(l) { console.log("P6> " + l); }
function check(ok, label) { mark((ok ? "PASS " : "FAIL ") + label); if (!ok) fails++; }

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--window-size=720,1280"],
  defaultViewport: { width: 720, height: 1280 },
});
const page = await browser.newPage();
page.on("pageerror", (e) => { if (!String(e.message).includes("AudioContext")) errors.push("PAGEERROR: " + e.message); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evalV = (fn) => page.evaluate(fn);
const menuActive = () => page.evaluate(() => !!document.querySelector('#react-shell [data-action="play"]'));
const screenShown = (name) => page.evaluate((n) => !!document.querySelector('#react-shell [data-screen="' + n + '"]'), name);
async function waitFor(fn, ms) { const s = Date.now(); let v = await fn(); while (Date.now() - s < ms && !v) { await sleep(800); v = await fn(); } return v; }

async function startRun() {
  await evalV(() => window.__LUMI__.gm.nav.showMenu());
  await waitFor(() => menuActive(), 8000);
  let fresh = false;
  for (let i = 0; i < 3 && !fresh; i++) {
    await page.click('[data-action="play"]');
    fresh = await waitFor(() => evalV(() => { const gm = window.__LUMI__.gm; return !!gm.run && gm.run.time < 1.5; }), 6000);
  }
  if (!fresh) throw new Error("could not start a fresh run");
  await sleep(1500);
  await evalV(() => {
    const g = window.__LUMI__.gm;
    const gs = window.__LUMI__.game.scene.getScene("Game");
    try { g.debug.player?.grantInvulnerability(300000); } catch {}
    try { gs.game.events.removeAllListeners("hidden"); } catch {}
  });
  await sleep(400);
}

async function dismissLevelUps() {
  for (let t = 0; t < 12; t++) {
    const lu = await evalV(() => { try { return window.__LUMI__.game.scene.isActive("LevelUp"); } catch { return false; } });
    if (!lu) return;
    await page.mouse.click(360, 793);
    await sleep(450);
  }
}

async function waitGolem() {
  for (let i = 0; i < 60; i++) {
    await dismissLevelUps();
    const g = await evalV(() => !!window.__LUMI__.gm.debug.golem);
    if (g) return true;
    await sleep(1000);
  }
  return false;
}

async function section(name, fn) {
  mark("--- " + name + " ---");
  try { await fn(); } catch (e) { mark("FAIL " + name + " threw: " + String(e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : e).slice(0, 400)); fails++; }
}

await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(4000);
await page.evaluate(() => localStorage.setItem("lumi_onboarded", "1"));

// ----- A) Victory unlocks + auto-selects the next difficulty -----
await section("victory unlocks difficulty", async () => {
  await startRun();
  await evalV(() => { const g = window.__LUMI__.gm; if (g.run) g.run.time = 299; });
  check(await waitGolem(), "golem spawns");
  const hpNormal = await evalV(() => window.__LUMI__.gm.debug.golem.maxHealth);
  check(hpNormal === 5500, "normal boss HP 5500 (got " + hpNormal + ")");
  await evalV(() => { const go = window.__LUMI__.gm.debug.golem; go.health = 1; go.takeDamage(2); });
  let vic = false;
  for (let i = 0; i < 12 && !vic; i++) {
    await sleep(1000);
    const st = await evalV(() => ({
      victory: window.__LUMI__.game.scene.isActive("Victory"),
      game: window.__LUMI__.game.scene.isActive("Game"),
      paused: window.__LUMI__.game.scene.isPaused("Game"),
      lu: window.__LUMI__.game.scene.isActive("LevelUp"),
      ended: (() => { try { return window.__LUMI__.game.scene.getScene("Game").ended; } catch { return null; } })(),
      run: !!window.__LUMI__.gm.run,
      golem: !!window.__LUMI__.gm.debug.golem,
    }));
    console.log("A t+" + i + "s " + JSON.stringify(st));
    vic = st.victory;
  }
  check(vic, "victory scene after boss death");
  const acc = await evalV(() => { const a = window.__LUMI__.gm.save.get().account; return { diff: a.difficulty, unlocked: a.difficultyUnlocked }; });
  check(acc.diff === "hard" && acc.unlocked === 1, "hard unlocked and selected (" + JSON.stringify(acc) + ")");
  for (let i = 0; i < 5 && !(await menuActive()); i++) { await page.mouse.click(360, 1066); await sleep(1500); }
  check(await menuActive(), "victory layout eggs=0: Main Menu at y=1066 works");
});

// ----- B) Menu difficulty selector -----
await section("menu difficulty selector", async () => {
  const chip1 = await page.evaluate(() => { const el = document.querySelector('[data-action="difficulty"]'); return el ? el.textContent : ""; });
  check(chip1.includes("Difícil"), "selector shows the auto-selected hard (" + chip1.trim() + ")");
  await page.click('[data-action="difficulty"]');
  await sleep(600);
  const d1 = await evalV(() => window.__LUMI__.gm.save.get().account.difficulty);
  check(d1 === "normal", "cycle hard -> normal");
  await page.click('[data-action="difficulty"]');
  await sleep(600);
  const d2 = await evalV(() => window.__LUMI__.gm.save.get().account.difficulty);
  const chip2 = await page.evaluate(() => { const el = document.querySelector('[data-action="difficulty"]'); return el ? el.textContent : ""; });
  check(d2 === "hard" && chip2.includes("Difícil"), "cycle normal -> hard and persists (" + chip2.trim() + ")");
});

// ----- C) Boss scales with difficulty -----
await section("boss HP scales with difficulty", async () => {
  await evalV(() => { window.__LUMI__.gm.save.update((d) => { d.account.difficulty = "hard"; }); });
  await startRun();
  await evalV(() => { const g = window.__LUMI__.gm; if (g.run) g.run.time = 299; });
  check(await waitGolem(), "golem spawns (hard)");
  const hpHard = await evalV(() => window.__LUMI__.gm.debug.golem.maxHealth);
  check(hpHard === Math.round(5500 * 2.2), "hard boss HP = 5500x2.2 (got " + hpHard + ")");
  const dmg = await evalV(() => window.__LUMI__.gm.debug.golem.damage);
  check(dmg === Math.round(16 * 1.3), "hard boss damage scaled (got " + dmg + ")");
});

// ----- D) Auto-attack targets the boss -----
await section("auto-attack hits the boss", async () => {
  await evalV(() => { window.__LUMI__.gm.save.update((d) => { d.account.difficulty = "normal"; }); });
  await startRun();
  await evalV(() => { const g = window.__LUMI__.gm; if (g.run) g.run.time = 295; });
  check(await waitGolem(), "golem spawns (targeting)");
  // Make the boss the only nearby target: clear the field and bring it into range.
  await evalV(() => {
    const g = window.__LUMI__.gm;
    const gs = window.__LUMI__.game.scene.getScene("Game");
    gs.enemies.clear(true, true);
    const golem = g.debug.golem;
    golem.x = g.debug.player.x + 140;
    golem.y = g.debug.player.y;
    window.__LUMI__._bossHits = 0;
    const orig = golem.takeDamage.bind(golem);
    golem.takeDamage = function (amount) { window.__LUMI__._bossHits++; return orig(amount); };
  });
  let hits = 0;
  for (let i = 0; i < 15 && hits === 0; i++) {
    await dismissLevelUps();
    hits = await evalV(() => window.__LUMI__._bossHits || 0);
    if (i % 5 === 4) mark("boss hits so far: " + hits);
    await sleep(1000);
  }
  check(hits > 0, "auto-attack damages the boss without cheats (hits=" + hits + ")");
});

// ----- E) Victory survives a pending level-up overlay -----
await section("victory robust with open level-up", async () => {
  await startRun();
  await evalV(() => { const g = window.__LUMI__.gm; if (g.run) g.run.time = 299; });
  check(await waitGolem(), "golem spawns (robust)");
  // Open a level-up (this pauses the scene) and kill the boss while it is open.
  await evalV(() => { const gs = window.__LUMI__.game.scene.getScene("Game"); gs.onLevelUp(3); });
  await sleep(800);
  const luOpen = await evalV(() => window.__LUMI__.game.scene.isActive("LevelUp"));
  check(luOpen, "level-up overlay open (scene paused)");
  await evalV(() => { const go = window.__LUMI__.gm.debug.golem; go.health = 1; go.takeDamage(2); });
  const vic = await waitFor(() => evalV(() => window.__LUMI__.game.scene.isActive("Victory")), 10000);
  check(vic, "victory appears despite the open level-up");
  const luAfter = await evalV(() => window.__LUMI__.game.scene.isActive("LevelUp"));
  check(!luAfter, "level-up overlay closed after victory");
  const result = await evalV(() => { const r = window.__LUMI__.gm.save.get().account; return { diff: r.difficulty, unlocked: r.difficultyUnlocked }; });
  check(result.diff === "normal" && result.unlocked === 1, "win on an already-unlocked tier: no double unlock, selection kept (" + JSON.stringify(result) + ")");
});

mark("--- errors (" + errors.length + ") ---");
for (const e of errors.slice(0, 6)) mark("ERR: " + e.slice(0, 200));
await browser.close();
check(fails === 0 && errors.length === 0, "no failures / no errors");
mark("RESULT: " + (fails === 0 && errors.length === 0 ? "PASS" : "FAIL"));
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
