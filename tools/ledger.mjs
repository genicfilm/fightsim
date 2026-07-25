/* Grade the public ledger and regenerate ledger/README.md.
 *
 *   node tools/ledger.mjs
 *
 * The ledger is the half of this project that a backtest cannot fake. Every
 * competitor in this category publishes a number; the number is always measured
 * on data the author already had. A receipt is committed BEFORE the card, so
 * the commit timestamp is the proof, and grading is mechanical afterwards.
 *
 * Workflow, once per event:
 *   1. EVENT mode in the app -> "Copy the receipt"
 *   2. paste into ledger/ufc-330.json and COMMIT IT BEFORE THE FIGHTS
 *   3. after the card, fill in "winner" on each bout (exact index spelling,
 *      or "NC" for a no-contest/draw, which is excluded from scoring)
 *   4. node tools/ledger.mjs && commit
 *
 * A bout the model REFUSED is still graded, in its own column. That is
 * deliberate: refusing is only honest if the refusals are shown to have been
 * coin flips. If they quietly outperform, the threshold is wrong and this
 * table is how anyone — including you — finds that out.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIR = path.join(ROOT, "ledger");
if (!existsSync(DIR)) mkdirSync(DIR);

const files = readdirSync(DIR).filter(f => f.endsWith(".json")).sort();
const events = files.map(f => {
  const j = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  if (!j.event || !Array.isArray(j.bouts)) throw new Error(`${f}: not a receipt`);
  return { file: f, ...j };
});

const pct = (n, d) => (d ? (100 * n / d).toFixed(1) + "%" : "—");
const acc = rows => {
  const g = rows.filter(b => b.winner && b.winner !== "NC");
  const hit = g.filter(b => (b.p_a >= 0.5 ? b.a : b.b) === b.winner).length;
  return { n: g.length, hit, s: pct(hit, g.length) };
};
const brier = rows => {
  const g = rows.filter(b => b.winner && b.winner !== "NC");
  if (!g.length) return "—";
  return (g.reduce((t, b) => t + (b.p_a - (b.winner === b.a ? 1 : 0)) ** 2, 0) / g.length).toFixed(3);
};

const all = events.flatMap(e => e.bouts);
const called = all.filter(b => !b.refused);
const refused = all.filter(b => b.refused);

const L = [];
L.push("# The ledger");
L.push("");
L.push("Every card this model has committed to, in public, before the fights.");
L.push("");
L.push("Each receipt in this folder was written by EVENT mode and **committed before the event**, so");
L.push("`git log` is the timestamp. Nothing here is a backtest. The model declines any fight it prices");
L.push("under 0.58 — across 3,404 held-out fights those realised 52.0%, which is the whole reason the");
L.push("refusals exist. They are graded here anyway, in their own column, because a refusal is only");
L.push("honest if you can check that it really was a coin flip.");
L.push("");

if (!events.length) {
  L.push("## No events yet");
  L.push("");
  L.push("The first receipt goes in before UFC 330. Until then this table is empty on purpose —");
  L.push("an empty ledger is a true statement about a model that has not called anything yet.");
} else {
  const ca = acc(called), ra = acc(refused);
  L.push("## Running record");
  L.push("");
  L.push("| | graded | correct | accuracy | Brier |");
  L.push("|---|---:|---:|---:|---:|");
  L.push(`| **Called** (conf ≥ 0.58) | ${ca.n} | ${ca.hit} | **${ca.s}** | ${brier(called)} |`);
  L.push(`| Refused (conf < 0.58) | ${ra.n} | ${ra.hit} | ${ra.s} | ${brier(refused)} |`);
  L.push(`| All bouts, forced | ${acc(all).n} | ${acc(all).hit} | ${acc(all).s} | ${brier(all)} |`);
  L.push("");
  L.push("Held-out expectation from rolling-origin validation: **67.2%** on called fights,");
  L.push("**52.0%** on refused, **61.2%** forced. A live record below those is the model being");
  L.push("worse than advertised; above them, on samples this small, is luck.");
  L.push("");
  L.push("## By event");
  L.push("");
  L.push("| event | stamped | bouts | refused | called | correct |");
  L.push("|---|---|---:|---:|---:|---:|");
  for (const e of events) {
    const c = e.bouts.filter(b => !b.refused), a = acc(c);
    L.push(`| [${e.event}](${e.file}) | ${(e.stamped || "").slice(0, 10)} | ${e.bouts.length}`
      + ` | ${e.bouts.filter(b => b.refused).length} | ${c.length} | ${a.n ? `${a.hit}/${a.n} · ${a.s}` : "ungraded"} |`);
  }
  L.push("");
  for (const e of events) {
    L.push(`### ${e.event}`);
    L.push("");
    L.push("| bout | model | said | result | |");
    L.push("|---|---|---|---|---|");
    for (const b of e.bouts) {
      const said = b.refused ? "**refused**" : `${b.lean} ${(Math.max(b.p_a, 1 - b.p_a) * 100).toFixed(0)}%`;
      const p = b.p_a >= 0.5 ? b.a : b.b;
      const mark = !b.winner ? "" : b.winner === "NC" ? "NC" : p === b.winner ? "✓" : "✗";
      L.push(`| ${b.a} vs ${b.b} | ${b.p_a.toFixed(3)} | ${said} | ${b.winner || "—"} | ${mark} |`);
    }
    L.push("");
  }
}
L.push("");
L.push("*Regenerate with `node tools/ledger.mjs`. Do not hand-edit this file.*");

writeFileSync(path.join(DIR, "README.md"), L.join("\n") + "\n");
console.log(`  ${events.length} event(s) · ${all.length} bouts · `
  + `${called.length} called, ${refused.length} refused`);
console.log(`  wrote ledger/README.md`);
