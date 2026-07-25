# FIGHT SIM Product Brief

**Status:** Product direction  
**Research date:** 2026-07-25  
**Scope:** The static, offline FIGHT SIM artifact

## Product thesis

FIGHT SIM should become the fastest credible pre-fight read for UFC fans, not a
generic pick service.

It compares two fighters using only information available before their bouts,
runs 1,000 Monte Carlo rollouts over a calibrated logistic fit, and shows
whether the historical record separates the matchup or produces no edge. Its
value is the combination of:

- a measurable refusal instead of a forced call;
- a line-blind view that remains independent of the betting market;
- rolling-origin evaluation that does not train on a fighter's future;
- visible calibration, attribution, limitations, and out-of-distribution
  adjustments;
- an event receipt that can be committed before a card and graded afterward;
- a self-contained artifact that works offline and requires no account.

This is not marketed as AI, a prediction, a forecast, a pick, or a way to make
money. The output is a distribution.

## Audience and job to be done

The core user is a UFC fan who wants a useful read before the next fight without
assembling records, stats, forum posts, videos, and odds across many tabs.

Their job is not “tell me who will win.” It is:

> Help me understand what the historical evidence separates, what remains
> uncertain, and what is worth noticing before the bell.

The product should serve that job at three depths:

1. **Ten-second read:** the distribution, call or refusal, and plain-language
   reason.
2. **One-minute read:** the matchup factors, calibration context, and limits.
3. **Audit:** the full method, terms, holdout record, attribution, and receipt.

“Too quick” is therefore a depth and next-action problem, not a reason to add
delay, longer animation, or filler.

## Market map

The market is large and recurring, but its relevant niche should not be
overstated. TKO reports more than 700 million UFC fans, approximately 363
million social followers, and more than 40 live events per year. The American
Gaming Association reports $16.89 billion in 2025 U.S. commercial
sports-betting revenue. These are company- and industry-reported indicators of
an adjacent audience, not a measured market size for an MMA analytics tool.

