import puppeteer from "puppeteer-core";
const URL = "http://localhost:5173/";
const errors = [];
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--window-size=720,1280"],
  defaultViewport: { width: 720, height: 1280 },
});
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sceneActive = (k) => page.evaluate((kk) => { try { return window.__LUMI__.game.scene.isActive(kk); } catch { return false; } }, k);
const menuActive = () => page.evaluate(() => !!document.querySelector('#react-shell [data-action="play"]'));
async function waitFor(fn, ms) { const s = Date.now(); let v = await fn(); while (Date.now() - s < ms && !v) { await sleep(800); v = await fn(); } return v; }

await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(4000);
let fails = 0;
// visit each meta scene TWICE
for (const [action, scene] of [["sanctuary", "Sanctuary"], ["missions", "Missions"], ["shop", "Shop"], ["creatures", "Creatures"], ["daily", "DailyRewards"], ["settings", "Settings"]]) {
  for (let v = 1; v <= 2; v++) {
    await page.click('[data-action="' + action + '"]');
    const ok = await waitFor(() => sceneActive(scene), 8000);
    if (!ok) { console.log("FAIL visit " + v + " " + scene + " not active"); fails++; }
    // back to menu via the scene's back button (top-left)
    for (let i = 0; i < 4 && !(await menuActive()); i++) { await page.mouse.click(62, 84); await sleep(1200); }
    if (!(await menuActive())) { console.log("FAIL back from " + scene); fails++; }
  }
  console.log((errors.length === 0 ? "PASS " : "FAIL ") + "re-entry x2 " + scene + " (errors so far: " + errors.length + ")");
}
console.log("errors:", errors.length, errors.slice(0, 5));
await browser.close();
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
