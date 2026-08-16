import puppeteer from "puppeteer-core";
const URL = "http://localhost:5173/";
const errors = [];
let fails = 0;
function mark(l) { console.log("P5> " + l); }
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
const sceneActive = (k) => evalV((kk) => { try { return window.__LUMI__.game.scene.isActive(kk); } catch { return false; } }, k);
const screenShown = (name) => page.evaluate((n) => !!document.querySelector('#react-shell [data-screen="' + n + '"]'), name);
const menuActive = () => page.evaluate(() => !!document.querySelector('#react-shell [data-action="play"]'));
async function waitFor(fn, ms) { const s = Date.now(); let v = await fn(); while (Date.now() - s < ms && !v) { await sleep(800); v = await fn(); } return v; }

async function reloadToMenu() {
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await waitFor(() => menuActive(), 20000);
  await sleep(2000);
}

async function startRun() {
  await evalV(() => window.__LUMI__.gm.nav.showMenu());
  await waitFor(() => menuActive(), 8000);
  let fresh = false;
  for (let i = 0; i < 3 && !fresh; i++) {
    await page.click('[data-action="play"]');
    fresh = await waitFor(() => evalV(() => {
      const gm = window.__LUMI__.gm;
      return !!gm.run && gm.run.time < 1.5;
    }), 6000);
  }
  if (!fresh) throw new Error("could not start a fresh run");
  await sleep(1200);
  await evalV(() => {
    const g = window.__LUMI__.gm;
    const gs = window.__LUMI__.game.scene.getScene("Game");
    try { g.debug.player?.grantInvulnerability(300000); } catch (e) { g.debug.lastErr = String(e); }
    // Cumulative spawn + projectile counters (chain the game's own hooks).
    window.__LUMI__._spawns = [];
    window.__LUMI__._projFired = 0;
    const origSpawn = gs.waves.onEnemySpawned;
    gs.waves.onEnemySpawned = (e) => {
      window.__LUMI__._spawns.push(e.def.id);
      if (origSpawn) origSpawn(e);
    };
    const gp = gs.enemyProjectiles;
    const origAdd = gp.add.bind(gp);
    gp.add = (child, ...rest) => { window.__LUMI__._projFired++; return origAdd(child, ...rest); };
    try { gs.game.events.removeAllListeners("hidden"); } catch {}
  });
  await sleep(400);
}

// If a level-up card screen is up, pick the middle card (retry across positions for the first-click quirk).
async function dismissLevelUps() {
  for (let t = 0; t < 12; t++) {
    const lu = await evalV(() => { try { return window.__LUMI__.game.scene.isActive("LevelUp"); } catch { return false; } });
    if (!lu) return;
    const xs = [360, 180, 540];
    await page.mouse.click(xs[t % xs.length], 793);
    await sleep(450);
  }
}

async function section(name, fn) {
  mark("--- " + name + " ---");
  try { await fn(); } catch (e) { const st = (e && e.stack) ? e.stack.split("\n").slice(0, 4).join(" | ") : String(e); mark("FAIL " + name + " threw: " + st.slice(0, 500)); fails++; }
}

// ----- 1) onboarding -----
await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(4000);
await page.click('[data-action="play"]');
await waitFor(() => evalV(() => !!window.__LUMI__.gm.run), 15000);

await section("onboarding", async () => {
  const onboardingOn = await evalV(() => { try { return window.__LUMI__.game.scene.getScene("Game").onboarding === true; } catch { return false; } });
  check(onboardingOn, "onboarding overlay active on first run");
  await sleep(1500);
  const t1 = await evalV(() => (window.__LUMI__.gm.run ? window.__LUMI__.gm.run.time : -1));
  await sleep(1500);
  const t2 = await evalV(() => (window.__LUMI__.gm.run ? window.__LUMI__.gm.run.time : -1));
  check(Math.abs(t2 - t1) < 0.5, "run frozen while onboarding");
  await page.mouse.click(360, 640);
  await sleep(1200);
  const onboardingOff = await evalV(() => { try { return window.__LUMI__.game.scene.getScene("Game").onboarding === false; } catch { return false; } });
  const flagSet = await evalV(() => localStorage.getItem("lumi_onboarded") === "1");
  check(onboardingOff && flagSet, "onboarding dismissed + persisted");
  await sleep(2000);
  const t3 = await evalV(() => (window.__LUMI__.gm.run ? window.__LUMI__.gm.run.time : -1));
  check(t3 > t2, "run resumes after onboarding");
});

