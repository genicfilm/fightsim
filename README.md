# MMA RECEIPTS

**See what the record separates — and what it does not.**

MMA RECEIPTS is a line-blind pre-fight evidence check for UFC fans. Choose two
fighters; it compares their career states, runs the matchup 1,000 times, and
reports the distribution — including every run that lands on the other side.

**It refuses 40.4% of held-out fights.** Those realised 52.0%, and the fights
below 0.55 realised *exactly* 50.0% — no measurable separation, stated plainly.
The 59.6% it retains realised 67.2%. The refusal, its measured record, and the
pre-card event receipt are the product.

**Open `receipts/MMAReceipts.html` by double-clicking it.** No server, no
terminal. Everything is inlined into that one file.

Full documentation: **[`receipts/README.md`](receipts/README.md)** — the model,
its measured limits, smart search, the short Matchup Read, the sim, attribution,
the cross-division prior, career versions, the palette, and the share card.
Product direction and future boundaries live in
**[`receipts/PRODUCT-BRIEF.md`](receipts/PRODUCT-BRIEF.md)**.

*Previously THE OFFICIATING FILE, FIGHT JURY, VARIANCE, then FIGHT SIM. The jury
metaphor described the wrong machine; "variance" is a statistics word and the
audience is fight fans; FIGHT SIM named the engine rather than the product. A
receipt is the thing this actually makes — a reading committed in public before
a card and graded after it — so the name is the artifact now, not the machinery
that produces it. Renamed 2026-07-25; nothing about the model changed.*

## Layout

```
receipts/
  MMAReceipts.html    the built single file — this is the one you open
  index.html       editable source
  data.json        2,290 fighters x 8,880 career versions + the model
  aliases.json     reviewed search aliases, keyed by canonical fighter name
  fonts/           Anton + Barlow Condensed
  README.md        the real documentation
  PRODUCT-BRIEF.md durable product direction and future boundaries
tools/
  build-data.py       rebuilds data.json from public UFC data (Python)
  build-receipts.mjs  validates aliases; bundles source + data + aliases + fonts
  chromium-path.mjs   locates Chromium for Playwright testing
  test.mjs            the regression suite (npm test)
  shots.mjs           visual regression (npm run shots)
  ledger.mjs          grades ledger/*.json -> ledger/README.md
  metrics.txt         every published number, written by build-data.py
  baseline/           committed screenshots the shots run diffs against
ledger/
  README.md           the public record — what it called, and what happened
  *.json              one receipt per event, committed BEFORE the card
AGENTS.md             working contract — read before changing anything
```

## Changing it

**[`AGENTS.md`](AGENTS.md)** is the contract: what counts as UI and what does
not, the DOM contract, the invariants `npm test` enforces, the offline
constraints, and why the palette is what it is. Read it first.

**Run both suites from WSL bash, never from Windows** — the Chromium fallback
rasterises differently and turns all eight screens red for no real reason.

## Rebuilding and testing

```bash
# after editing index.html, data.json, aliases.json or fonts
npm run build:receipts
npm test                 # drives the built file over file://
npm run shots            # screenshots vs tools/baseline/

# to refresh the underlying UFC data (new events, new fighters)
python3 -m venv .venv
./.venv/bin/pip install pandas numpy scikit-learn pyarrow
./.venv/bin/python tools/build-data.py
npm run build:receipts
```

## What it does and does not read

MMA RECEIPTS is a distribution, not a winner service. It reads the 34 shipped
career features and never sees a betting line. Injuries, camps, weight cuts and
social chatter are not scored; the short Matchup Read says so rather than
implying knowledge the model does not have.

Its claims are the measurements this repository rebuilds: rolling-origin
accuracy, calibration, the refusal rate, what those refusals realised, and the
event ledger.

## Smart search

Canonical fighter names resolve after case, spacing, punctuation and diacritic
normalization. Reviewed nicknames such as `Korean Zombie` live in
`receipts/aliases.json`; they are UI metadata, not model data. A typo can appear
as a **CLOSE MATCH** in autocomplete, but fuzzy matching never silently selects
a fighter. The user must confirm a suggestion, and unresolved names are
declined.

The build validates every alias target and normalized key, then inlines
`aliases.json` beside `data.json` in the offline file. Invalid, empty or
ambiguous aliases stop the build.

## Data

[UFCStats](http://ufcstats.com) via the public
[Greco1899/scrape_ufc_stats](https://github.com/Greco1899/scrape_ufc_stats)
mirror. This project reads that mirror and never touches UFC systems.

Not affiliated with, endorsed by, or sponsored by the UFC, Zuffa LLC or TKO
Group. What ships in `data.json` is derived features — rolling averages, Elo,
form, layoff and age — rather than source pages.

---

It is L2 logistic regression over 34 engineered features. The interface speaks
in Monte Carlo rollouts, posteriors, log-odds and binary entropy because that is
literally what runs. The copy must not imply a different method.
