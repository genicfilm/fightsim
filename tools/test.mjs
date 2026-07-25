// FIGHT SIM regression suite. Drives the BUILT file over file:// with Playwright.
//
//   npm run build:fightsim && npm test
//
// Exits non-zero on the first failed assertion, so it is safe to gate a change
// on. There is no http server anywhere in here on purpose: under WSL2 Windows
// will not reliably forward localhost, and the product has to work from disk.
import { chromium } from "playwright-core";
import { findChromium } from "./chromium-path.mjs";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = path.join(root, "fightsim", "FightSim.html");
if (!existsSync(built)) {
  console.error("FightSim.html not found — run `npm run build:fightsim` first.");
  process.exit(1);
}
const FILE = pathToFileURL(built).href;

let pass = 0;
const fails = [];
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(name + (detail ? ` — ${detail}` : "")); console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// Every id the script reads. A UI rewrite may restyle or re-nest any of these,
// but removing or renaming one silently breaks the page — so they are asserted.
const CONTRACT = [
  "intro", "ienter", "method", "nf", "nfeat", "fpc",
  "ia", "ib", "aca", "acb", "sa", "sb", "va", "vb", "go", "warn",
  "tape", "pna", "pva", "pda", "pnb", "pvb", "pdb", "cw", "rows", "hex",
  "stage", "na", "nb", "wgap", "pstep", "plabel", "pnum", "prail", "beam",
  "ca", "cb", "split", "status", "ret", "stream",
  "verdict", "stamp", "vmaj", "vmajs", "vmeth", "vmeths", "vconf", "vconfs",
  "attr", "attrsub", "attrcx", "attrows", "attrl", "attrr",
  "read", "rmeta", "prec", "prechead", "preccap", "precfig", "precex", "trk", "trka", "trkb",
  "dissent", "dhead", "dtext", "dquote", "dent", "save", "copy", "again", "saved", "refuse",
  "event", "evpanel", "ename", "ecard", "ewarn", "erun", "eout", "esave", "ejson", "eclose", "esaved",
];

const errors = [];
const browser = await chromium.launch({ executablePath: findChromium() });
const watch = (p, tag) => {
  p.on("console", (m) => { if (m.type() === "error") errors.push(`${tag} console: ${m.text()}`); });
  p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
};
const boot = async (p) => {
  await p.goto(FILE, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => document.getElementById("nf").textContent !== "—", { timeout: 20000 });
};

/* ---------- 1. contract, method screen, tape ---------- */
console.log("\nDOM contract & entry");
const page = await browser.newPage({ viewport: { width: 1180, height: 950 } });
watch(page, "desktop");
await boot(page);

const missing = await page.evaluate((ids) => ids.filter((i) => !document.getElementById(i)), CONTRACT);
ok(`all ${CONTRACT.length} contract ids present`, missing.length === 0, missing.join(", "));
// The masthead used to state 32 — M.feats.length, hardcoded — which excluded
// elo and listed weight and so undercounted by leaving out the model's biggest
// single term. The number on screen must be the number the model actually sums.
const counts = await page.evaluate(() => ({
  shown: +document.getElementById("nfeat").textContent,
  cols: M.cols.length, coef: M.coef.length,
}));
ok("the stated feature count is the model's own column count",
   counts.shown === counts.cols && counts.cols === counts.coef,
   `shown ${counts.shown} · cols ${counts.cols} · coef ${counts.coef}`);

ok("method screen up on a cold profile", await page.$eval("#intro", (e) => e.classList.contains("on")));
ok("method screen is opaque", await page.$eval("#intro", (e) => getComputedStyle(e).opacity === "1"));
await page.click("#ienter");
ok("ENTER dismisses and focuses the first corner",
   !(await page.$eval("#intro", (e) => e.classList.contains("on"))) &&
   (await page.evaluate(() => document.activeElement.id)) === "ia");
await page.click("#method");
ok("METHOD reopens it", await page.$eval("#intro", (e) => e.classList.contains("on")));
await page.keyboard.press("Escape");
ok("Escape closes it", !(await page.$eval("#intro", (e) => e.classList.contains("on"))));

