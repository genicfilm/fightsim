// Bundles fightsim/index.html + data.json + fonts into one self-contained
// FightSim.html that opens by double-clicking — no server, no localhost, no
// WSL port forwarding. Fonts are inlined too, because Chrome blocks @font-face
// over file:// even when the .ttf sits right next to the page.
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "fightsim");
const out = path.join(dir, "FightSim.html");

let html = readFileSync(path.join(dir, "index.html"), "utf8");
const data = readFileSync(path.join(dir, "data.json"), "utf8");

// 1. inline the fonts as data URIs
const fonts = [
  "Anton-Regular.ttf",
  "BarlowCondensed-Bold.ttf",
  "BarlowCondensed-SemiBold.ttf",
  "BarlowCondensed-Medium.ttf",
];
for (const f of fonts) {
  const b64 = readFileSync(path.join(dir, "fonts", f)).toString("base64");
  html = html.replaceAll(
    `url(fonts/${f}) format('truetype')`,
    `url(data:font/ttf;base64,${b64}) format('truetype')`
  );
}

// 2. inline the model + fighters. </script> inside JSON would close the tag
//    early, so escape the only sequence that can do that.
const safe = data.replace(/<\/script/gi, "<\\/script");
html = html.replace(
  "<script>\nlet M=null",
  `<script id="fjdata" type="application/json">${safe}</script>\n<script>\nlet M=null`
);

if (!html.includes('id="fjdata"')) {
  console.error("Injection point not found — did index.html's <script> tag change?");
  process.exit(1);
}

writeFileSync(out, html);
const kb = (statSync(out).size / 1024).toFixed(0);
console.log(`FightSim.html  ${kb} KB  ->  ${out}`);
console.log(`Windows: C:\\Users\\ryank\\Documents\\UFC REF\\fightsim\\FightSim.html`);

// 3. cache-bust the hosted copy.
//    GitHub Pages serves `cache-control: max-age=600`, and a 2.8 MB HTML file
//    the browser already has is exactly the thing it will not re-fetch. A
//    shipped change looked identical on the live URL for that reason alone.
//    The landing page is 1.6 KB and revalidates for free, so it carries a
//    content hash and the app's URL changes whenever the app does. Anyone
//    deep-linking straight to FightSim.html still has to hard-refresh — which
//    is why the card prints the short URL, not that one.
const stamp = createHash("sha256").update(html).digest("hex").slice(0, 10);
const landing = path.join(root, "index.html");
const before = readFileSync(landing, "utf8");
const after = before
  .replace(/url=fightsim\/FightSim\.html(?:\?v=[a-f0-9]+)?/, `url=fightsim/FightSim.html?v=${stamp}`)
  .replace(/href="fightsim\/FightSim\.html(?:\?v=[a-f0-9]+)?"/, `href="fightsim/FightSim.html?v=${stamp}"`);
if (after !== before) {
  writeFileSync(landing, after);
  console.log(`index.html    cache stamp -> ?v=${stamp}`);
} else if (!before.includes(`?v=${stamp}`)) {
  console.error("index.html has no redirect to stamp — the landing page changed shape");
  process.exit(1);
}
