import puppeteer from "puppeteer-core";
import zlib from "node:zlib";

const URL = "http://localhost:5173/";
const logs = [];
const errors = [];
const screenshotDir = "/tmp";

function mark(label) {
  console.log("SMOKE> " + label);
}

// Minimal PNG decoder to analyze rendered pixels.
function decodePNG(buf) {
  let pos = 8;
  let width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        v = (v + pr) & 255;
      }
      cur[i] = v;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { width, height, bpp, data: out };
}

function colorStats(img) {
  const counts = new Map();
  const step = img.bpp;
  const every = 200;
  for (let i = 0; i < img.data.length; i += step * every) {
    const key = img.data[i] + "," + img.data[i + 1] + "," + img.data[i + 2];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  return { distinct: counts.size, top: top.map(([k, v]) => k + " x" + v) };
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--window-size=720,1280"],
  defaultViewport: { width: 720, height: 1280 },
});

const page = await browser.newPage();
page.on("console", (msg) => {
  logs.push(msg.type() + ": " + msg.text());
  if (msg.type() === "error") {
    errors.push(msg.text());
  }
});
page.on("pageerror", (err) => {
  errors.push("PAGEERROR: " + err.message);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hasLog = (needle) => logs.some((l) => l.includes(needle));
const cnt = (needle) => logs.filter((l) => l.includes(needle)).length;

async function drainAndWait(condition, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cnt("ability_selected") < cnt("level_up")) {
      await sleep(1400);
      await page.mouse.click(360, 793);
      await sleep(600);
    }
    if (await condition()) {
      return true;
    }
    await sleep(1000);
  }
  return Boolean(await condition());
}

const sceneActive = (key) => page.evaluate((k) => {
  try {
    return window.__LUMI__.game.scene.isActive(k);
  } catch {
    return false;
  }
}, key);

async function screenRenderingCheck(tag) {
  const shot1 = await page.screenshot({ encoding: "binary" });
  await sleep(1600);
  const shot2 = await page.screenshot({ encoding: "binary" });
  const animates = !shot1.equals(shot2);
  const stats = colorStats(decodePNG(shot1));
  mark(tag + " -> colors: " + stats.distinct + " distinct, top: " + stats.top.join(" | ") + ", animates: " + animates);
  return animates && stats.distinct > 3;
}

mark("navigating");
await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await sleep(4000);
const menuOk = await page.evaluate(() => {
  const shell = document.querySelector("#react-shell");
  const play = document.querySelector('#react-shell [data-action="play"]');
  return !!(shell && play && shell.textContent.includes("EMBERWILD"));
});
mark("react menu visible: " + menuOk);

const canvas = await page.$("canvas");
if (!canvas) {
  mark("FAIL: no canvas");
  await browser.close();
  process.exit(1);
}

mark("clicking PLAY");
await page.click('[data-action="play"]');
mark("run_started: " + (await drainAndWait(() => hasLog("run_started"), 15000)));
const inGameRender = await screenRenderingCheck("gameplay render");

mark("level_up: " + (await drainAndWait(() => cnt("level_up") >= 1, 30000)));
mark("ability_selected: " + (await drainAndWait(() => cnt("ability_selected") >= 1, 30000)));

mark("fast-forwarding to boss");
await page.evaluate(() => {
  const g = window.__LUMI__.gm;
  if (g.run) g.run.time = 299;
});
mark("boss_started: " + (await drainAndWait(() => hasLog("boss_started"), 25000)));

let killed = false;
for (let i = 0; i < 20 && !killed; i++) {
  killed = await page.evaluate(() => {
    const g = window.__LUMI__.gm.debug.golem;
    if (g && g.health > 0) {
      g.takeDamage(999999);
      return true;
    }
    return false;
  });
  if (!killed) {
    await drainAndWait(() => cnt("level_up") <= cnt("ability_selected"), 4000);
    await sleep(800);
  }
}
mark("killed=" + killed);
mark("boss_defeated: " + (await drainAndWait(() => hasLog("boss_defeated"), 15000)));
mark("run_completed: " + (await drainAndWait(() => hasLog("run_completed"), 15000)));
mark("victory scene: " + (await drainAndWait(() => sceneActive("Victory"), 15000)));
const victoryRender = await screenRenderingCheck("victory render");

mark("--- errors (" + errors.length + ") ---");
for (const e of errors.slice(0, 10)) {
  mark("ERR: " + e.slice(0, 250));
}

const victoryScene = await sceneActive("Victory");
const pass =
  errors.length === 0 &&
  menuOk &&
  inGameRender &&
  victoryRender &&
  hasLog("run_started") &&
  killed &&
  hasLog("boss_defeated") &&
  hasLog("run_completed") &&
  victoryScene;
await browser.close();
if (!pass) {
  mark("RESULT: FAIL");
  process.exit(1);
}
mark("RESULT: PASS");
process.exit(0);