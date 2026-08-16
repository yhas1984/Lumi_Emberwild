import puppeteer from "puppeteer-core";
const URL = "http://localhost:5173/";
const fails = [];
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 412, height: 915 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => { if (!String(e.message).includes("AudioContext")) errors.push(e.message); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const screenShown = (name) => page.evaluate((n) => !!document.querySelector('#react-shell [data-screen="' + n + '"]'), name);
const menuActive = () => page.evaluate(() => !!document.querySelector('#react-shell [data-action="play"]'));
async function waitFor(fn, ms) { const s = Date.now(); let v = await fn(); while (Date.now() - s < ms && !v) { await sleep(800); v = await fn(); } return v; }
const backToMenu = async () => {
  for (let i = 0; i < 5 && !(await menuActive()); i++) {
    await page.evaluate(() => { const b = document.querySelector(".back-btn"); if (b) b.click(); });
    await sleep(1200);
  }
  return menuActive();
};
const mark = (l) => console.log("SCROLL> " + l);

await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(4000);

// 1) The stage is FIT-scaled to the phone viewport.
const scaleStr = await page.evaluate(() => {
  const el = document.querySelector(".shell-stage");
  return el ? getComputedStyle(el).transform : "";
});
mark("stage transform: " + scaleStr);
const expected = (Math.min(412 / 720, 915 / 1280)).toFixed(3);
if (!scaleStr.includes(expected)) fails.push("stage scale mismatch (expected ~" + expected + ")");

// 2) Screens with content beyond 1280 design px scroll; bottom content becomes visible.
const checks = [
  ["sanctuary", "sanctuary", '[data-action="upgrade-portal"]', false],
  ["creatures", "creatures", "", true],
  ["missions", "missions", '[data-action="claim-chests_10"]', true],
];
for (const [action, screen, lastSel, mustScroll] of checks) {
  if (!(await menuActive())) await backToMenu();
  await page.click('[data-action="' + action + '"]');
  await waitFor(() => screenShown(screen), 8000);
  const info = await page.evaluate((sel) => {
    const body = document.querySelector(".screen-body");
    if (!body) return null;
    const scrollable = body.scrollHeight > body.clientHeight + 10;
    body.scrollTop = body.scrollHeight;
    const el = sel ? document.querySelector(sel) : null;
    if (sel && !el) return { scrollable, found: false };
    const r = el ? el.getBoundingClientRect() : null;
    return { scrollable, found: true, visible: !el || (r.top >= 0 && r.bottom <= window.innerHeight), top: r ? Math.round(r.top) : 0, bottom: r ? Math.round(r.bottom) : 0, vh: window.innerHeight };
  }, lastSel);
  mark(screen + ": " + JSON.stringify(info));
  if (!info) { fails.push(screen + " no screen-body"); }
  else if (mustScroll && !info.scrollable) fails.push(screen + " should be scrollable");
  else if (info.found && !info.visible) fails.push(screen + " bottom content not visible after scroll (" + info.top + ".." + info.bottom + " vs vh " + info.vh + ")");
  await backToMenu();
}

// 3) All remaining screens open fine on a phone viewport.
for (const action of ["daily", "shop", "settings"]) {
  await page.click('[data-action="' + action + '"]');
  const ok = await waitFor(() => screenShown(action), 8000);
  if (!ok) fails.push(action + " screen not shown on phone viewport");
  await backToMenu();
}

mark("errors: " + errors.length + " " + errors.slice(0, 3).join(" | "));
await browser.close();
if (fails.length > 0) { console.log("SCROLL> FAILS: " + fails.join(" ; ")); process.exit(1); }
console.log("SCROLL> RESULT: PASS");
