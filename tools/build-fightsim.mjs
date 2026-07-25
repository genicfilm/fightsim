// Bundles fightsim/index.html + data.json + fonts into one self-contained
// FightSim.html that opens by double-clicking — no server, no localhost, no
// WSL port forwarding. Fonts are inlined too, because Chrome blocks @font-face
// over file:// even when the .ttf sits right next to the page.
import { readFileSync, writeFileSync, statSync } from "node:fs";
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
