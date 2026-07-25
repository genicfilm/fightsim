# FIGHT SIM

Two fighters go in. The model runs the matchup 1,000 times and reports the
distribution — never a call. The runs that go the other way are the point.

*Previously FIGHT JURY, then VARIANCE. The courtroom framing went because it
described the wrong machine — these are Monte Carlo rollouts over a calibrated
posterior, not a deliberation. VARIANCE went because it described the right
machine in a word no fight fan parses on sight. The internal vocabulary was
already "the sim" — the button says `RUN THE SIM` — so the name is now the word
the product was using anyway.*

## Run it

**Double-click `FightSim.html`.** That is it. No server, no terminal, no
localhost. Everything — model, 2,290 fighters, all four fonts — is inlined into
that one 2.6 MB file, so it runs straight off disk.

```
C:\Users\ryank\Documents\UFC REF\fightsim\FightSim.html
```

Rebuild it after any change to `index.html` or `data.json`:

```bash
npm run build:fightsim
```

`index.html` is the editable source and fetches `data.json`, so it needs a real
server (`python3 -m http.server 8931`). Under WSL2, Windows will often fail to
forward `localhost` — use the WSL address (`hostname -I`) or just work from the
built file.

No backend, no API, no database, no per-query cost. It can be hosted free
anywhere, or emailed to someone as a single attachment.

## What it actually is

- `FightSim.html` — the built single file. **This is the one you open.**
- `index.html` — editable source. Autocomplete, tale of the tape, the sim,
  attribution, the tail.
- `data.json` — 2,290 fighter career states, the model (coefficients, means,
  scales, imputation values), and the rolling-origin holdout itself: 3,404 real
  bouts with the out-of-fold posterior the model produced for each and what
  actually happened. 2.0 MB.
- `fonts/` — Anton + Barlow Condensed.
- `../tools/build-fightsim.mjs` — bundles the three into `FightSim.html`.

The model is **logistic regression**, deliberately. A gradient-boosted ensemble
scored the same on held-out data (61.5% vs 61.2%), and the linear model ports to
twenty lines of browser JavaScript and can be read by a human. The UFC's rankings
are a black box. This one isn't.

## The model

Trained on 6,457 UFC fights where both fighters had at least one prior UFC bout.
Every feature is computed **only from fights that had already happened** —
recency-weighted (EWMA) and career-average striking, grappling, control and
durability rates, plus form, layoff, age curve, physicals, and a time-decayed,
method-weighted Elo.

Validated by rolling origin: train on everything before year N, test on year N,
for N = 2018…2026. No random splits — a random split leaks a fighter's future
into their own past.

Every figure below is printed by `tools/build-data.py` into `tools/metrics.txt`.
Nothing on screen states a number this repository cannot rebuild.

| | |
|---|---|
| Accuracy, forced to call every fight | **61.2%** |
| **Fights it refuses** (conf < 0.58) | **40.4%** — and those realised **52.0%** |
| **Fights it will call** (conf ≥ 0.58) | **59.6%** — and those realised **67.2%** |
| On fights it calls ≥70% | **76.8%** (15.6% of the card) |
| Brier score | 0.230 (0.25 = coin flip) |
| Calibration error | **1.1 points** weighted, **2.5** in the worst band |
| Held out | **3,404 fights** (6,808 mirrored evaluations) |

**The refusals are the credential.** Under 0.55 this model realised *exactly*
50.0% across a quarter of the held-out set — it has no skill there, measurably,
and saying so is the one thing no competitor's scoring system can express. The
40% it declines realised 52.0%; the 60% it keeps realised 67.2%, which is inside
the range closing betting lines achieve. It is not a weak model. It is a model
that knows which fights it cannot call.

**Two numbers here were wrong until they were computed.** The Brier was
published as 0.232 and is 0.2299. "Calibration error ≤2 points in every band"
was published on three surfaces and computed nowhere — under the bands this file
describes, the 0.50–0.55 band is off by 2.45 points, so the claim was false as
stated. ECE is a weighted *mean* and "every band" is a *max*; publishing one
label over both, with no bin definition, made the headline credential
unfalsifiable. Both are now derived by the build.

**N is fights, not rows.** Every matchup is mirrored A–B and B–A to enforce
symmetry, so the evaluation set is 6,808 rows over 3,404 fights. The intercept
is exactly `-0.0`, which means the mirrored half is a deterministic reflection
carrying no additional information. Reporting 6,808 doubled the apparent
evidence base.