console.log("\nTale of the tape");
await page.fill("#ia", "Jon Jones");
await page.waitForTimeout(300);
ok("one fighter opens the tape", await page.$eval("#tape", (e) => e.classList.contains("on")));
ok("empty corner reads as a slot", (await page.$eval("#pnb", (e) => e.textContent)).includes("AWAITING"));
await page.selectOption("#sa", { index: 0 });
const yearBefore = await page.$eval("#sa", (s) => s.value);
await page.fill("#ib", "Tom Aspinall");
await page.waitForTimeout(400);
ok("typing in the other corner does not reset the year picker",
   (await page.$eval("#sa", (s) => s.value)) === yearBefore);
ok("both corners fill the tape", (await page.$$eval("#hex .sh", (n) => n.length)) === 2);
ok("out-of-distribution gap is flagged before the button",
   await page.$eval("#cw", (e) => e.classList.contains("on")));
ok("7 tape rows", (await page.$$eval("#rows .tr", (n) => n.length)) === 7);

/* ---------- 2. the pipeline, at full motion ---------- */
console.log("\nPipeline");
await page.selectOption("#sa", { index: await page.$eval("#sa", (s) => [...s.options].findIndex((o) => o.textContent.includes("PRIME"))) });
await page.waitForTimeout(200);
await page.click("#go");
const seen = new Set();
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(300);
  seen.add(await page.$eval("#pstep", (e) => e.textContent.trim()));
  if (await page.$eval("#verdict", (e) => e.classList.contains("on"))) break;
}
ok("all four phases were announced", ["01 / 04", "02 / 04", "03 / 04", "04 / 04"].every((s) => seen.has(s)),
   [...seen].join(" "));
await page.waitForSelector("#verdict.on", { timeout: 30000 });
await page.waitForTimeout(1000);

const inv = await page.evaluate(() => {
  const D = SIM.D;
  let z = M.intercept + (D.prior || 0);
  for (let i = 0; i < D.T.length; i++) z += D.T[i];
  return {
    zFromTerms: z, z0: D.z0, pFromZ: sigmoid(z), p: D.p,
    hist: SIM.hist.reduce((a, b) => a + b, 0),
    taken: SIM.taken, counted: SIM.counted,
    emp: SIM.aWins / (SIM.aWins + SIM.bWins),
    rail: document.getElementById("prail").style.width,
    rafStopped: SIM.raf === 0,
    conf: +document.getElementById("vconf").textContent,
    stamp: document.getElementById("stamp").textContent,
    attrsub: document.getElementById("attrsub").textContent,
    attrRows: document.querySelectorAll("#attrows .ar").length,
  };
});
ok("Σ of drawn terms equals z₀", near(inv.zFromTerms, inv.z0, 1e-9), `${inv.zFromTerms} vs ${inv.z0}`);
ok("σ(z₀) equals the reported posterior", near(inv.pFromZ, inv.p, 1e-9), `${inv.pFromZ} vs ${inv.p}`);
ok("all 1,000 draws are plotted", inv.hist === 1000 && inv.taken === 1000 && inv.counted === 1000);
ok("empirical p̂ converges on the analytic posterior", near(inv.emp, inv.p, 0.06), `${inv.emp} vs ${inv.p}`);
ok("progress rail completes", inv.rail === "100%");
ok("the animation loop stops when it is done", inv.rafStopped);
ok("posterior cell agrees with the model", near(inv.conf, Math.max(inv.p, 1 - inv.p), 0.0011));
ok("stamp matches its band",
   inv.conf < 0.58 ? inv.stamp === "REFUSED · NO EDGE"
   : inv.conf >= 0.70 ? inv.stamp === "CONVERGED" : inv.stamp === "LOW SEPARATION", inv.stamp);
ok("attribution lists terms and prints Σ", inv.attrRows > 0 && /Σ INCL\. INTERCEPT/.test(inv.attrsub));

// The split bar is the page's copy of the card's clearest picture of the
// distribution. It must agree with the tally, and it must be full at the end —
// a bar that stops short would misreport how much of the sample was drawn.
const split = await page.evaluate(() => {
  const w = (s) => parseFloat(getComputedStyle(document.querySelector("#split " + s)).width);
  const track = document.getElementById("split").getBoundingClientRect().width;
  return { a: w(".sa"), b: w(".sb"), track, aWins: SIM.aWins, bWins: SIM.bWins };
});
ok("split bar fills the track once all 1,000 are drawn",
   near(split.a + split.b + 2, split.track, 1.5), `${split.a}+${split.b}+2 vs ${split.track}`);
