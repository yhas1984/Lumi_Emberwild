import puppeteer from "puppeteer-core";
const URL = "http://localhost:5173/";
const errors = [];
function mark(label) { console.log("VER> " + label); }
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--window-size=720,1280"],
  defaultViewport: { width: 720, height: 1280 },
});
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function active(k) {
  return page.evaluate((kk) => { try { return window.__LUMI__.game.scene.isActive(kk); } catch { return false; } }, k);
}

await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(2500);
await page.mouse.click(100, 1000); // Sanctuary nav
for (let i = 0; i < 10 && !(await active("Sanctuary")); i++) await sleep(1000);
await sleep(600);
await page.evaluate(() => { window.__LUMI__.gm.economy.addCoins(5000); });
await sleep(600);
await page.mouse.click(592, 682);
await sleep(1200);
const lvl = await page.evaluate(() => window.__LUMI__.gm.save.get().sanctuary.treeOfLife);
const coins = await page.evaluate(() => window.__LUMI__.gm.economy.coins);
mark("upgrade: treeOfLife=" + lvl + " coins=" + coins + " (ok=" + (lvl === 1) + ")");
await page.screenshot({ path: "/tmp/lumi_sanctuary.png" });

// persistence check
await page.reload({ waitUntil: "load" });
await sleep(3000);
const lvl2 = await page.evaluate(() => window.__LUMI__.gm.save.get().sanctuary.treeOfLife);
const coins2 = await page.evaluate(() => window.__LUMI__.gm.economy.coins);
mark("after reload: treeOfLife=" + lvl2 + " coins=" + coins2 + " (persisted=" + (lvl2 === 1 && coins2 === coins) + ")");

mark("errors: " + errors.length);
await browser.close();
process.exit(errors.length > 0 || lvl !== 1 || lvl2 !== 1 ? 1 : 0);