| Category | Primary value | Representative products |
|---|---|---|
| Official and reference data | Records, leaders, schedules, and career statistics | [UFC Record Book](https://statleaders.ufc.com/) |
| Community and fantasy | Public reads, method and round selections, scoring, profiles, groups, and leaderboards | [Tapology](https://www.tapology.com/faq), [Verdict MMA](https://verdictmma.com/app) |
| Odds aggregation | Current prices, comparison, movement, and historical lines | [BestFightOdds](https://www.bestfightodds.com/archive), [Oddschecker](https://www.oddschecker.com/us/boxing-mma/ufc-mma) |
| Model-led products | Matchup outputs, full-card reports, explanations, subscriptions, alerts, and tracking | [FightEdge](https://www.fight-edge.com/), [Fight Detective](https://fightdetective.com/), [Next Fight](https://nextfightapp.com/) |
| Sentiment and “intelligence” bundles | Social, expert, news, and market signals combined into betting-oriented reads | [FightSignal](https://fightsignal.com/) |

The commercial pages above are useful evidence of product positioning and
feature patterns only. Their performance claims are self-published and were not
independently verified for this brief. FIGHT SIM should not repeat, compare
against, or imply conclusions about any competitor's accuracy.

Across the sampled products, common patterns include:

- the upcoming event as the recurring home rather than only an arbitrary
  matchup search;
- a free preview with full-card reports, alerts, or live context as paid depth;
- a preview → read → watch → grade → return loop;
- plain-language explanations alongside numeric output;
- public histories, receipts, or scorecards as trust signals;
- profiles, streaks, groups, and leaderboards as retention;
- broad “AI,” confidence, and betting-edge language.

FIGHT SIM should not compete by adding more of the last pattern. Its defensible
position is a precise, independent evidence check with a first-class no-edge
state.

## Positioning

### Category

**A line-blind pre-fight evidence check for UFC fans.**

### Promise

> See what the record separates—and what it does not.

### Supporting explanation

> Choose two UFC fighters. FIGHT SIM compares their pre-fight careers, runs
> 1,000 line-blind rollouts, and shows whether the historical data produces a
> meaningful lean or no edge.

### What the position excludes

- It does not promise a winner.
- It does not read or compare sportsbook lines.
- It does not infer injuries, motivation, psychology, or camp quality.
- It does not turn social conversation into win probability.
- It does not hide a weak result behind a confident label.
- It does not require registration before showing value.

The footer statement remains: **NOT A PREDICTION. A DISTRIBUTION.**

## Phase-one decisions

Phase one deepens the current artifact without changing the model, runtime
architecture, or published numbers.

### 1. Make the landing page immediately legible

- Vertically center the entry experience in the viewport.
- Lead with the promise above, then explain line-blind rollouts in one sentence.
- Put the refusal at the center of the story: a no-edge result is a useful
  answer, not a failed run.
- Make EVENT mode prominent because the UFC card is the natural recurring unit.
- Keep method detail available, but do not make it carry the landing-page copy.

### 2. Begin every result with “The short read”

The first result viewport should contain:

- which side appeared more often in the 1,000 rollouts;
- the exact call or refusal;
- one plain-language explanation of the threshold;
- the three strongest historical matchup drivers;
- one visible uncertainty or limitation;
- a next action: open the full card, inspect the evidence, export the receipt,
  or compare another matchup.

The threshold-bearing confidence should lead; the empirical rollout split
supports it. For example:

> Dong Hyun Kim · 60.8% model confidence · limited separation. The supporting
> rollout split was 630–370.

### 3. Make THE READ explain itself

The historical confidence panel should answer:

- How many held-out fights landed in this confidence band?
- What rate did the model claim?
- What rate actually occurred?
- What is the calibration gap?

It should also say:

> This checks how the confidence band behaved historically. It is not additional
> evidence about either fighter.

Isolated examples of a named fight the model got right or wrong should not lead
the explanation; they are vivid but do not establish calibration and can feel
unrelated to the current matchup. Fighter-specific holdout records remain
separate and explain their purpose: showing the average model chance beside the
actual held-out win rate without claiming that a small sample establishes a
persistent pattern.

### 4. Make search feel knowledgeable

Search should:

- normalize repeated or missing spaces, punctuation, accents, and case;
- match common display-name variations;
- support an explicit, reviewed alias table for established nicknames such as
  “Korean Zombie”;
- rank fuzzy candidates while preserving the rule that an unknown fighter is
  declined, never guessed.

Aliases improve retrieval only. They must never merge distinct fighter records.

### 5. Build a useful next step

After a matchup, the product should offer:

- **Read the card:** continue through EVENT mode;
- **Inspect the evidence:** attribution, calibration, and limits;
- **Save the receipt:** export the card and JSON;
- **Run another matchup:** return without losing the current result.

Local history or a local “My card” may use `localStorage`; it should remain
device-local and work without a network.

### 6. Do not gate the utility

Phase one does not add email capture, accounts, or a forced signup. An email
address is not useful until the project can reliably deliver a recurring
fight-week product, and identity infrastructure would expand the privacy,
security, and runtime scope.

If a hosted companion later offers a weekly card update, subscription should be
optional, requested after the user receives value, and governed by a clear
privacy policy and consent flow.

## Fight Week Context

Fight Week Context is a possible later layer for facts that changed after the
model's data cutoff. It is not a second model, an LLM opinion, or a sentiment
score.

### Product rule

> Context may change what a fan notices. It does not silently change the
> posterior.

Every context item must show that it is **not a model input**. The original
line-blind distribution, attribution, weight prior, thresholds, and receipt
remain intact.

### Provenance-first design

Context is assembled at build time and embedded into the offline artifact. The
browser performs no live fetch.

Each item should carry:

| Field | Meaning |
|---|---|
| `event_id` / `bout_id` | Stable scope |
| `kind` | Card change, weigh-in, scheduled conditions, official status, or derived record fact |
| `value` | Short normalized fact, not copied article prose |
| `as_of` | The time through which the context is complete |
| `observed_at` | When the build captured it |
| `source_name` | Human-readable publisher or authority |
| `source_url` | Direct link to the supporting page |
| `published_at` | Source publication time when available |
| `verification` | Confirmed, disputed, or unverified |
| `model_input` | Always `false` for this layer |

The user-facing panel should be titled **FACTS SINCE THE DATA CUTOFF** and show:

- a visible `AS OF` timestamp;
- three to five high-signal facts;
- source and freshness chips on every fact;
- explicit disputed or stale states;
- “No sourced update” rather than implying nothing happened.

### Allowed content

- an official bout cancellation or replacement;
- an official weigh-in result or missed weight;
- scheduled round count, venue, or other verified event condition;
- days since last fight or other facts derived reproducibly from the shipped
  record;
- a direct official announcement with a short neutral summary.

### Excluded content

- anonymous injury rumors;
- inferred mental state, body language, motivation, or camp quality;
- copied paywalled analysis;
- unattributed summaries;
- an LLM-generated “expert” view;
- betting line movement presented as fact about a fighter;
- any context silently blended into the current posterior.

If sources conflict, show the conflict. If provenance is unavailable, omit the
item.

## Why live sentiment is later and separate

Adding X, Reddit, media, forums, and video analysis would change FIGHT SIM from a
static artifact into a hosted data operation with recurring cost, platform
agreements, deletion handling, source monitoring, storage, and moderation.

The current platform facts are material:

- [X documents pay-per-use API pricing](https://docs.x.com/x-api/getting-started/pricing),
  including a per-resource charge for post reads.
- [Reddit's Data API Terms](https://redditinc.com/policies/data-api-terms)
  require a separate agreement for commercial use, restrict retention and reuse,
  require privacy disclosure, and do not grant permission to train an AI or
  machine-learning model on user content without rightsholder permission.

The methodology is also not settled enough to label sentiment as fight
intelligence:

- A [systematic review of social media in gambling
  research](https://pure.port.ac.uk/ws/portalfiles/portal/27678721/The_Use_of_Social_Media.pdf)
  describes promising but inconsistent findings, notes context and timing
  effects, and calls for replication.
- [Research indexed by ACL
  Anthology](https://aclanthology.org/L14-1527/) documents sarcasm as a material
  complication for automated sentiment polarity.

For MMA, a raw social share can reflect fame, recency, language, repeated
posters, campaigning, sarcasm, or attention rather than evidence about a bout.
It must not be labeled win probability.

If a crowd layer is later tested, it should:

- be titled **CROWD CONVERSATION**, not intelligence or probability;
- stay visually and computationally separate from the model;
- show source mix, time window, language coverage, unique-author methodology,
  raw sample size, and missing-data warnings;
- link to representative sources rather than inventing an authoritative
  synthesis;
- freeze before the bout and keep a dated receipt;
- be evaluated prospectively before any outcome claim is made.

Any experiment that feeds sentiment into an outcome model would be a separately
versioned research project requiring rolling-origin evaluation, ablation,
recalibration, and regeneration of every published metric. It is outside this
product brief.

A more defensible first-party alternative is an optional fan read collected
before the model is revealed: fighter A, no edge, or fighter B, plus confidence.
If accounts are ever added, that dataset should be opt-in, timestamped,
deduplicated, aggregated only above a minimum sample, and never include wager
amounts.

## Measurement loop

The goal is comprehension, useful depth, trust, and return for the next event.
It is not maximum time on page, maximum confidence, or fewer refusals.

### Core questions

After using the product, can a fan correctly explain:

- which side the distribution leaned toward;
- whether FIGHT SIM called or declined the matchup;
- why a confidence-band history is shown;
- which factors drove the result;
- what the model does not know;
- what they can do next?

### Product signals

If a privacy-bounded hosted measurement layer is later authorized, measure:

- matchup and EVENT-mode completion;
- whether users continue to a second fight;
- evidence-panel opens;
- card and JSON receipt exports;
- returns for the next event;
- voluntary weekly-update subscription after value is delivered.

Do not optimize the share of matchups called. A rising call rate can mean the
refusal has been weakened.

### Release loop

1. Watch fans use the current build without coaching.
2. Record where language, hierarchy, or next actions fail.
3. Change the smallest copy or layout unit that addresses the failure.
4. Rebuild and run the functional and visual regression suites.
5. Commit the pre-card event receipt.
6. Grade it after the event and publish the unchanged record.
7. Use observed confusion and return behavior—not a desired accuracy
   headline—to select the next improvement.

The offline artifact should not add hidden telemetry. Qualitative usability
sessions and the existing ledger can support phase one without expanding the
runtime boundary.

## Claims and safety guardrails

- Every number on screen must come from the reproducible build.
- Accuracy, refusal rate, realized refusal rate, Brier score, ECE, sample size,
  and evaluation method remain separately labeled.
- Do not use “win,” “profit,” “beat the odds,” “smart money,” “risk-free,” or
  similar outcome or earnings promises in product marketing.
- A disclaimer does not repair misleading primary copy. The
  [FTC advertising substantiation
  policy](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)
  requires a reasonable basis for objective and implied claims before they are
  published.
- If future marketing explicitly addresses wagering, follow applicable
  requirements and responsible-marketing principles. The
  [AGA Responsible Marketing Code](https://www.americangaming.org/marketing-code/)
  includes 21+ audience protections and rejects guaranteed-success and
  “risk-free” framing.
- Do not claim that a named or implied competitor uses a flawed method.
- Do not compare performance figures without comparable inclusion rules,
  time-based splits, market inputs, abstentions, and units of evaluation.
- Keep UFC/Zuffa non-affiliation visible.

## Source notes

Market and product pages were reviewed on 2026-07-25:

- [TKO: UFC audience and event cadence](https://investor.tkogrp.com/news/news-details/2026/UFC-Freedom-250-Delivers-34-Million-Total-Global-Viewers/default.aspx)
- [American Gaming Association: State of the States 2026](https://www.americangaming.org/resources/state-of-the-states-2026/)
- [UFC Record Book](https://statleaders.ufc.com/)
- [Tapology FAQ](https://www.tapology.com/faq)
- [Verdict MMA](https://verdictmma.com/app)
- [BestFightOdds archive](https://www.bestfightodds.com/archive)
- [Oddschecker UFC](https://www.oddschecker.com/us/boxing-mma/ufc-mma)
- [FightEdge](https://www.fight-edge.com/)
- [Fight Detective](https://fightdetective.com/)
- [Next Fight](https://nextfightapp.com/)
- [FightSignal](https://fightsignal.com/)
- [X API pricing](https://docs.x.com/x-api/getting-started/pricing)
- [Reddit Data API Terms](https://redditinc.com/policies/data-api-terms)
- [Social media and gambling research review](https://pure.port.ac.uk/ws/portalfiles/portal/27678721/The_Use_of_Social_Media.pdf)
- [ACL Anthology: sarcasm and sentiment analysis](https://aclanthology.org/L14-1527/)
- [FTC advertising substantiation policy](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)
- [AGA Responsible Marketing Code](https://www.americangaming.org/marketing-code/)
