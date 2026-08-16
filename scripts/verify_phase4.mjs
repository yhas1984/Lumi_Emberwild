import puppeteer from "puppeteer-core";
import fs from "node:fs";

const URL = "http://localhost:5173/";
const errors = [];
let fails = 0;
function mark(l) { console.log("P4> " + l); }
function check(ok, label) { mark((ok ? "PASS " : "FAIL ") + label); if (!ok) fails++; }

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--window-size=720,1280"],
  defaultViewport: { width: 720, height: 1280 },
});
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sceneActive = (key) => page.evaluate((k) => { try { return window.__LUMI__.game.scene.isActive(k); } catch { return false; } }, key);
const evalV = (fn) => page.evaluate(fn);
const menuActive = () => page.evaluate(() => !!document.querySelector('#react-shell [data-action="play"]'));
async function waitFor(fn, ms) { const s = Date.now(); let v = await fn(); while (Date.now() - s < ms && !v) { await sleep(800); v = await fn(); } return v; }
async function waitForWithDrain(fn, ms) {
  const s = Date.now();
  let v = await fn();
  while (Date.now() - s < ms && !v) {
    if (await evalV(() => { try { return window.__LUMI__.game.scene.isActive("LevelUp"); } catch { return false; } })) {
      await page.mouse.click(360, 793);
      await sleep(700);
    }
    await sleep(1000);
    v = await fn();
  }
  return v;
}
const clickByText = (selector, text) => page.evaluate((sel, txt) => {
  const el = Array.from(document.querySelectorAll(sel)).find((b) => b.textContent.includes(txt));
  if (el) el.click();
  return !!el;
}, selector, text);

// ---------- 1) React menu shell ----------
await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(4000);
check(await menuActive(), "React main menu visible");
const menuInfo = await evalV(() => {
  const shell = document.querySelector("#react-shell");
  return { hasTitle: shell.textContent.includes("EMBERWILD"), hasPlay: !!shell.querySelector('[data-action="play"]'), navCount: shell.querySelectorAll(".nav-btn").length, gear: !!shell.querySelector('[data-action="settings"]') };
});
check(menuInfo.hasTitle && menuInfo.hasPlay && menuInfo.navCount === 5 && menuInfo.gear, "menu content (title, PLAY, 5 nav, gear)");

// ---------- 2) Menu navigation via DOM ----------
async function backToMenu() {
  for (let i = 0; i < 5 && !(await menuActive()); i++) {
    await page.mouse.click(62, 84);
    await sleep(1500);
  }
  return menuActive();
}
for (const [action, scene] of [["sanctuary", "Sanctuary"], ["creatures", "Creatures"], ["missions", "Missions"], ["daily", "DailyRewards"], ["shop", "Shop"], ["settings", "Settings"]]) {
  await page.click('[data-action="' + action + '"]');
  check(await waitFor(() => sceneActive(scene), 8000), "nav " + action + " -> " + scene);
  check(await backToMenu(), "back to React menu from " + scene);
}

// ---------- 3) F2 debug panel in the menu (React) ----------
check(await menuActive(), "menu active before F2 test");
await page.keyboard.press("F2");
await sleep(1200);
const reactDebugOpen = await page.evaluate(() => !!document.querySelector(".debug-overlay"));
check(reactDebugOpen, "F2 opens React debug panel in menu");
const coinsBeforeDbg = await evalV(() => window.__LUMI__.gm.economy.coins);
await clickByText(".debug-btn", "+1000 Coins");
await sleep(1000);
const coinsAfterDbg = await evalV(() => window.__LUMI__.gm.economy.coins);
check(coinsAfterDbg === coinsBeforeDbg + 1000, "React debug +1000 coins works");
const chipText = await page.evaluate(() => {
  const el = document.querySelectorAll(".chip-value")[0];
  return el ? el.textContent : "";
});
check(chipText === String(coinsAfterDbg), "menu coins chip updated live (" + chipText + ")");
await page.keyboard.press("F2");
await sleep(1000);
check(!(await page.evaluate(() => !!document.querySelector(".debug-overlay"))), "F2 closes React debug panel");

