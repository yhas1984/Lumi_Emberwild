import puppeteer from "puppeteer-core";

const URL = "http://localhost:5173/";
const logs = [];
const errors = [];
let fails = 0;
function mark(l) { console.log("P3> " + l); }
function check(ok, label) { mark((ok ? "PASS " : "FAIL ") + label); if (!ok) fails++; }

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--window-size=720,1280"],
  defaultViewport: { width: 720, height: 1280 },
});
const page = await browser.newPage();
page.on("console", (m) => { logs.push(m.type() + ": " + m.text()); if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sceneActive = (key) => page.evaluate((k) => { try { return window.__LUMI__.game.scene.isActive(k); } catch { return false; } }, key);
const screenShown = (name) => page.evaluate((n) => !!document.querySelector('#react-shell [data-screen="' + n + '"]'), name);
const menuActive = () => page.evaluate(() => !!document.querySelector('#react-shell [data-action="play"]'));
const evalV = (fn) => page.evaluate(fn);
async function waitScene(key, ms) {
  const start = Date.now();
  while (Date.now() - start < ms && !(await sceneActive(key))) await sleep(800);
  return sceneActive(key);
}
async function waitFor(fn, ms) {
  const start = Date.now();
  let v = await fn();
  while (Date.now() - start < ms && !v) { await sleep(800); v = await fn(); }
  return v;
}

// ---------- 1) Boot + analytics session ----------
await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(3500);
check(await menuActive(), "main menu active (React)");
const bootMetrics = await evalV(() => {
  const am = window.__LUMI__.gm.analyticsManager;
  const store = am.getStore();
  const m = am.metrics();
  return { sessions: store.sessions.length, activeDays: store.activeDays.length, gameStarted: store.counters["game_started"] ?? 0, d1: m.d1 };
});
check(bootMetrics.sessions >= 1, "session recorded on boot (sessions=" + bootMetrics.sessions + ")");
check(bootMetrics.activeDays >= 1, "active day recorded");
check(bootMetrics.gameStarted >= 1, "game_started counter");
check(bootMetrics.d1 === "pending", "D1 retention pending (fresh install)");

// ---------- 2) Settings + Stats ----------
await page.click('[data-action="settings"]'); // gear
check(await waitFor(() => screenShown("settings"), 8000), "settings screen (React)");
const sfxBefore = await evalV(() => window.__LUMI__.gm.save.get().settings.sfx);
await page.mouse.click(360, 320); // toggle sfx
await sleep(800);
const sfxAfter = await evalV(() => window.__LUMI__.gm.save.get().settings.sfx);
check(sfxAfter !== sfxBefore, "sfx toggle works (" + sfxBefore + " -> " + sfxAfter + ")");
await page.mouse.click(360, 320); // restore
await sleep(500);
await page.mouse.click(360, 650); // View Statistics
check(await waitFor(() => screenShown("stats"), 8000), "stats screen (React)");
const statsShown = await evalV(() => {
  const m = window.__LUMI__.gm.analyticsManager.metrics();
  return { sessions: m.sessionCount, events: window.__LUMI__.gm.analyticsManager.recentEvents(3).length };
});
check(statsShown.sessions >= 1 && statsShown.events >= 1, "stats show metrics + recent events");
await page.mouse.click(62, 84); // back to menu
check(await waitFor(() => menuActive(), 8000), "back to menu from stats");

// ---------- 3) Run counters ----------
await page.evaluate(() => localStorage.setItem("lumi_onboarded", "1"));
await page.click('[data-action="play"]'); // PLAY
check(await waitFor(() => evalV(() => (window.__LUMI__.gm.analyticsManager.metrics().runStarts) >= 1), 15000), "run_started counted");
// deterministic death -> give up -> defeat
await evalV(() => { const p = window.__LUMI__.gm.debug.player; if (p) { p.stats.health = 0; if (p.onDeath) p.onDeath(); } });
check(await waitScene("Revive", 8000), "revive prompt");
// Give Up with retry
for (let i = 0; i < 4 && !(await waitFor(() => sceneActive("Defeat"), 4000)); i++) {
  await page.mouse.click(360, 800); // Give Up
  await sleep(1200);
}
await sleep(1500);
const countersAfterRun = await evalV(() => {
  const c = window.__LUMI__.gm.analyticsManager.getStore().counters;
  return { died: c["player_died"] ?? 0, runs: c["run_started"] ?? 0 };
});
check(countersAfterRun.died >= 1 && countersAfterRun.runs >= 1, "player_died + run_started counted");
check(await waitScene("Defeat", 10000), "defeat scene");
for (let i = 0; i < 4 && !(await menuActive()); i++) {
  await page.mouse.click(360, 1088); // Main Menu (defeat layout)
  await sleep(1200);
}
check(await menuActive(), "menu after defeat");

// ---------- 4) Bonus chest in shop ----------
await page.click('[data-action="shop"]'); // Shop nav
check(await waitFor(() => screenShown("shop"), 8000), "shop screen (React)");
const coinsBefore = await evalV(() => window.__LUMI__.gm.economy.coins);
const adsBefore = await evalV(() => window.__LUMI__.gm.analyticsManager.metrics().adsWatched);
await page.mouse.click(520, 794); // bonus chest WATCH AD
await sleep(4000);
const coinsAfter = await evalV(() => window.__LUMI__.gm.economy.coins);
const adsAfter = await evalV(() => window.__LUMI__.gm.analyticsManager.metrics().adsWatched);
check(adsAfter === adsBefore + 1, "bonus chest ad requested (ads=" + adsAfter + ")");
check(coinsAfter > coinsBefore, "bonus chest granted coins (+" + (coinsAfter - coinsBefore) + ")");

// ---------- 5) Content: 9 missions + MYTHIC creature ----------
const content = await evalV(() => ({
  missions: window.__LUMI__.gm.missions.getDefinitions().length,
  stag: !!window.__LUMI__.gm.creatures.getDef("celestialStag"),
  sprite: !!window.__LUMI__.gm.creatures.getDef("forestSprite"),
}));
check(content.missions === 13, "13 missions defined (got " + content.missions + ")");
check(content.stag && content.sprite, "MYTHIC + new creatures defined");
await page.mouse.click(62, 84); // back
check(await waitFor(() => menuActive(), 8000), "menu");
await page.click('[data-action="missions"]'); // Missions nav
check(await waitFor(() => screenShown("missions"), 8000), "missions grid screen (React)");

// ---------- 6) Persistence across reload ----------
const persist = await evalV(() => {
  const am = window.__LUMI__.gm.analyticsManager;
  return { sessions: am.getStore().sessions.length, runs: am.metrics().runStarts, ads: am.metrics().adsWatched };
});
await page.reload({ waitUntil: "load" });
await sleep(3000);
const persist2 = await evalV(() => {
  const am = window.__LUMI__.gm.analyticsManager;
  return { sessions: am.getStore().sessions.length, runs: am.metrics().runStarts, ads: am.metrics().adsWatched };
});
check(persist2.runs >= persist.runs && persist2.ads >= persist.ads, "analytics counters persisted");
check(persist2.sessions >= persist.sessions + 1, "new session on reload (sessions " + persist.sessions + " -> " + persist2.sessions + ")");

mark("--- errors (" + errors.length + ") ---");
for (const e of errors.slice(0, 10)) mark("ERR: " + e.slice(0, 250));
await browser.close();
check(fails === 0 && errors.length === 0, "no failures / no errors");
mark("RESULT: " + (fails === 0 && errors.length === 0 ? "PASS" : "FAIL"));
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);