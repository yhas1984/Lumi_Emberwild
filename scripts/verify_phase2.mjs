import puppeteer from "puppeteer-core";

const URL = "http://localhost:5173/";
const logs = [];
const errors = [];
let fails = 0;

function mark(label) { console.log("P2> " + label); }
function check(ok, label) { mark((ok ? "PASS " : "FAIL ") + label); if (!ok) fails++; }

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--window-size=720,1280"],
  defaultViewport: { width: 720, height: 1280 },
});
const page = await browser.newPage();
page.on("console", (m) => { logs.push(m.type() + ": " + m.text()); if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => { if (!String(e.message).includes("AudioContext")) errors.push("PAGEERROR: " + e.message); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hasLog = (n) => logs.some((l) => l.includes(n));
const cnt = (n) => logs.filter((l) => l.includes(n)).length;
const sceneActive = (key) => page.evaluate((k) => { try { return window.__LUMI__.game.scene.isActive(k); } catch { return false; } }, key);
const screenShown = (name) => page.evaluate((n) => !!document.querySelector('#react-shell [data-screen="' + n + '"]'), name);
const menuActive = () => page.evaluate(() => !!document.querySelector('#react-shell [data-action="play"]'));
const evalV = (fn) => page.evaluate(fn);
const obtainedEvents = () => evalV(() => window.__LUMI__.gm.analytics.getBuffer().filter((e) => e.event === "creature_obtained").length);

// Polls a value until it satisfies the predicate (tolerates headless stalls).
async function pollUntil(getter, predicate, timeoutMs, label) {
  const start = Date.now();
  let last = await getter();
  while (Date.now() - start < timeoutMs && !predicate(last)) {
    await sleep(1200);
    last = await getter();
  }
  check(predicate(last), label + " (got " + last + ")");
  return last;
}

// Opens and drains eggs: tap to hatch, click HATCH NEXT/Continue until closed.
async function drainEggs(tag) {
  for (let guard = 0; guard < 10 && (await sceneActive("EggHatch")); guard++) {
    await sleep(800);
    await page.mouse.click(360, 430); // tap egg (anywhere hatches)
    await sleep(1800);
    await page.mouse.click(360, 880); // HATCH NEXT or Continue
    await sleep(900);
  }
  check(!(await sceneActive("EggHatch")), tag + " eggs drained, scene closed");
}

async function drainAndWait(condition, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // Only pick level-up cards when the LevelUp screen is really open
    // (the card position overlaps other scenes' buttons otherwise).
    if (cnt("ability_selected") < cnt("level_up") && (await sceneActive("LevelUp"))) {
      await sleep(1400);
      await page.mouse.click(360, 793);
      await sleep(600);
    }
    if (await condition()) return true;
    await sleep(1000);
  }
  return Boolean(await condition());
}

// ---------- 1) Boot & menu ----------
await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(3500);
check(!!(await page.$("canvas")), "canvas present");
check(await menuActive(), "main menu active (React)");

// ---------- 2) Run + revive ----------
await page.evaluate(() => localStorage.setItem("lumi_onboarded", "1"));
await page.click('[data-action="play"]');
check(await drainAndWait(() => hasLog("run_started"), 15000), "run started");
await drainAndWait(() => cnt("ability_selected") >= 1, 25000);
check(cnt("ability_selected") >= 1, "level up card picked");

for (let i = 0; i < 4 && !(await sceneActive("Revive")); i++) {
  await evalV(() => { const p = window.__LUMI__.gm.debug.player; if (p) { p.stats.health = 0; if (p.onDeath) p.onDeath(); } });
  await sleep(1500);
}
check(await sceneActive("Revive"), "revive scene shown on death");
let revived = false;
for (let i = 0; i < 5 && !revived; i++) {
  await page.mouse.click(360, 640); // WATCH AD
  revived = await drainAndWait(async () => {
    const hp = await evalV(() => { try { return window.__LUMI__.gm.debug.player.stats.health; } catch { return -1; } });
    return hp > 0;
  }, 6000);
}
check(revived, "revived (full health)");
await drainAndWait(async () => {
  const paused = await evalV(() => window.__LUMI__.game.scene.isPaused("Game"));
  return !paused;
}, 15000);
check(!(await evalV(() => window.__LUMI__.game.scene.isPaused("Game"))), "game resumed after revive");
check(await evalV(() => window.__LUMI__.gm.analytics.getBuffer().some((e) => e.event === "rewarded_ad_requested")), "ad request tracked");

// ---------- 3) Boss + victory + eggs ----------
await evalV(() => { const g = window.__LUMI__.gm; if (g.run) { g.run.time = 299; g.run.pendingEggs = 2; } });
check(await drainAndWait(() => hasLog("boss_started"), 25000), "boss started");
let killed = false;
for (let i = 0; i < 20 && !killed; i++) {
  killed = await evalV(() => {
    const g = window.__LUMI__.gm.debug.golem;
    if (g && g.health > 0) { g.takeDamage(999999); return true; }
    return false;
  });
  if (!killed) { await drainAndWait(() => cnt("level_up") <= cnt("ability_selected"), 4000); await sleep(800); }
}
check(killed, "boss killed");
check(await drainAndWait(() => hasLog("boss_defeated"), 20000), "boss defeated");
// Force a deterministic egg count AFTER the boss egg-drop roll (random 12%).
await evalV(() => { const g = window.__LUMI__.gm; if (g.run) g.run.pendingEggs = 2; });
check(await drainAndWait(() => evalV(() => window.__LUMI__.gm.analytics.getBuffer().some((e) => e.event === "run_completed")), 40000), "run completed");
check(await drainAndWait(() => sceneActive("Victory"), 10000), "victory scene");

await page.mouse.click(360, 880); // Open Eggs (2)
check(await drainAndWait(() => sceneActive("EggHatch"), 8000), "egg hatch scene");
const obtainedBeforeVictory = await obtainedEvents();
await drainEggs("victory");
await pollUntil(() => obtainedEvents(), (n) => n >= obtainedBeforeVictory + 2, 20000, "2 eggs hatched (creature_obtained x2)");
await evalV(() => { try { if (window.__LUMI__.game.scene.isActive("EggHatch")) window.__LUMI__.game.scene.stop("EggHatch"); } catch {} });

// ---------- 4) Double rewards ----------
const coinsBeforeDouble = await evalV(() => window.__LUMI__.gm.economy.coins);
await page.mouse.click(360, 974); // DOUBLE REWARDS
await sleep(3500);
const coinsAfterDouble = await evalV(() => window.__LUMI__.gm.economy.coins);
check(coinsAfterDouble > coinsBeforeDouble, "double rewards granted");

// ---------- 5) Missions (stats set BEFORE entering) ----------
await evalV(() => { window.__LUMI__.gm.save.update((d) => { d.statistics.totalKills = 100; }); });
await page.mouse.click(360, 1160); // Main Menu
await drainAndWait(() => menuActive(), 8000);
await page.click('[data-action="missions"]'); // Missions nav
check(await drainAndWait(() => screenShown("missions"), 8000), "missions scene (React)");
await page.mouse.click(200, 356); // claim kill_100 (grid card 0,0)
await sleep(1500);
const coinsAfterMission = await evalV(() => window.__LUMI__.gm.economy.coins);
check(coinsAfterMission >= coinsAfterDouble + 150, "mission claim granted 150 coins");

// ---------- 6) Daily rewards ----------
await page.mouse.click(62, 84); // back
await drainAndWait(() => menuActive(), 8000);
await page.click('[data-action="daily"]'); // Daily nav
check(await drainAndWait(() => screenShown("daily"), 8000), "daily rewards screen (React)");
const coinsBeforeDaily = await evalV(() => window.__LUMI__.gm.economy.coins);
await page.mouse.click(360, 640); // CLAIM
await sleep(1500);
const coinsAfterDaily = await evalV(() => window.__LUMI__.gm.economy.coins);
check(coinsAfterDaily > coinsBeforeDaily, "daily claim granted reward");
const streakAfterFirst = await evalV(() => window.__LUMI__.gm.save.get().daily.streak);
check(streakAfterFirst >= 1, "daily streak advanced");

// grace: pretend last claim was 2 days ago (1 missed day) -> chain preserved
await page.mouse.click(62, 84); // back to menu
await drainAndWait(() => menuActive(), 8000);
await evalV(() => {
  const d = window.__LUMI__.gm.save.get().daily;
  const twoDays = new Date(Date.now() - 2 * 86400000);
  const key = twoDays.getFullYear() + "-" + String(twoDays.getMonth() + 1).padStart(2, "0") + "-" + String(twoDays.getDate()).padStart(2, "0");
  d.lastClaimDay = key;
});
await page.click('[data-action="daily"]'); // Daily nav again
check(await drainAndWait(() => screenShown("daily"), 8000), "daily re-entered (React)");
// The first click after a scene restart can be swallowed by Phaser: retry.
let streakAfterGrace = await evalV(() => window.__LUMI__.gm.save.get().daily.streak);
for (let i = 0; i < 5 && streakAfterGrace < 2; i++) {
  await page.mouse.click(360, 640); // CLAIM (grace)
  await sleep(900);
  streakAfterGrace = await evalV(() => window.__LUMI__.gm.save.get().daily.streak);
}
check(streakAfterGrace >= 2, "grace day kept the chain (streak=" + streakAfterGrace + ")");

// ---------- 7) Shop ----------
await page.mouse.click(62, 84); // back
await drainAndWait(() => menuActive(), 8000);
await page.click('[data-action="shop"]'); // Shop nav
check(await drainAndWait(() => screenShown("shop"), 8000), "shop screen (React)");
await evalV(() => { window.__LUMI__.gm.economy.addGems(200); });
await sleep(800);
const obtainedBeforeShop = await obtainedEvents();
await page.mouse.click(570, 360); // buy egg
await sleep(1500);
check(await drainAndWait(() => sceneActive("EggHatch"), 6000), "shop egg opens hatch");
await drainEggs("shop");
await pollUntil(() => obtainedEvents(), (n) => n >= obtainedBeforeShop + 1, 30000, "shop egg hatched a creature");
await evalV(() => { try { if (window.__LUMI__.game.scene.isActive("EggHatch")) window.__LUMI__.game.scene.stop("EggHatch"); } catch {} });
const coinsBeforePouch = await evalV(() => window.__LUMI__.gm.economy.coins);
check(await drainAndWait(() => screenShown("shop"), 8000), "back on shop screen after egg hatch");
await page.mouse.click(570, 550); // buy coin pouch
await sleep(1500);
const coinsAfterPouch = await evalV(() => window.__LUMI__.gm.economy.coins);
check(coinsAfterPouch === coinsBeforePouch + 1000, "coin pouch granted 1000");

// ---------- 8) Creatures gallery ----------
await page.mouse.click(62, 84);
await drainAndWait(() => menuActive(), 8000);
await page.click('[data-action="creatures"]');
check(await drainAndWait(() => screenShown("creatures"), 8000), "creatures gallery (React)");

// ---------- 9) Sanctuary shows creatures ----------
await page.mouse.click(62, 84);
await drainAndWait(() => menuActive(), 8000);
await page.click('[data-action="sanctuary"]');
check(await drainAndWait(() => screenShown("sanctuary"), 8000), "sanctuary screen (React)");
check((await evalV(() => window.__LUMI__.gm.creatures.getOwned().length)) >= 1, "sanctuary sees creatures");

// ---------- 10) Debug panel (gameplay context: F2 -> Phaser panel) ----------
await page.mouse.click(62, 84); // back to menu first
await drainAndWait(() => menuActive(), 8000);
await evalV(() => { window.__LUMI__.gm.save.update((d) => { d.account.difficulty = "normal"; }); });
await page.click('[data-action="play"]'); // enter a run so the Phaser panel applies
await drainAndWait(() => hasLog("run_started"), 15000);
await page.keyboard.press("F2");
check(await drainAndWait(() => sceneActive("DebugPanel"), 5000), "debug panel opens with F2 (in game)");
const coinsBeforeDbg = await evalV(() => window.__LUMI__.gm.economy.coins);
await page.mouse.click(235, 320); // +1000 Coins
await sleep(1000);
const coinsAfterDbg = await evalV(() => window.__LUMI__.gm.economy.coins);
check(coinsAfterDbg === coinsBeforeDbg + 1000, "debug +1000 coins");
await page.keyboard.press("F2");
await sleep(1000);
check(!(await sceneActive("DebugPanel")), "debug panel closes with F2");
await evalV(() => { const g = window.__LUMI__.gm; if (g.run) g.run.time = 299; });
await drainAndWait(() => hasLog("boss_started"), 25000);
let killed2 = false;
for (let i = 0; i < 20 && !killed2; i++) {
  killed2 = await evalV(() => {
    const g = window.__LUMI__.gm.debug.golem;
    if (g && g.health > 0) { g.takeDamage(999999); return true; }
    return false;
  });
  if (!killed2) { await drainAndWait(() => cnt("level_up") <= cnt("ability_selected"), 4000); await sleep(800); }
}
await drainAndWait(() => evalV(() => window.__LUMI__.gm.analytics.getBuffer().some((e) => e.event === "run_completed")), 40000);
await drainAndWait(() => sceneActive("Victory"), 15000);
// back to menu from victory (deterministic: same code the button calls)
await evalV(() => window.__LUMI__.gm.nav.showMenu());
check(await drainAndWait(() => menuActive(), 8000), "back to React menu after victory");

// ---------- 11) Persistence ----------
const persist = await evalV(() => { const g = window.__LUMI__.gm; return { coins: g.economy.coins, creatures: g.creatures.count() }; });
await page.reload({ waitUntil: "load" });
await sleep(3000);
const persist2 = await evalV(() => { const g = window.__LUMI__.gm; return { coins: g.economy.coins, creatures: g.creatures.count() }; });
check(persist2.coins === persist.coins && persist2.creatures === persist.creatures, "save persists (coins + creatures)");

mark("--- eh logs ---");
for (const l of logs) { if (l.includes("[eh]")) mark("EH: " + l.slice(0, 160)); }
mark("--- errors (" + errors.length + ") ---");
for (const e of errors.slice(0, 10)) mark("ERR: " + e.slice(0, 250));
await browser.close();
check(fails === 0 && errors.length === 0, "no failures / no errors");
mark("RESULT: " + (fails === 0 && errors.length === 0 ? "PASS" : "FAIL"));
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);