Ceiling check: adding Elo, gradient boosting, recency weighting, durability and
form all landed within half a point of each other. The signal in public fight
statistics runs out around 62%. Betting markets reach 65–70% because they price
injuries, camps and weight cuts — information that is not in any box score.

## The share card

**SAVE THE CARD** exports 2160×2700 (1080×1350 @2x) — the 4:5 ratio X and
Instagram give the most vertical space to. **Copy image** puts it on the
clipboard instead.

Every pixel is drawn with Canvas 2D. No html2canvas, no library: a strict
offline single file can't fetch a CDN, so the card is drawn by hand. It works
with the network off.

Three decisions worth knowing:

- **JPEG, not PNG.** Film grain is close to incompressible — the same card is
  1.2 MB as JPEG and 4.6 MB as PNG. Every platform re-encodes to JPEG anyway.
  The clipboard path has to use PNG because that is all `ClipboardItem` accepts.
- **Grain is drawn in 2×2 blocks.** Per-pixel noise across 5.8M pixels pushed
  the first build to 8.9 MB.
- **`await document.fonts.ready` before drawing.** Canvas does not wait for
  webfonts; it silently falls back to a system face and the card renders wrong.

Long names shrink to fit rather than overflowing — both dissent lines size to
whichever needs to be smaller, so they stay optically equal.

## Rules this thing lives by

1. **Never call it a prediction.** It is a distribution. The footer says so, and
   the word does not belong in this file either.
2. **The tail is the product.** The minority mass is the shareable object.
3. **INDETERMINATE is a feature.** Under a 0.58 posterior it says there is no
   separation instead of manufacturing a winner.
4. **No UFC record, no entry.** Fighters outside the index are declined rather
   than guessed at.
5. **No method inflation.** It is L2 logistic regression over 34 engineered
   features. The copy may be technical — it must never imply a neural network,
   deep learning, or any method this does not use.

## EVENT mode, and the ledger

`EVENT` in the masthead takes a whole card — one bout per line, `A vs B` — and
returns one image: every fight, the posterior, and the ones it **refuses**
stamped in the open. Fighters resolve through the same folding index the single
matchup uses, and anything not in the file is declined by name rather than
guessed at. Versions are **latest**, not prime: an upcoming card is fought by
whoever these people are now.

*Copy the receipt* emits a timestamped JSON record — model shape, every
posterior, every refusal, `winner: null`. Commit it to `ledger/` **before** the
card, so `git log` is the timestamp, then fill the winners in afterwards and run:

```bash
node tools/ledger.mjs        # regenerates ledger/README.md
```

Refused bouts are graded too, in their own column. That is deliberate: refusing
is only honest if the refusals can be shown to have been coin flips. If they
quietly outperform, the threshold is wrong, and the table is how anyone —
including you — finds that out.

Everything in this category publishes a backtest. A backtest is measured on data
the author already had. This is the other thing.

## Career versions

Every fighter exists as one version per year they fought — 2,290 fighters,
**8,880 versions**. Prime Jon Jones against prime Daniel Cormier, not whoever
happened to show up last.

"Prime" is the year of peak Elo, and it lands where fans would put it without
any hand-tuning: Anderson Silva 2012 (the year before Weidman), Adesanya 2022
(the year before Pereira), GSP 2011, Conor 2015. Fighters who never declined —
Khabib, Aspinall, Islam — correctly have prime = latest.

Each version carries the **division that fighter actually fought at that year**,
not their final listed weight. So Conor 2015 is a 145 lb featherweight, Conor
2026 is a 170 lb welterweight, and Islam 2025 is a welterweight after his move
up. Weight-class movement is handled by the data rather than by a special case.

The picker defaults to PRIME and stays hidden until a fighter is chosen, so the
cold page still reads as two fields and a button. One control per corner.
Everything the picker changes shows up in the tale of the tape below it.

Two data repairs this needed:

- **Title fights had no division.** `"UFC Welterweight Title Bout"` failed an
  exact-match lookup and fell back to the fighter's final listed weight, which
  made prime Conor a 155 lb lightweight and prime GSP a 185 lb middleweight.
  Now matched by substring, `Light Heavyweight` tested before `Heavyweight`.
- **No-contests erased ratings.** Elo is built only from decisive results, so a
  fighter whose last bout of a year was overturned dropped to the 1500 default —
  which is why Jones and Cormier both showed 1500 in 2017 (UFC 214). Ratings now
  carry forward across a no-contest. 262 gaps → 3.

## The tale of the tape

Picking a fighter used to print one grey line: `15 UFC FIGHTS · ELO 1646 ·
205 LB LIGHT HEAVYWEIGHT`. It now draws a VS screen — name plates, division
badges, seven tape rows and a six-axis fingerprint.