// ----- 2) new enemies + ranged fire -----
await section("new enemies + ranged fire", async () => {
  await reloadToMenu();
  await startRun();
  await evalV(() => { const g = window.__LUMI__.gm; if (g.run && g.run.time < 120) g.run.time = 120; });
  let sawRangedFire = false;
  for (let i = 0; i < 36; i++) {
    await dismissLevelUps();
    const info = await evalV(() => ({
      spawns: (window.__LUMI__._spawns || []).slice(),
      projFired: window.__LUMI__._projFired || 0,
      time: window.__LUMI__.gm.run ? Math.round(window.__LUMI__.gm.run.time) : -1,
      ended: (() => { try { return window.__LUMI__.game.scene.getScene("Game").ended; } catch { return null; } })(),
    }));
    if (info.projFired > 0) sawRangedFire = true;
    if (i % 8 === 0) mark("poll " + i + " time=" + info.time + " spawns=" + info.spawns.join(",") + " proj=" + info.projFired + " ended=" + info.ended);
    if (info.spawns.includes("spitter") && info.spawns.includes("mimic") && sawRangedFire) break;
    await sleep(1200);
  }
  const final = await evalV(() => ({ spawns: (window.__LUMI__._spawns || []).slice(), projFired: window.__LUMI__._projFired || 0 }));
  check(final.spawns.includes("spitter"), "spitter spawns in waves (cum=" + final.spawns.filter(s => s === "spitter").length + ")");
  check(final.spawns.includes("mimic"), "mimic spawns in waves (cum=" + final.spawns.filter(s => s === "mimic").length + ")");
  check(sawRangedFire || final.projFired > 0, "spitter fires projectiles at the player (fired=" + final.projFired + ")");
});

// ----- 3) music toggle -----
await section("music toggle", async () => {
  await reloadToMenu();
  await page.click('[data-action="settings"]');
  await waitFor(() => screenShown("settings"), 8000);
  const musicBefore = await evalV(() => window.__LUMI__.gm.save.get().settings.music);
  await page.mouse.click(360, 410);
  await sleep(800);
  const musicAfter = await evalV(() => ({ saved: window.__LUMI__.gm.save.get().settings.music, audio: window.__LUMI__.gm.audio.isMusicOn() }));
  check(musicAfter.saved !== musicBefore, "music toggle persists");
  check(musicAfter.audio === musicAfter.saved, "audio manager honors music toggle");
});

// ----- 4) golem summon -----
await section("golem summon", async () => {
  await reloadToMenu();
  await startRun();
  await evalV(() => { const g = window.__LUMI__.gm; if (g.run) g.run.time = 299; });
  let spawned = false;
  for (let i = 0; i < 45 && !spawned; i++) {
    await dismissLevelUps();
    spawned = await evalV(() => !!window.__LUMI__.gm.debug.golem);
    const gtime = await evalV(() => (window.__LUMI__.gm.run ? Math.round(window.__LUMI__.gm.run.time) : -1));
    if (i % 10 === 0) mark("golem wait " + i + " spawned=" + spawned + " time=" + gtime);
    if (!spawned) await sleep(1000);
  }
  check(spawned, "golem spawns at 5:00");
  const golemOk = await evalV(() => {
    const golem = window.__LUMI__.gm.debug.golem;
    return !!golem && typeof golem.onSummonMinions === "function";
  });
  check(golemOk, "golem summon callback wired");
  const enemiesBefore = await evalV(() => window.__LUMI__.game.scene.getScene("Game").enemies.countActive(true));
  await evalV(() => {
    const golem = window.__LUMI__.gm.debug.golem;
    if (golem && golem.onSummonMinions) golem.onSummonMinions(golem.x, golem.y);
  });
  await sleep(1500);
  const enemiesAfter = await evalV(() => window.__LUMI__.game.scene.getScene("Game").enemies.countActive(true));
  check(enemiesAfter >= enemiesBefore + 3, "golem summon spawns 3 minions (+" + (enemiesAfter - enemiesBefore) + ")");
});

// ----- 5) content counts -----
await section("content counts", async () => {
  const content = await evalV(() => ({
    missions: window.__LUMI__.gm.missions.getDefinitions().length,
    stormHawk: !!window.__LUMI__.gm.creatures.getDef("stormHawk"),
    lavaSnail: !!window.__LUMI__.gm.creatures.getDef("lavaSnail"),
    nightOwl: !!window.__LUMI__.gm.creatures.getDef("nightOwl"),
  }));
  check(content.missions === 13, "13 missions (got " + content.missions + ")");
  check(content.stormHawk && content.lavaSnail && content.nightOwl, "3 new creatures defined");
});

mark("--- errors (" + errors.length + ") ---");
for (const e of errors.slice(0, 6)) mark("ERR: " + e.slice(0, 200));
await browser.close();
check(fails === 0 && errors.length === 0, "no failures / no errors");
mark("RESULT: " + (fails === 0 && errors.length === 0 ? "PASS" : "FAIL"));
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
