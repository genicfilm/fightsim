# CLAUDE.md

See **[AGENTS.md](AGENTS.md)** — the working contract for this repo: build and
test commands, the boundary between UI and model, the DOM contract, the
invariants the suite enforces, the numbers the UI is allowed to print, and the
palette rationale.

Deep documentation of the model itself is in **[receipts/README.md](receipts/README.md)**.

Quick reference:

```bash
python3 tools/build-data.py  # regenerates data.json + tools/metrics.txt (needs pandas/sklearn)
npm run build:receipts   # receipts/index.html + data.json + fonts -> MMAReceipts.html
npm test                 # 83 assertions over file:// — must be green before you ship
npm run shots            # 10 screens vs tools/baseline/ — catches what npm test cannot
node tools/ledger.mjs    # grade ledger/*.json -> ledger/README.md
```

Edit `receipts/index.html`, never `receipts/MMAReceipts.html` (generated).

**Run both suites from WSL bash, never from Windows.** `tools/chromium-path.mjs`
falls back to system Chrome/Edge there, which rasterises through DirectWrite
instead of the Playwright binary's FreeType — every screen goes red for no real
reason, and `shots:update` on that run corrupts the committed baselines.

**No figure may appear on screen that `tools/build-data.py` does not print.** It
writes `tools/metrics.txt`; the block labelled *THE NUMBERS THE UI IS ALLOWED TO
PRINT* is the source of truth, and `npm test` asserts both that every published
figure is still present and that no retired one has come back. Two numbers were
published for months that the pipeline never computed — that is the failure this
guard exists to prevent.

**Never make a claim about a competitor.** State the mechanism, never the
accusation.