ok("split bar is proportioned to the tally, not to itself",
   near(split.a / (split.a + split.b), split.aWins / (split.aWins + split.bWins), 0.01));
ok("the run contracts once it has settled",
   await page.$eval("#stage", (e) => e.classList.contains("settled")));

// The tail is the product's thesis and the shareable object, so it must lead
// with a number that agrees with the tally and must sit ahead of the technical
// panel rather than behind it.
const tail = await page.evaluate(() => {
  const pos = (a, b) => document.getElementById(a).compareDocumentPosition(
    document.getElementById(b)) & Node.DOCUMENT_POSITION_FOLLOWING;
  const minN = Math.min(SIM.aWins, SIM.bWins);
  return { head: document.getElementById("dhead").textContent,
           minN, tailBeforeAttr: !!pos("dissent", "attr"),
           headSize: parseFloat(getComputedStyle(document.getElementById("dhead")).fontSize),
           cellSize: parseFloat(getComputedStyle(document.querySelector(".cell u")).fontSize) };
});
ok("the tail leads with the minority count from the tally",
   tail.head.includes(tail.minN.toLocaleString()), `${tail.head} vs ${tail.minN}`);
ok("the tail sits ahead of the attribution panel", tail.tailBeforeAttr);
ok("the tail headline outranks the supporting cells", tail.headSize > tail.cellSize,
   `${tail.headSize} vs ${tail.cellSize}`);
ok("the declared weight prior is shown as a term, never hidden",
   await page.$eval("#attrows", (e) => e.textContent.includes("CROSS-DIVISION MASS PRIOR")));

/* ---------- THE READ ----------------------------------------------------
   Two things are asserted here and they are different in kind.

   The grouped ledger is an arithmetic claim about the panel: every column has a
   family, no term is hidden any more, and the subtotals are the sums they say
   they are. That last one is the whole reason this panel is trustworthy — it is
   the same Σ the model computed, only sorted.

   The precedent and record panels are a claim about the DATA: they read the
   rolling-origin holdout that data.json now ships, so what is on screen has to
   be that table and no other. If the shipped table ever stops reproducing the
   accuracy the pipeline printed, every number in THE READ is quietly fiction —
   which is the exact failure mode this project exists not to have. */
console.log("\nTHE READ");
const ledger = await page.evaluate(() => {
  const num = (e) => +e.textContent.replace("−", "-");
  const groups = [...document.querySelectorAll("#attrows .ar.g")].map((g) => {
    const box = g.closest("details");
    return {
      name: g.querySelector(".an").textContent,
      sum: num(g.querySelector(".av")),
      members: box ? [...box.querySelectorAll(".ar.t .av")].map(num) : [],
    };
  });
  return {
    orphans: M.cols.filter((k) => groupOf(k) === "OTHER"),
    groups,
    stated: +(document.getElementById("attrsub").textContent.match(/ALL (\d+) NON-ZERO/) || [])[1],
    z: +(document.getElementById("attrsub").textContent.match(/= ([+−][\d.]+) LOG-ODDS/) || [])[1]
         .replace("−", "-"),
    intercept: M.intercept,
    cx: document.getElementById("attrcx").textContent,
  };
});
ok("every model column has a named family", ledger.orphans.length === 0, ledger.orphans.join(", "));
const drawn = ledger.groups.reduce((s, g) => s + (g.members.length || 1), 0);
ok("no term is hidden — every non-zero one is drawn", drawn === ledger.stated,
   `${drawn} drawn vs ${ledger.stated} stated`);
const badSub = ledger.groups.filter((g) => g.members.length &&
  Math.abs(g.members.reduce((s, v) => s + v, 0) - g.sum) > 0.02);
ok("each family's subtotal is the sum of its own terms", badSub.length === 0,
   badSub.map((g) => g.name).join(", "));
// Sub-threshold terms (|c| < 0.005) are not drawn, so this is the sum of what is
// shown against the sum the model reported — close, never exact by construction.
ok("the families sum back to the posterior the model printed",
   near(ledger.groups.reduce((s, g) => s + g.sum, 0), ledger.z - ledger.intercept, 0.06),
   `${ledger.groups.reduce((s, g) => s + g.sum, 0)} vs ${ledger.z - ledger.intercept}`);