It stays hidden until a corner is filled, so the cold page is unchanged. **One
fighter draws half a VS screen**; the empty side reads `AWAITING FIGHTER` and
every row shows `—`. The second fighter completes it. One reveal, not two, and
no state where the layout jumps around under the cursor.

**No photography, and none needed.** Every fighter is rendered as type, a
badge, a bar and a polygon. That is the whole reason this direction fits a
project with no image rights.

**The rows measure distance, not merit.** The bar under each row grows from the
centre toward whoever has the larger number, scaled by the real spread of that
stat, so a 40-point Elo edge does not look like a landslide. Age draws its gap
in neutral grey and highlights nobody — older is not worse, just older. Ties
are decided on the *printed* value: 0.882 and 0.875 both read "88%", and
highlighting one of two identical numbers looks like a bug.

**The fingerprint is percentile, not raw rate.** 4.7 strikes a minute means
nothing without the field, so each of the six axes — striking, accuracy,
takedowns, control, defence, power — is a percentile rank against all 8,880
career versions in the file. Ties share their rank, otherwise the 41% of
versions with zero knockdowns would all read as dead last. The larger polygon
draws underneath so it cannot swallow the smaller one. Adesanya vs Pereira
comes out as two striker shapes with almost no grappling half; Jones vs
Aspinall comes out as two different animals.

**The catchweight warning moved forward.** The weight-gap disclosure used to
appear only after you pressed the button. A `CATCHWEIGHT · 120 LB GAP` chip now
sits on the VS screen, so the model announces it is off its data *before* the
jury sits, not after.

Two things the tape needed from the data:

- **Real stance.** The model only carries a southpaw flag, but 142 of 2,290
  fighters are listed Switch and printing "ORTHODOX" for them is a plain
  factual error. `build-data.py` now exports the stance string per fighter.
- **Nothing else.** Every other row and axis was already in `data.json`.

## The pipeline

The first version of this was a spark storm — two beams colliding, one particle
per rollout. It was replaced, because **decoration on a statistics tool costs
credibility rather than adding it.** Every spark genuinely was a rollout, but
nothing about watching them was checkable, so it read as a toy. A sceptic
watching fireworks concludes "graphics"; a sceptic watching arithmetic
concludes "arithmetic".

What runs now is the computation itself, in the order the model performs it,
with the real numbers on screen at every step:

| | | |
|---|---|---|
| **01** | READING CAREER STATE | the two 34-dimensional vectors, one cell per model column, shaded by percentile rank across all 8,880 career states |
| **02** | DIFFERENCING · STANDARDISING | Δ = blue − red, divided by the training SD of each feature |
| **03** | APPLYING COEFFICIENTS | one bar per term at `coef × standardised Δ`, with the running Σ swept left to right in the order the model sums it |
| **04** | SAMPLING THE POSTERIOR | 1,000 perturbed draws through the logistic link, plotted as a jittered binary scatter against the fitted curve |

Step 04 is the canonical logistic-regression picture: x is each rollout's own
log-odds, y is what that rollout actually returned, and the sigmoid threads
between the two bands. Where the cloud is wide, the matchup is uncertain — and
you can see the width rather than being told about it. A histogram of the
sampled log-odds runs beneath the axis.

**The ending is the point.** When the last draw lands, a readout compares the
**empirical p̂** (rollouts returning blue ÷ 1,000) against the **model P**
(`σ(z₀)`, computed analytically) and prints the difference. Two numbers reached
by completely different routes, side by side. If the tool were broken they
would disagree, and you would be able to see it.

Three invariants hold this together, and the test suite asserts all three:
`Σ terms = z₀`, `σ(z₀) = P`, and every one of the 1,000 draws appears in the
histogram. Step 03's final Σ, the attribution panel's Σ, and step 04's crosshair
are the same number arriving by three paths.

Canvas 2D, no library. `prefers-reduced-motion` compresses the four phases to
about two seconds and skips the per-draw animation.

## The method screen

A skeptic needs to know why this is different before they trust a number from
it, so the page opens on one screen with three beats and no marketing:

- **1,000** — Monte Carlo rollouts through a posterior fit on 6,457 UFC bouts.
- **ROLLING ORIGIN** — every feature computed only from bouts that had already
  happened; train on everything before year N, test on year N.
- **40%** — of fights it refuses. On those it measured itself at 52.0%; on the
  60% it will call it is right 67.2% of the time. Forced to call everything,
  61.2%.

The pitch is not a better model — it is logistic regression, and a
gradient-boosted version scored the same. It is that **this one refuses the
fights it cannot call, and publishes what the refusals were worth.**