// ---------- 4) Auth profile ----------
const authInfo = await evalV(() => {
  const u = window.__LUMI__.gm.auth.getUser();
  return { authed: !!u, id: u ? u.playerId : "" };
});
check(authInfo.authed && authInfo.id.startsWith("plr-"), "anonymous auth profile (" + authInfo.id + ")");

// ---------- 5) Run -> leaderboard + cloud save ----------
await page.evaluate(() => localStorage.setItem("lumi_onboarded", "1"));
await page.click('[data-action="play"]');
check(await waitFor(() => evalV(() => !!window.__LUMI__.gm.run), 15000), "run started via React PLAY");
// fast-forward boss + kill
await evalV(() => { const g = window.__LUMI__.gm; if (g.run) { g.run.time = 299; g.run.pendingEggs = 0; } });
check(await waitFor(() => evalV(() => window.__LUMI__.gm.analytics.getBuffer().some((e) => e.event === "boss_started")), 25000), "boss started");
let killed = false;
for (let i = 0; i < 20 && !killed; i++) {
  killed = await evalV(() => {
    const g = window.__LUMI__.gm.debug.golem;
    if (g && g.health > 0) { g.takeDamage(999999); return true; }
    return false;
  });
  if (!killed) {
    // Drain open level-up screens (they freeze the golem spawn).
    if (await evalV(() => { try { return window.__LUMI__.game.scene.isActive("LevelUp"); } catch { return false; } })) {
      await page.mouse.click(360, 793);
      await sleep(600);
    }
    await sleep(1200);
  }
}
check(killed, "boss killed");
check(await waitForWithDrain(() => evalV(() => window.__LUMI__.gm.analytics.getBuffer().some((e) => e.event === "run_completed")), 30000), "run completed");
const lb = await evalV(() => window.__LUMI__.gm.leaderboard.getTop(5).then((e) => e.length));
check(lb >= 1, "leaderboard entry submitted (" + lb + ")");
const cloud = await evalV(() => {
  const raw = localStorage.getItem("lumi_cloud_save");
  return !!raw && JSON.parse(raw).data !== undefined;
});
check(cloud, "cloud save mirror written");

// victory -> main menu (React)
check(await waitFor(() => sceneActive("Victory"), 15000), "victory scene");
// Victory layout with eggs=0: Main Menu button at y=1066
for (let i = 0; i < 5 && !(await menuActive()); i++) {
  await page.mouse.click(360, 1066);
  await sleep(1500);
}
check(await menuActive(), "victory -> React menu");

// ---------- 6) Cloud restore (first-device simulation) ----------
const stateBefore = await evalV(() => ({ coins: window.__LUMI__.gm.economy.coins, creatures: window.__LUMI__.gm.creatures.count() }));
await evalV(() => localStorage.removeItem("lumi_wild_realms_save"));
await page.reload({ waitUntil: "load" });
await sleep(3500);
const stateAfter = await evalV(() => ({ coins: window.__LUMI__.gm.economy.coins, creatures: window.__LUMI__.gm.creatures.count() }));
check(stateAfter.coins === stateBefore.coins && stateAfter.creatures === stateBefore.creatures, "cloud save restored after clearing local (coins " + stateBefore.coins + " -> " + stateAfter.coins + ")");

// ---------- 7) Capacitor platform ----------
check(fs.existsSync("android/app/src/main/AndroidManifest.xml"), "android platform folder present");
const native = await evalV(() => (typeof window !== "undefined" && "Capacitor" in window));
check(native === false, "web build reports non-native platform");

mark("--- errors (" + errors.length + ") ---");
for (const e of errors.slice(0, 10)) mark("ERR: " + e.slice(0, 250));
await browser.close();
check(fails === 0 && errors.length === 0, "no failures / no errors");
mark("RESULT: " + (fails === 0 && errors.length === 0 ? "PASS" : "FAIL"));
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);