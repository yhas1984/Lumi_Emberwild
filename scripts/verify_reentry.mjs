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
page.on("pageerror", (e) => { if (!String(e.message).includes("AudioContext")) errors.push(e.message); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const screenShown = (name) => page.evaluate((n) => !!document.querySelector('#react-shell [data-screen="' + n + '"]'), name);
const menuActive = () => page.evaluate(() => !!document.querySelector('#react-shell [data-action="play"]'));
async function waitFor(fn, ms) { const s = Date.now(); let v = await fn(); while (Date.now() - s < ms && !v) { await sleep(800); v = await fn(); } return v; }

await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(4000);
let fails = 0;
// visit each React meta screen TWICE (regression: no state accumulation on re-entry)
for (const [action, screen] of [["sanctuary", "sanctuary"], ["missions", "missions"], ["shop", "shop"], ["creatures", "creatures"], ["daily", "daily"], ["settings", "settings"], ["settings", "stats"]]) {
  for (let v = 1; v <= 2; v++) {
    // stats is reached through settings; others via the main menu nav
    if (screen === "stats") {
      if (!(await menuActive())) { for (let i = 0; i < 4 && !(await menuActive()); i++) { await page.mouse.click(62, 84); await sleep(1200); } }
      await page.click('[data-action="settings"]');
      await waitFor(() => screenShown("settings"), 8000);
      await page.mouse.click(360, 650); // View Statistics
    } else {
      if (!(await menuActive())) { for (let i = 0; i < 4 && !(await menuActive()); i++) { await page.mouse.click(62, 84); await sleep(1200); } }
      await page.click('[data-action="' + action + '"]');
    }
    const ok = await waitFor(() => screenShown(screen), 8000);
    if (!ok) { console.log("FAIL visit " + v + " " + screen + " not shown"); fails++; }
    for (let i = 0; i < 4 && !(await menuActive()); i++) { await page.mouse.click(62, 84); await sleep(1200); }
    if (!(await menuActive())) { console.log("FAIL back from " + screen); fails++; }
  }
  console.log((errors.length === 0 ? "PASS " : "FAIL ") + "re-entry x2 " + screen + " (errors so far: " + errors.length + ")");
}
console.log("errors:", errors.length, errors.slice(0, 5));
await browser.close();
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