The screen used to read *"Fight models advertising 75% random-split their
data"*. That was an unsubstantiated claim about third parties sitting on the one
screen built to disarm a sceptic, and it has been removed. The mechanism is
provable and the accusation was not: a random split does score higher by leaking
a fighter's future into their own past, and *these numbers are lower because
they are real.*

Shown once, remembered in `localStorage`, reopenable from `METHOD` in the
masthead, dismissable with `Escape`.

## THE READ

The product used to end at the tail: one posterior, one shareable line, and an
eight-row attribution panel. Everything else the model knew about the matchup
was computed and thrown away, so the answer arrived and nothing followed it.
THE READ is that reasoning put back, in three panels.

### Precedent — the held-out record at this reading

`data.json` ships the holdout rather than a summary of it. Given the posterior on
screen, the browser takes every held-out bout the model read within **±0.025
confidence** of it and reports how often the favourite actually won.

That is not a second model or a new estimate. It is the published calibration
curve sliced locally, off the same predictions the 61.2% comes from — which is
why `tools/build-data.py` prints a reproduction check into `tools/metrics.txt`
and `npm test` fails if the shipped table stops matching it. Two numbers on
screen and one table behind them; if they ever disagree the panel is fiction.

The window is fixed rather than the sample size, so a rare reading reports a
small `n` and says so. Past the top of the curve there is no window left, so it
falls back to the nearest 20 and prints the range it actually covered — the page
in its caption, the card in its sentence.

**It is drawn, not stated.** The panel used to be three large numbers under six
lines of caption explaining what they meant. It is now a plot of realised against
claimed across all seven bands, and the caption is the axes: the dots climb, they
sit on the `y = x` diagonal rather than above it, the refusal zone is shaded, and
a caret marks where this fight landed. Two things a reader gets in one look and
could not get from the numbers — that the model earns its confidence, and that
below the threshold there is nothing there. Position encoding, so the truncated
y-axis is legitimate; it is labelled at 50%, 70% and 88%.

The curve is drawn at **real pixel size**, never through a responsive `viewBox`.
A scaled viewBox scales the type with the geometry: axis labels set at 8.5px for
a 1,064px desktop rendered at 4px on a 390px phone. `#precfig` lives inside
`#verdict`, which is `display:none` until the run settles, so it has no width to
measure at render time — `drawCal()` runs once the verdict is up, and again on
resize. The suite asserts the `viewBox` has not come back.

It also quotes back one fight it got right and one it got wrong from the same
band. Those are picked by the **weaker fighter's Elo going in**, never by date:
the point of quoting a fight is that you might remember it, and the most recent
bout in any band is whichever prelim opened the newest card. Deterministic, so
`npm run shots` can diff a screen containing them.

This is where the refusal stops being a policy and becomes a receipt. Deep in
the refusal band the model's own held-out record is a coin flip, on screen, on
that fight — and the suite asserts it.

### Its record on these two

The same table, sliced by fighter instead of by posterior: how many held-out
bouts each corner appears in and how many the model read correctly.

Two marks on one 0–1 track — hollow for what the model claimed, filled for what
happened — and **no adjective**. An earlier draft said this in prose and called
the gap "consistently over/under-rated", which six fights cannot support, and
which is guaranteed anyway: a calibrated model never says 1.00, so any fighter
who happens to be undefeated across their holdout run reads as under-rated by
construction. That is selection, not miscalibration. Plotted, the gap is visible
and asserts nothing.

A fighter with no bout in the 2018–2026 window reads **NEVER GRADED**, never
"0 of 0". An ungraded fighter and one the model got wrong every time must not
look alike.

### What moved the posterior

The model's own arithmetic: `coef × scaled feature`, one term per feature,
diverging blue/red about a zero midpoint. Positive log-odds point at the blue
corner because the model is fit as `P(A)` on the difference vector `a − b`.

This is the line between this and a video-game stat screen. A game invents an
attribute rating; this shows the terms that were actually summed, labels which
ones were imputed, prints the total including the intercept, and shows that
total passing through the sigmoid to the posterior on screen. If the sum does
not equal the number, the panel is visibly lying — which is the point of
printing it.

All 34 columns are grouped into six families — STRIKING, GRAPPLING, DAMAGE,
RATING, RECORD & FORM, PHYSICAL — each drawn at its subtotal with its own terms
one click away in a `<details>`. Six subtotals is an argument where 34 flat rows
is a list, and nothing is hidden any more: the panel used to draw the top 8 and
drop the rest. **Every column must match exactly one family** and the suite
asserts it, so adding a feature to the model without giving it a home fails the
build rather than landing in a bucket called OTHER.

