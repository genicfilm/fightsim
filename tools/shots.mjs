// FIGHT SIM visual regression. Captures the canonical screens and diffs them
// against committed baselines.
//
//   npm run shots            check against tools/baseline/
//   npm run shots:update     accept what is on screen now as the new baseline
//
// This exists because `npm test` cannot see layout. In stage 1 a new `.hero`
// rule collapsed the tape's ELO row to a 10px sliver and the suite stayed
// green — it asserts the row EXISTS, not that it has height. One image diff
// would have caught it immediately.
//
// Three things make it reproducible:
//
//  1. Math.random is replaced with a seeded PRNG — installed from HERE, via
//     addInitScript, so the product keeps its real randomness. Without it the
//     1,000 rollouts differ every run and every screen is a false positive.
//  2. Nothing is captured mid-animation. Only settled states.
//  3. Nothing uses fullPage. The cage is position:fixed, and fullPage bakes it
//     into the middle of the page — it faked a strikethrough on the mobile
//     stance row and sent a whole investigation the wrong way. Tall viewports
//     instead, so fixed chrome lands where it really lands.
import { chromium } from "playwright-core";
import { findChromium } from "./chromium-path.mjs";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = path.join(root, "fightsim", "FightSim.html");
const baseDir = path.join(root, "tools", "baseline");
const outDir = path.join(root, "tools", ".shots-out");

if (!existsSync(built)) {
  console.error("FightSim.html not found — run `npm run build:fightsim` first.");
  process.exit(1);
}
const FILE = pathToFileURL(built).href;
const UPDATE = process.argv.includes("--update") || process.argv.includes("-u");

// Tolerance. Text anti-aliasing differs slightly between machines and driver
// versions, so an exact compare would cry wolf on every clean checkout. A pixel
// counts as changed only if a channel moves by more than CHANNEL; the screen
// fails if more than RATIO of its pixels changed. Layout shifts blow through
// this instantly; AA noise does not.
const CHANNEL = 14;
const RATIO = 0.0015;