// Gross and net are drawn to one scale, so the bar has to BE the ratio it
// prints. A picture that does not match its own caption is worse than the
// caption alone — this is the assertion that keeps it honest.
const cx = await page.evaluate(() => {
  const n = (s) => Math.abs(+document.querySelector(s).textContent.replace(/[±+−]/g, (c) => c === "−" ? "-" : ""));
  return { gross: n(".cxb .cr.g b"), net: n(".cxb .cr.n b"),
           bar: parseFloat(document.querySelector(".cxb .cr.n u i").style.width),
           label: +document.querySelector(".cxb .cx em").textContent.replace("% CANCELS", "") };
});
ok("the net bar is drawn to the same scale as the gross bar",
   near(cx.bar, cx.net / cx.gross * 100, 0.6), `${cx.bar}% vs ${(cx.net / cx.gross * 100).toFixed(1)}%`);
ok("the cancelled share matches the two bars",
   near(cx.label, (1 - cx.net / cx.gross) * 100, 1), `${cx.label}% vs ${((1 - cx.net / cx.gross) * 100).toFixed(1)}%`);

const ho = await page.evaluate(() => {
  let right = 0;
  for (const f of HO.fights) if ((f[3] >= 5000) === (f[4] === 1)) right++;
  const conf = +document.getElementById("vconf").textContent;
  const head = document.getElementById("prechead").textContent;
  const cap = document.getElementById("preccap").textContent;
  const m = head.match(/IT READ ([\d,]+) HELD-OUT FIGHTS? THIS WAY\.\s*THE FAVOURITE WON ([\d,]+) — ([\d.]+)%\./);
  const band = cap.match(/CONFIDENCE ([\d.]+)–([\d.]+)/);
  const svg = document.querySelector("#precfig svg");
  const B = calBands();
  return {
    rows: HO.fights.length, width: HO.fights[0].length, acc: right / HO.fights.length,
    unknown: HO.names.filter((n) => !(n in FI)).length,
    conf, headN: m && +m[1].replace(/,/g, ""), headHit: m && +m[2].replace(/,/g, ""),
    realised: m && +m[3],
    lo: band && +band[1], hi: band && +band[2],
    // the thesis, checkable: at the bottom of the refusal band the model's own
    // held-out record is a coin flip
    deep: precedent(0.52).rate,
    jones: record("Jon Jones"),
    trka: document.getElementById("trka").textContent,
    // the curve: one dot per band, every held-out bout inside one, and drawn at
    // real pixel size rather than through a viewBox that would shrink its own
    // axis labels to 4px on a phone
    bands: B.length, dots: svg ? svg.querySelectorAll("circle").length : -1,
    binned: B.reduce((s, b) => s + b.n, 0),
    scaled: !!svg && (svg.hasAttribute("viewBox") || !svg.getAttribute("width")),
    climbs: B.every((b, i) => i === 0 || b.rate >= B[i - 1].rate - 0.02),
    // the record track: the two marks sit where the numbers say they do
    mark: (() => {
      const R = record(document.querySelector("#trka .trec b").textContent);
      if (!R) return null;
      const box = document.querySelector("#trka .dt .tr2").getBoundingClientRect();
      const at = (s) => (document.querySelector("#trka .dt i." + s).getBoundingClientRect().left
        + 6 - box.left - 6) / (box.width - 12);
      return { claimed: at("cl"), won: at("re"), R };
    })(),
  };
});
ok("the shipped holdout is one row per real bout, six fields wide",
   ho.width === 6 && ho.rows > 0, `${ho.rows}×${ho.width}`);
ok("every fighter in the holdout is in the index", ho.unknown === 0, `${ho.unknown} unknown`);
ok("the precedent headline is arithmetically consistent with itself",
   ho.headN > 0 && ho.headHit <= ho.headN &&
   near((ho.headHit / ho.headN) * 100, ho.realised, 0.06),
   `${ho.headHit}/${ho.headN} vs ${ho.realised}%`);
ok("the quoted band brackets this fight's confidence",
   ho.lo <= ho.conf && ho.hi >= ho.conf, `${ho.lo}–${ho.hi} vs ${ho.conf}`);
ok("the calibration curve plots every band and drops none",
   ho.dots === ho.bands && ho.bands >= 6 && ho.binned === ho.rows,
   `${ho.dots} dots / ${ho.bands} bands / ${ho.binned} of ${ho.rows} binned`);
