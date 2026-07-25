# FIGHT SIM

Two fighters go in. The model runs the matchup 1,000 times and reports the
distribution — never a call. The runs that go the other way are the point.

**It refuses 40% of fights.** On those it measured itself at 52.0%, and under
0.55 it realised *exactly* 50.0% — it has no skill there, and says so. On the
60% it will call, it is right 67.2% of the time. Every competing tool in this
category emits a confident winner on every fight; none of their scoring systems
can express "no edge". That is the product.

**Open `fightsim/FightSim.html` by double-clicking it.** No server, no
terminal. Everything is inlined into that one file.

Full documentation: **[`fightsim/README.md`](fightsim/README.md)** — the model,
its measured limits, the sim, the attribution panel, the cross-division prior,
career versions, the palette, and the share card.

*Previously FIGHT JURY, then VARIANCE; both retired 2026-07-24. The jury
metaphor described the wrong machine — this is a simulation, not a
deliberation. VARIANCE described the right machine, but "variance" is a
statistics term, and the audience is fight fans. The product already called it
the sim; the name does now too.*

## Layout

```
fightsim/
  FightSim.html    the built single file — this is the one you open
  index.html       editable source
  data.json        2,290 fighters x 8,880 career versions + the model
  fonts/           Anton + Barlow Condensed
  README.md        the real documentation
tools/
  build-data.py       rebuilds data.json from public UFC data (Python)
  build-fightsim.mjs  bundles index.html + data.json + fonts -> FightSim.html
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
# after editing index.html or data.json
npm run build:fightsim
npm test                 # 58 assertions, drives the built file over file://
npm run shots            # 8 screens vs tools/baseline/

# to refresh the underlying UFC data (new events, new fighters)
python3 -m venv .venv
./.venv/bin/pip install pandas numpy scikit-learn pyarrow
./.venv/bin/python tools/build-data.py
npm run build:fightsim
```

## What this is not

It is not a prediction tool and must never be sold as one. ~62% is the accuracy
ceiling of public fight statistics; betting markets reach 65–70% because they
price injuries, camps and weight cuts, and that information is in no box score.
This model never sees a betting line, which is the whole reason it sits where it
sits. The claim here is **calibration** — when it says 0.65–0.75, the fighter
wins 68.9% of the time — and the refusals that follow from it.

## Data

[UFCStats](http://ufcstats.com) via the public
[Greco1899/scrape_ufc_stats](https://github.com/Greco1899/scrape_ufc_stats)
mirror. This project reads that mirror and never touches UFC systems.

Not affiliated with, endorsed by, or sponsored by the UFC, Zuffa LLC or TKO
Group. Fight statistics are facts and are not copyrightable; what ships in
`data.json` is derived features — rolling averages, Elo, form, layoff, age —
not a copy of the source tape.

---

It is L2 logistic regression over 34 engineered features. The interface speaks
in Monte Carlo rollouts, posteriors, log-odds and binary entropy because that is
literally what runs. It must never imply a neural network or deep learning.