const seedRandom = `(() => {
  let s = 0x9e3779b9;                       // mulberry32, fixed seed
  Math.random = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

const boot = async (p) => {
  await p.goto(FILE, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => document.getElementById("nf").textContent !== "—", { timeout: 20000 });
};
// Wait on the animations themselves rather than on a guessed number. The first
// attempt used a 450ms sleep; the fingerprint grow and the VS pulse are both
// 460ms and start AFTER the 160ms blur handler, so the hex and the diamond were
// still moving when the shutter fired and m-tape flickered by 0.234% a run.
const stilled = async (p) => {
  await p.evaluate(() => Promise.all(
    document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await p.waitForTimeout(80);
};
const enter = async (p) => { await p.click("#ienter"); await p.waitForTimeout(150); };
// fill both corners and dismiss the autocomplete, which otherwise hangs open
// over the tape and makes the shot depend on where the mouse happened to be
const pick = async (p, a, b) => {
  await p.fill("#ia", a);
  await p.fill("#ib", b);
  await p.keyboard.press("Escape");
  await p.click(".mark");
  await p.waitForTimeout(220);              // past the 160ms blur handler
  await stilled(p);
};
const run = async (p) => {
  await p.click("#go");
  await p.waitForSelector("#verdict.on", { timeout: 40000 });
  await p.waitForTimeout(1500);             // contract + scroll settle
  await p.evaluate(() => window.scrollTo(0, 0));
  await stilled(p);
};

const SCREENS = [
  { name: "method",    w: 1440, h: 900,  go: async () => {} },
  { name: "cold",      w: 1440, h: 900,  go: async (p) => { await enter(p); } },
  { name: "one-corner",w: 1440, h: 1150, go: async (p) => { await enter(p); await pick(p, "Jon Jones", ""); } },
  { name: "tape",      w: 1440, h: 1250, go: async (p) => { await enter(p); await pick(p, "Jon Jones", "Tom Aspinall"); } },
  { name: "verdict",   w: 1440, h: 1750, go: async (p) => { await enter(p); await pick(p, "Israel Adesanya", "Alex Pereira"); await run(p); } },
  { name: "m-cold",    w: 390,  h: 844,  go: async (p) => { await enter(p); } },
  { name: "m-tape",    w: 390,  h: 1400, go: async (p) => { await enter(p); await pick(p, "Israel Adesanya", "Alex Pereira"); } },
  { name: "m-verdict", w: 390,  h: 1900, go: async (p) => { await enter(p); await pick(p, "Israel Adesanya", "Alex Pereira"); await run(p); } },
];

// Diff in the browser: it already has a PNG decoder and a canvas, so this needs
// no image library and the repo keeps its single devDependency.
async function compare(page, aBuf, bBuf) {
  const uri = (b) => "data:image/png;base64," + b.toString("base64");
  return page.evaluate(async ([a, b, channel]) => {
    const load = (src) => new Promise((ok, no) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("decode")); i.src = src;
    });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height)
      return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
    const px = (img) => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      return x.getImageData(0, 0, img.width, img.height);
    };
    const A = px(ia), B = px(ib);
    const out = document.createElement("canvas");
    out.width = ia.width; out.height = ia.height;
    const ox = out.getContext("2d");
    const D = ox.createImageData(ia.width, ia.height);
    let changed = 0;
    for (let i = 0; i < A.data.length; i += 4) {
      const d = Math.max(
        Math.abs(A.data[i] - B.data[i]),
        Math.abs(A.data[i + 1] - B.data[i + 1]),
        Math.abs(A.data[i + 2] - B.data[i + 2]));
      if (d > channel) {
        changed++;
        D.data[i] = 255; D.data[i + 1] = 0; D.data[i + 2] = 90; D.data[i + 3] = 255;
      } else {
        // the baseline, dimmed, so the red marks have context
        const g = (A.data[i] * 0.3 + A.data[i + 1] * 0.59 + A.data[i + 2] * 0.11) * 0.42;
        D.data[i] = D.data[i + 1] = D.data[i + 2] = g; D.data[i + 3] = 255;
      }
    }
    ox.putImageData(D, 0, 0);
    return { changed, total: ia.width * ia.height, diff: out.toDataURL("image/png") };
  }, [uri(aBuf), uri(bBuf), CHANNEL]);
}

mkdirSync(baseDir, { recursive: true });
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: findChromium() });
const differ = await browser.newPage();
const fails = [];
let ok = 0, wrote = 0;

for (const s of SCREENS) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
  await page.addInitScript(seedRandom);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await boot(page);
  await s.go(page);
  const shot = await page.screenshot();                 // viewport only, never fullPage
  await page.close();
  if (errs.length) { fails.push(`${s.name} — page error: ${errs[0]}`); continue; }

  const basePath = path.join(baseDir, `${s.name}.png`);
  const isNew = !existsSync(basePath);
  if (UPDATE || isNew) {
    writeFileSync(basePath, shot);
    console.log(`  ${isNew ? "new  " : "wrote"} ${s.name}`);
    wrote++;
    continue;
  }
  const res = await compare(differ, readFileSync(basePath), shot);
  if (res.size) {
    fails.push(`${s.name} — viewport size changed: ${res.size}`);
    writeFileSync(path.join(outDir, `${s.name}.actual.png`), shot);
    console.log(`  FAIL ${s.name} — size ${res.size}`);
    continue;
  }
  const pct = res.changed / res.total;
  if (pct > RATIO) {
    writeFileSync(path.join(outDir, `${s.name}.actual.png`), shot);
    writeFileSync(path.join(outDir, `${s.name}.diff.png`),
      Buffer.from(res.diff.split(",")[1], "base64"));
    fails.push(`${s.name} — ${(pct * 100).toFixed(3)}% of pixels changed (${res.changed.toLocaleString()})`);
    console.log(`  FAIL ${s.name}  ${(pct * 100).toFixed(3)}% changed`);
  } else {
    ok++;
    console.log(`  ok   ${s.name}  ${(pct * 100).toFixed(3)}%`);
  }
}

await browser.close();

if (wrote) {
  console.log(`\n${wrote} baseline${wrote > 1 ? "s" : ""} written to tools/baseline/. Look at them before committing.`);
  process.exit(0);
}
console.log(`\n${ok} matched, ${fails.length} changed`);
if (fails.length) {
  fails.forEach((f) => console.log("  ✗ " + f));
  console.log(`\nDiff images: tools/.shots-out/  (red = changed)`);
  console.log(`If the change was intended: npm run shots:update`);
  process.exit(1);
}