Group subtotals and member terms share one bar scale on purpose. A family whose
members cancel — PHYSICAL at `+0.22` net over `LISTED WEIGHT −0.21`,
`REACH +0.19`, `AGE +0.17` — should visibly have a short bar over long ones.

The cross-division mass prior, when it fires, appears as one more row at its
exact log-odds. It is not allowed to hide.

### Gross against net

`Σ|term|` against `|Σ term|`, drawn as two bars on one scale under the panel with
the share that cancels. `npm test` asserts the net bar's width *is* `net/gross` —
a picture that does not match its own caption is worse than the caption alone.

Two fights can land on the same posterior for opposite reasons — nothing
separating the pair, or a great deal separating them in both directions at once
— and the single number cannot tell them apart. Jones vs Aspinall is `±3.78`
gross against `−0.21` net: **95% cancels**. That is a close fight with a great
deal in it, not an empty one. Both quantities were already computed; the model
is linear, so this is arithmetic rather than an interpretation of it.

## The palette

Corner A was white and corner B was red. Run through a categorical-palette
validator against the `#0a0a0c` surface, that pairing fails two checks: white
has no chroma, so it reads as grey, and it sits far outside corner B's
lightness band — one fighter visually outranked the other before a single
rollout ran.

`#2b7fff` against `#e01a22` passes all six: same lightness band, ΔE 32.6 under
deuteranopia, ΔE 39.0 at normal vision, both above 3:1 against the surface. It
is also what the sport already paints on the cage, so `BLUE CORNER` and
`RED CORNER` finally mean what they say. Brighter cyans scored better on paper
and failed the lightness band — at `L 0.84` they shout down the red.

## The cross-division prior

A flyweight must not beat a heavyweight. The first build let one — Demetrious
Johnson took Tom Aspinall 582–418 — because there was no weight feature at all,
and DJ carried the higher Elo.

Adding weight as a learned feature does **not** fix it. Across 6,428 training
fights the mean weight gap is 5.7 lbs, the 95th percentile is 25 lbs, and only
**4 fights exceed an 80 lb gap**. Aspinall–DJ is 131 lbs. Nothing in UFC history
resembles it, so nothing can be learned from it — measured accuracy moved 61.26%
→ 61.04% when weight was added, i.e. not at all.

So past one division the model stops asking the data and applies physics:

```
gap ≤ 20 lbs      no adjustment — the record decides
gap > 20 lbs      ±0.05 log-odds per extra pound, capped at 5.0
```

The 20 lb dead zone is measured, not assumed: **fighters moving up a division
won 53.4% of 451 such fights** in UFC history. Moving up one weight class is not
a penalty, and the model must not invent one. Beyond that,
[body mass drives punch impact force and each 1 cm of reach raises fight-ending
strike odds ~10%](https://www.mdpi.com/2076-3417/15/7/4008), and the penalty
compounds.

**The prior is stated on screen and printed on the shared card**, with the exact
log-odds applied. A hidden fudge factor is how a tool loses people; a declared
one is how it keeps them. Aspinall now wins 992–8.

## Known limits

- **Cross-era is a toy.** A retired fighter's career state is frozen at their
  last bout, so GSP is modelled at 36 in 2017. There is no honest bridge between
  eras; treat those matchups as entertainment, not analysis.
- **Non-UFC fighters are missing.** Herb Dean went 2–3 in KOTC and Rage in the
  Cage, so he is not in UFCStats and cannot be empanelled. Fixing that needs a
  Sherdog/Tapology source.
- **Thin data.** Most fighters have fewer than 15 UFC fights.

## Data

[UFCStats](http://ufcstats.com) via the public
[Greco1899/scrape_ufc_stats](https://github.com/Greco1899/scrape_ufc_stats)
mirror — 8,784 fights and 41,340 round-level rows, current through 18 July 2026.
UFCStats itself is behind a bot challenge; the mirror is the practical source.

The rebuild pipeline is `tools/build-data.py`. It needs Python with pandas,
numpy, scikit-learn and pyarrow, and it writes `fightsim/data.json` in place:

```bash
python3 -m venv .venv && ./.venv/bin/pip install pandas numpy scikit-learn pyarrow
./.venv/bin/python tools/build-data.py
npm run build:fightsim      # data.json is only inlined at build time
```

It refuses to run if `fightsim/` is missing rather than creating the folder —
after the rename it was still pointed at `fightjury/`, so it happily wrote a
correct file into a directory nobody reads and reported success.