// The chart is the argument for the refusal: accuracy has to rise with claimed
// confidence, or the threshold is sorting on nothing.
ok("realised accuracy climbs with what the model claimed", ho.climbs);
// A responsive viewBox scales the type with the geometry — the axis labels
// rendered at 4px on a 390px phone before this was drawn at real pixel size.
ok("the curve is drawn at real pixel size, not through a scaled viewBox", !ho.scaled);
ok("the record marks sit where their numbers say",
   ho.mark && near(ho.mark.claimed, ho.mark.R.meanP, 0.02) &&
   near(ho.mark.won, ho.mark.R.won / ho.mark.R.n, 0.02),
   ho.mark && `claimed ${ho.mark.claimed.toFixed(3)} vs ${ho.mark.R.meanP.toFixed(3)} · ` +
              `won ${ho.mark.won.toFixed(3)} vs ${(ho.mark.R.won / ho.mark.R.n).toFixed(3)}`);
// The tail's overlap gauge is a bounded quantity drawn against its own ceiling.
const ent = await page.evaluate(() => ({
  bar: parseFloat(document.querySelector("#dent .er u i").style.width),
  txt: +(document.querySelector("#dent .er b").textContent.match(/([\d.]+) \/ 1\.000/) || [])[1],
}));
ok("the overlap gauge fills to the entropy it prints", near(ent.bar, ent.txt * 100, 0.2),
   `${ent.bar}% vs ${ent.txt}`);
ok("deep in the refusal band its own record is a coin flip",
   near(ho.deep, 0.5, 0.04), `realised ${ho.deep.toFixed(3)} at conf 0.52`);
ok("the record panel prints the count the table actually holds",
   ho.trka.includes(`${ho.jones.right} OF ${ho.jones.n}`),
   `${ho.jones.right} OF ${ho.jones.n} not in "${ho.trka.slice(0, 60)}"`);
ok("THE READ sits after the tail, not in front of it",
   await page.evaluate(() => !!(document.getElementById("dissent").compareDocumentPosition(
     document.getElementById("read")) & Node.DOCUMENT_POSITION_FOLLOWING)));

console.log("\nCard & reset");
const card = await page.evaluate(async () => { await document.fonts.ready; const c = drawCard(); return [c.width, c.height]; });
ok("card exports at 2160×2700", card[0] === 2160 && card[1] === 2700, card.join("×"));
await page.click("#again");
await page.waitForTimeout(400);
ok("reset restores the entry screen",
   await page.evaluate(() => document.getElementById("go").disabled &&
     !document.getElementById("tape").classList.contains("on") &&
     document.getElementById("ia").value === ""));

/* ---------- 3. edge inputs ---------- */
console.log("\nEdge inputs");
const rows = async (a, b) => {
  await page.fill("#ia", ""); await page.fill("#ib", "");
  await page.fill("#ia", a); await page.fill("#ib", b);
  await page.waitForTimeout(300);
  return page.$$eval("#rows .tr", (n) => n.map((r) => r.textContent));
};
const miss = await rows("Alex Hunter", "Chris Holdsworth");
ok("missing reach / age / stance render as —", miss.join("|").includes("—"));
const sw = await rows("Israel Adesanya", "Alex Pereira");
ok("switch stance is not mislabelled orthodox", sw.some((r) => r.includes("SWITCH")));
await rows("Jon Jones", "Jon Jones");
ok("a fighter cannot fight himself", await page.$eval("#go", (e) => e.disabled));
await rows("Zzz Not A Fighter", "Jon Jones");
ok("unknown fighter is declined, not guessed",
   (await page.$eval("#warn", (e) => e.textContent)).includes("NOT IN THE INDEX"));

// The index is keyed by UFCStats' exact spelling. Exact-match lookup meant
// "jon jones" was refused as NOT IN THE INDEX while the autocomplete right
// above it was listing him — the tool disowning a fighter it actually holds.
await rows("jon jones", "tom aspinall");
ok("lowercase input resolves instead of being declined",
   !(await page.$eval("#go", (e) => e.disabled)) &&
   (await page.$eval("#warn", (e) => e.textContent)) === "");
ok("it resolves to the indexed fighter, not a guess",
   (await page.$eval("#pna", (e) => e.textContent)) === "JON JONES");
await rows("  Jon   Jones ", "Tom Aspinall");
ok("stray and repeated whitespace resolves too",
   !(await page.$eval("#go", (e) => e.disabled)));
await rows("jon jones", "JON JONES");
ok("case difference is still the same fighter, not a matchup",
   await page.$eval("#go", (e) => e.disabled));

/* ---------- 4. reduced motion on a phone ---------- */
console.log("\nReduced motion @ 390px");
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
watch(m, "mobile");
await boot(m);
await m.click("#ienter");
await m.fill("#ia", "Georges St-Pierre");
await m.fill("#ib", "Islam Makhachev");
await m.waitForTimeout(400);
await m.click("#go");
await m.waitForSelector("#verdict.on", { timeout: 30000 });
await m.waitForTimeout(500);
ok("all rollouts still counted with motion reduced", (await m.evaluate(() => SIM.counted)) === 1000);
ok("no horizontal overflow", !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
// St-Pierre's last bout is 2017, so the test window holds nothing of his. The
// panel has to say that rather than render a confident "0 of 0" — an ungraded
// fighter and a fighter the model got wrong every time must not look alike.
ok("a fighter with no held-out bouts is declared, not faked",
   (await m.$eval("#trka", (e) => e.textContent)).includes("NEVER GRADED"));
ok("the graded corner still reports a real count",
   /\d+ OF \d+/.test(await m.$eval("#trkb", (e) => e.textContent)));

/* ---------- 5. the hard constraints, as assertions ----------
   These were four rules in a markdown file that a change could break silently.
   They are the product, so they are now a red build instead of a note. */
console.log("\nHard constraints");
const src = readFileSync(built, "utf8");
// Only the human-visible half of the file. Two things are stripped first, and
// both matter: the inlined data block, because "0.232" is a real striking rate
// for 56 fighters and would false-positive the retired-figure scan forever; and
// the comments, because the disclosure blocks legitimately name the claims this
// project must never make and must not trip their own rule.
const shown = src
  .replace(/<script id="fjdata"[\s\S]*?<\/script>/i, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ");

ok("no method inflation anywhere the reader can see",
  !/\bA\.?I\.?\b|neural|deep learn|machine learning|artificial intelligence/i.test(shown),
  (shown.match(/\bA\.?I\.?\b|neural|deep learn|machine learning|artificial intelligence/i) || [])[0]);
ok("no fighter photography", !/<img\b/i.test(src) && !/background-image\s*:\s*url\(['"]?data:image\/(png|jpe?g|webp)/i.test(src));
ok("the disclaimer is present and un-deletable",
  /NOT A PREDICTION\. A DISTRIBUTION\./.test(src));
ok("the data source and the non-affiliation are stated in the product",
  /ufcstats/i.test(shown) && /not affiliated/i.test(shown), "attribution missing from the built file");
ok("a locator ships on the artifact", /const HOME=['"][^'"]+['"]/.test(src));
// Every metric the UI prints, against the block build-data.py labels "THE
// NUMBERS THE UI IS ALLOWED TO PRINT". A figure on screen that the pipeline no
// longer produces is exactly the failure this project exists not to have, and
// it is invisible to every other assertion here.
const PUBLISHED = ["61.2%", "76.8%", "15.6%", "67.2%", "52.0%", "0.230", "3,404", "6,457"];
const missingClaims = PUBLISHED.filter((n) => !shown.includes(n));
ok("every published figure is still on screen", missingClaims.length === 0, missingClaims.join(", "));
// Retired figures. Each was wrong, and each shipped on three surfaces at once.
const RETIRED = [
  ["0.232", "superseded Brier — the build computes 0.2299"],
  ["N=6,808", "mirrored rows quoted as the sample size; it is 3,404 fights"],
  ["≤2 PTS", "uncomputed calibration claim; worst band is 2.45"],
  ["≤2 POINTS", "same claim, method-screen wording"],
  ["SAMPLING THE POSTERIOR", "there is one coefficient vector and no covariance matrix"],
];
const revived = RETIRED.filter(([n]) => shown.includes(n));
ok("no retired figure or claim has come back",
  revived.length === 0, revived.map(([n, why]) => `${n} (${why})`).join(" | "));

// MET is the single source for every validation figure the UI prints. It is not
// derivable in the browser — it comes from the rolling-origin CV — so the only
// guarantee that the screen still agrees with the pipeline is this comparison
// against the file build-data.py writes. Without it, MET is just more literals.
const metricsFile = path.join(root, "tools", "metrics.txt");
if (!existsSync(metricsFile)) {
  ok("tools/metrics.txt exists — run build-data.py", false);
} else {
  const txt = readFileSync(metricsFile, "utf8");
  // THE READ reads the shipped holdout instead of a summary of it, so the table
  // in the file has to BE the one the published accuracy came from. Compare it
  // against the reproduction check build-data.py prints — the whole panel is
  // fiction the moment these diverge, and nothing else here would notice.
  const tbl = txt.match(/THE READ table\s+:\s+(\d+) fights[\s\S]*?reproduces accuracy\s+:\s+([\d.]+)/);
  ok("metrics.txt records THE READ table", !!tbl);
  if (tbl) {
    ok("the shipped holdout is the pipeline's own held-out set",
       ho.rows === +tbl[1], `file ${ho.rows} vs pipeline ${tbl[1]}`);
    ok("and it still reproduces the accuracy the pipeline measured",
       near(ho.acc, +tbl[2], 0.0001), `file ${ho.acc.toFixed(4)} vs pipeline ${tbl[2]}`);
  }
  const thr = txt.match(/below 0\.58\s+([\d.]+)% of fights, realised ([\d.]+)\s+at\/above\s+([\d.]+)%, realised ([\d.]+)/);
  const hdr = txt.match(/accuracy ([\d.]+)%\s+Brier ([\d.]+)\s+ECE ([\d.]+) pts\s+worst band ([\d.]+) pts\s+N (\d+)/);
  const MET = await page.evaluate(() => MET);
  const expected = !thr || !hdr ? null : {
    REFUSE: Math.round(+thr[1]), REFUSE_ACC: (+thr[2] * 100).toFixed(1),
    CALL: Math.round(+thr[3]), CALL_ACC: (+thr[4] * 100).toFixed(1),
    FORCED: hdr[1], BRIER: hdr[2], ECE: hdr[3], WORST: hdr[4],
    N: (+hdr[5]).toLocaleString("en-US"),
  };
  ok("metrics.txt is parseable", expected !== null);
  if (expected) {
    const drift = Object.entries(expected)
      .filter(([k, v]) => String(MET[k]) !== String(v))
      .map(([k, v]) => `${k}: screen ${MET[k]} vs pipeline ${v}`);
    ok("every figure on screen matches what the pipeline computed",
      drift.length === 0, drift.join(" | "));
  }
}
ok("the retired competitor claim has not come back",
  !/models? advertising \d+%|random-split their data/i.test(shown));

/* ---------- 6. event mode ---------- */
console.log("\nEvent mode");
await page.click("#event");
ok("EVENT opens the panel", await page.$eval("#evpanel", (e) => e.classList.contains("on")));
await page.fill("#ename", "TEST CARD");
await page.fill("#ecard", "Jon Jones vs Stipe Miocic\nAlex Pereira vs Israel Adesanya\nNot A Person vs Jon Jones");
await page.click("#erun");
await page.waitForTimeout(1500);
const ev = await page.evaluate(() => ({
  rows: EV.rows.length, dec: EV.dec, drawn: document.querySelectorAll(".erow").length,
  warned: document.getElementById("ewarn").classList.contains("on"),
  rcpt: JSON.parse(receipt()),
}));
ok("both real bouts ran, the unknown fighter was declined", ev.rows === 2 && ev.warned, `rows=${ev.rows}`);
ok("every bout is drawn", ev.drawn === ev.rows);
ok("the receipt is committable and ungraded", ev.rcpt.bouts.length === 2
  && ev.rcpt.bouts.every((b) => b.winner === null) && !!ev.rcpt.stamped);
ok("the receipt records refusals explicitly",
  ev.rcpt.bouts.every((b) => typeof b.refused === "boolean"));
ok("the scorecard renders at the bout count",
  await page.evaluate(() => { const c = drawEvent(); return c.width === 2160 && c.height > 1000; }));
await page.click("#eclose");
ok("Escape/Close dismisses it", !(await page.$eval("#evpanel", (e) => e.classList.contains("on"))));

/* ---------- 7. nothing threw ---------- */
console.log("\nConsole");
ok("no console or page errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { fails.forEach((f) => console.log("  ✗ " + f)); process.exit(1); }
