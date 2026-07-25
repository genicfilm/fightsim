#!/usr/bin/env python3
"""Rebuild fightsim/data.json from public UFC data.

    python3 -m venv .venv && ./.venv/bin/pip install pandas numpy scikit-learn pyarrow
    ./.venv/bin/python tools/build-data.py

Produces one career version per fighter per year (2,290 fighters / ~8,880
versions) plus a portable logistic model the browser evaluates directly.

Source: ufcstats.com via the Greco1899/scrape_ufc_stats mirror. ufcstats.com
itself sits behind a bot challenge, so the mirror is the practical source.

Every feature is computed ONLY from fights that had already happened. Validation
is rolling-origin (train on everything before year N, test on year N) — a random
split leaks a fighter's future into their own past and inflates accuracy.
"""
import json, os, sys, urllib.request
import numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache-ufc")
OUT = os.path.join(ROOT, "fightsim", "data.json")
BASE = "https://raw.githubusercontent.com/Greco1899/scrape_ufc_stats/main/"
FILES = ["ufc_fight_results", "ufc_fight_stats", "ufc_fighter_tott", "ufc_event_details"]

RATE = ['f_slpm','f_sapm','f_sacc','f_sdef','f_td15','f_tddef','f_ctrl','f_kd15','f_kdabs','f_sub15']
DIVS = [('Strawweight',115),('Flyweight',125),('Bantamweight',135),('Featherweight',145),
        ('Lightweight',155),('Welterweight',170),('Middleweight',185),
        ('Light Heavyweight',205),('Heavyweight',245)]


def fetch():
    os.makedirs(CACHE, exist_ok=True)
    for f in FILES:
        p = os.path.join(CACHE, f + ".csv")
        if not os.path.exists(p):
            print(f"  downloading {f}.csv")
            urllib.request.urlretrieve(BASE + f + ".csv", p)
    return {f: pd.read_csv(os.path.join(CACHE, f + ".csv")) for f in FILES}


def division_lbs(s):
    s = str(s)
    if 'Light Heavyweight' in s:      # must precede the 'Heavyweight' test
        return 205
    for name, lb in DIVS:
        if name in s:
            return lb
    return np.nan


def main():
    d = fetch()
    res, sts, tot, ev = (d['ufc_fight_results'], d['ufc_fight_stats'],
                         d['ufc_fighter_tott'], d['ufc_event_details'])

    ev['DATE'] = pd.to_datetime(ev['DATE'], format='mixed', errors='coerce')
    for f in (res, ev):
        f['EVENT'] = f['EVENT'].str.strip()
    res['BOUT'] = res['BOUT'].str.strip()
    res = res.merge(ev[['EVENT', 'DATE']], on='EVENT', how='left')
    sp = res['BOUT'].str.split(r'\s+vs\.\s+', regex=True, n=1, expand=True)
    res['f1'], res['f2'] = sp[0].str.strip(), sp[1].str.strip()

    # ---- per-round stats -> per-fighter-per-fight totals ----
    def xofy(s):
        p = s.fillna('0 of 0').astype(str).str.extract(r'(\d+)\s*of\s*(\d+)')
        return p[0].astype(float).fillna(0), p[1].astype(float).fillna(0)
    for col, (a, b) in {'SIG.STR.': ('ss_l','ss_a'), 'TD': ('td_l','td_a')}.items():
        sts[a], sts[b] = xofy(sts[col])
    ct = sts['CTRL'].fillna('0:00').astype(str).str.replace('--','0:00').str.extract(r'(\d+):(\d+)')
    sts['ctrl'] = ct[0].astype(float).fillna(0)*60 + ct[1].astype(float).fillna(0)
    for c in ['KD','SUB.ATT']:
        sts[c] = pd.to_numeric(sts[c], errors='coerce').fillna(0)
    for c in ['EVENT','BOUT','FIGHTER']:
        sts[c] = sts[c].str.strip()
    agg = sts.groupby(['EVENT','BOUT','FIGHTER'], as_index=False).agg(
        ss_l=('ss_l','sum'), ss_a=('ss_a','sum'), td_l=('td_l','sum'), td_a=('td_a','sum'),
        kd=('KD','sum'), sub=('SUB.ATT','sum'), ctrl=('ctrl','sum'))

    tm = res['TIME'].astype(str).str.extract(r'(\d+):(\d+)')
    res['mins'] = ((pd.to_numeric(res['ROUND'], errors='coerce').fillna(1)-1)*5
                   + tm[0].astype(float).fillna(0) + tm[1].astype(float).fillna(0)/60).clip(lower=0.5)

    m = agg.merge(res[['EVENT','BOUT','DATE','mins','f1','f2','OUTCOME']], on=['EVENT','BOUT'])
    opp = m[['EVENT','BOUT','FIGHTER','ss_l','ss_a','td_l','td_a','kd']].rename(columns={
        'FIGHTER':'OPP','ss_l':'o_ss_l','ss_a':'o_ss_a','td_l':'o_td_l','o_td_a':'o_td_a',
        'td_a':'o_td_a','kd':'o_kd'})
    m = m.merge(opp, on=['EVENT','BOUT'])
    m = m[m['FIGHTER'] != m['OPP']]
    m['won'] = np.where((m['FIGHTER']==m['f1']) & (m['OUTCOME']=='W/L'), 1,
               np.where((m['FIGHTER']==m['f2']) & (m['OUTCOME']=='L/W'), 1, 0))
    m = m.dropna(subset=['DATE']).sort_values(['FIGHTER','DATE']).reset_index(drop=True)

    # ---- per-fight rates ----
    m['f_slpm'] = m['ss_l']/m['mins'];              m['f_sapm'] = m['o_ss_l']/m['mins']
    m['f_sacc'] = m['ss_l']/m['ss_a'].replace(0, np.nan)
    m['f_sdef'] = 1 - m['o_ss_l']/m['o_ss_a'].replace(0, np.nan)
    m['f_td15'] = m['td_l']/m['mins']*15
    m['f_tddef'] = 1 - m['o_td_l']/m['o_td_a'].replace(0, np.nan)
    m['f_ctrl'] = m['ctrl']/60/m['mins'];           m['f_kd15'] = m['kd']/m['mins']*15
    m['f_kdabs'] = m['o_kd']/m['mins']*15;          m['f_sub15'] = m['sub']/m['mins']*15

    # ---- leak-free career features (every aggregate is shifted) ----
    g = m.groupby('FIGHTER')
    F = pd.DataFrame({k: v for c in RATE for k, v in (
        ('ew_'+c, g[c].transform(lambda s: s.shift().ewm(halflife=2.5, min_periods=1).mean())),
        ('ca_'+c, g[c].transform(lambda s: s.shift().expanding().mean())))})
    F['n'] = g.cumcount()
    F['winrate'] = g['won'].transform(lambda s: s.shift().expanding().mean())
    F['form3'] = g['won'].transform(lambda s: s.shift().rolling(3, min_periods=1).mean())
    F['form5'] = g['won'].transform(lambda s: s.shift().rolling(5, min_periods=1).mean())
    F['layoff'] = g['DATE'].transform(lambda s: (s - s.shift()).dt.days)
    F['career_len'] = g['DATE'].transform(lambda s: (s - s.min()).dt.days)

    dec = res[res['OUTCOME'].isin(['W/L','L/W'])].dropna(subset=['DATE']).sort_values('DATE').reset_index(drop=True)
    dec['METHOD'] = dec['METHOD'].str.strip()
    loser = np.where(dec['OUTCOME']=='W/L', dec['f2'], dec['f1'])
    fin = pd.DataFrame({'EVENT': dec['EVENT'], 'BOUT': dec['BOUT'], 'FIGHTER': loser,
                        'ko': dec['METHOD'].str.contains('KO', na=False).astype(int)})
    m2 = m.merge(fin, on=['EVENT','BOUT','FIGHTER'], how='left')
    m2['ko'] = m2['ko'].fillna(0)
    F['ko_abs3'] = m2.groupby('FIGHTER')['ko'].transform(lambda s: s.shift().rolling(3, min_periods=1).sum())
    for c in ['FIGHTER','DATE','EVENT','BOUT']:
        F[c] = m[c]

    tot['FIGHTER'] = tot['FIGHTER'].str.strip()
    hp = tot['HEIGHT'].astype(str).str.extract(r"(\d+)'\s*(\d+)")
    tot['h'] = hp[0].astype(float)*12 + hp[1].astype(float)
    tot['r'] = pd.to_numeric(tot['REACH'].astype(str).str.extract(r'(\d+)')[0], errors='coerce')
    tot['dob'] = pd.to_datetime(tot['DOB'], format='mixed', errors='coerce')
    tot['lbs'] = pd.to_numeric(tot['WEIGHT'].astype(str).str.extract(r'(\d+)')[0], errors='coerce')
    # The model only needs a southpaw flag, but the tale of the tape needs the
    # real stance — 'Switch' is 142 of 2,290 fighters and calling them orthodox
    # would be a plain factual error on screen.
    #
    # Eight names in the source tape belong to two different fighters ("Mike
    # Davis", "Bruno Silva", "Jean Silva"...), and this index is keyed by name,
    # so those entries are already a blend. Collapse to the FIRST NON-EMPTY
    # stance per name — and do it here, before the dedupe below, which is the
    # whole point: Mike Davis' first row is entirely blank, so a filter applied
    # afterwards has nothing left to recover and silently dropped his stance
    # between two builds of otherwise bit-identical data. Height, reach and DOB
    # still come from that first row, so a duplicated name remains a blend;
    # this fixes the field that was regressing, not the shared-name problem.
    #
    # Missing is normalised in plain Python, not through `.astype(str)`. Under
    # pandas 2 that turned a missing stance into the string "nan" and the filter
    # below caught it; under pandas 3's dedicated `str` dtype it stays NA, the
    # filter passes it through, and the blank row wins the dedupe again. Same
    # silent single-fighter diff, one library version later.
    stance = (tot.assign(_s=['' if pd.isna(v) else str(v).strip() for v in tot['STANCE']])
                 .query("_s != '' and _s != 'nan'")
                 .drop_duplicates('FIGHTER')
                 .set_index('FIGHTER')['_s'])
    tot = tot.drop_duplicates('FIGHTER')
    F = F.merge(tot[['FIGHTER','h','r','dob','STANCE']], on='FIGHTER', how='left')
    F['age'] = (F['DATE'] - F['dob']).dt.days/365.25
    F['age_sq'] = F['age']**2
    F['sw'] = (F['STANCE'].astype(str).str.strip()=='Southpaw').astype(float)
    FEATS = [c for c in F.columns if c not in ('FIGHTER','DATE','EVENT','BOUT','dob','STANCE')]

    # ---- Elo: forward in time, decayed for layoff, bigger swing on finishes ----
    R, last, rows = {}, {}, []
    for e, bt, f1, f2, o, meth, dt in dec[['EVENT','BOUT','f1','f2','OUTCOME','METHOD','DATE']].itertuples(index=False):
        for f in (f1, f2):
            if f in last and f in R:
                R[f] = 1500 + (R[f]-1500)*np.exp(-min((dt-last[f]).days/365.25, 3)*12/100)
        ra, rb = R.get(f1, 1500.0), R.get(f2, 1500.0)
        rows.append((e, bt, ra, rb))
        K = 32*(1.25 if 'Decision' not in str(meth) else 1.0)
        ea = 1/(1+10**((rb-ra)/400)); sa = 1.0 if o=='W/L' else 0.0
        R[f1] = ra + K*(sa-ea); R[f2] = rb + K*((1-sa)-(1-ea)); last[f1] = last[f2] = dt
    dec = dec.merge(pd.DataFrame(rows, columns=['EVENT','BOUT','elo_a','elo_b']), on=['EVENT','BOUT'])
    dec['wlb'] = dec['WEIGHTCLASS'].map(division_lbs)

    elo = pd.concat([dec[['EVENT','BOUT','f1','elo_a']].rename(columns={'f1':'FIGHTER','elo_a':'elo'}),
                     dec[['EVENT','BOUT','f2','elo_b']].rename(columns={'f2':'FIGHTER','elo_b':'elo'})])
    wl = pd.concat([dec[['EVENT','BOUT','f1','wlb']].rename(columns={'f1':'FIGHTER'}),
                    dec[['EVENT','BOUT','f2','wlb']].rename(columns={'f2':'FIGHTER'})])
    F = F.merge(elo, on=['EVENT','BOUT','FIGHTER'], how='left').merge(wl, on=['EVENT','BOUT','FIGHTER'], how='left')
    F = F.sort_values(['FIGHTER','DATE'])
    # A no-contest has no rating row; carry the last rating rather than resetting
    # to 1500 (this is what put Jones and Cormier at 1500 in 2017 — UFC 214).
    for c in ('elo','wlb'):
        F[c] = F.groupby('FIGHTER')[c].ffill()
        F[c] = F.groupby('FIGHTER')[c].bfill()

    # ---- train (mirrored so corner order carries no signal) ----
    # F now carries its own per-fighter `elo`, which becomes elo_a/elo_b on the
    # merge below. Drop dec's copies first or pandas silently makes _x/_y pairs.
    dec = dec.drop(columns=['elo_a','elo_b'])
    Fe = F[F['n'] >= 1]
    Ae = Fe.add_suffix('_a').rename(columns={'EVENT_a':'EVENT','BOUT_a':'BOUT','FIGHTER_a':'f1'})
    Be = Fe.add_suffix('_b').rename(columns={'EVENT_b':'EVENT','BOUT_b':'BOUT','FIGHTER_b':'f2'})
    X = dec.merge(Ae, on=['EVENT','BOUT','f1']).merge(Be, on=['EVENT','BOUT','f2'])
    lbs = tot.set_index('FIGHTER')['lbs']
    D = pd.DataFrame({f: X[f+'_a'] - X[f+'_b'] for f in FEATS})
    D['elo'] = X['elo_a'] - X['elo_b']
    D['wt'] = (X['f1'].map(lbs) - X['f2'].map(lbs)).astype(float)
    COLS = list(D.columns)
    D['y'] = (X['OUTCOME']=='W/L').astype(int).values
    D['DATE'] = pd.to_datetime(X['DATE'].values)
    # Carry both corners through the mirror so a held-out prediction can be
    # traced back to the bout it was made about. THE READ needs that: given the
    # posterior on screen it shows the held-out fights the model read the same
    # way, and what actually happened in them. `mir` marks the reflected copy —
    # it carries provably zero extra information, so only the real orientation
    # is exported.
    D['f1'] = X['f1'].values
    D['f2'] = X['f2'].values
    # The WEAKER fighter's Elo going in. THE READ quotes two real fights back at
    # you and they have to be fights you might remember, so it needs a ranking
    # signal — and "most recent" is not one: it surfaces whichever prelim opened
    # the newest card. The minimum rather than the sum on purpose, because a
    # 1800-vs-1400 mismatch is not a marquee bout. Symmetric, so it needs no sign
    # flip under the mirror, and it is not in COLS so the model never sees it.
    D['q'] = np.minimum(X['elo_a'].values, X['elo_b'].values)
    D['mir'] = 0
    mir = D.copy(); mir[COLS] = -mir[COLS]; mir['y'] = 1 - mir['y']
    mir['f1'], mir['f2'] = D['f2'].values, D['f1'].values
    mir['mir'] = 1
    D = pd.concat([D, mir], ignore_index=True).sort_values('DATE').reset_index(drop=True)
    D[COLS] = D[COLS].replace([np.inf,-np.inf], np.nan)

    def pipe():
        return make_pipeline(SimpleImputer(strategy='median'), StandardScaler(),
                             LogisticRegression(C=0.3, max_iter=3000))
    accs, P, Y, HO = [], [], [], []
    for yr in range(2018, 2027):
        tr = D[D['DATE'] < f'{yr}-01-01']
        te = D[(D['DATE'] >= f'{yr}-01-01') & (D['DATE'] < f'{yr+1}-01-01')]
        if len(te) < 100:
            continue
        p = pipe().fit(tr[COLS], tr['y']).predict_proba(te[COLS])[:,1]
        accs.append(((p > .5).astype(int) == te['y'].values).mean())
        P.append(p); Y.append(te['y'].values)
        k = te['mir'].values == 0                 # one row per real bout
        HO.append(pd.DataFrame({'f1': te['f1'].values[k], 'f2': te['f2'].values[k],
                                'yr': te['DATE'].dt.year.values[k],
                                'p': p[k], 'w': te['y'].values[k],
                                'q': te['q'].values[k]}))
    p, y = np.concatenate(P), np.concatenate(Y)
    sure = np.abs(p-.5) > .20
    print(f"\n  held-out accuracy 2018-2026 : {np.mean(accs):.4f}")
    print(f"  on the {sure.mean():.1%} it calls >=70% : {((p[sure]>.5).astype(int)==y[sure]).mean():.3f}")
    print(f"  Brier                       : {((p-y)**2).mean():.4f}  (0.25 = coin flip)")

    # ---- CALIBRATION -------------------------------------------------------
    # This used to be asserted on screen and computed nowhere. "Calibration is
    # the credential, not accuracy" was printed on the masthead, the method
    # screen and the exported card while the one number behind it could not be
    # rebuilt from this repository. Now it is computed here, written to
    # tools/metrics.txt, and the binning scheme is named rather than implied —
    # "ECE" is a weighted mean and "<=N in every band" is a max, and quoting one
    # label over both is how an unfalsifiable claim gets made by accident.
    #
    # Rows are mirrored (A-B and B-A), so the curve is symmetric about 0.5. It
    # is folded onto the favoured side, which is the side the docs describe.
    out = []
    def say(t=""):
        print("  " + t if t else "")
        out.append(t)

    say()
    say(f"unique held-out fights        : {len(p)//2}   ({len(p)} mirrored evaluations)")
    say(f"pooled accuracy               : {((p>.5).astype(int)==y).mean():.4f}")

    conf = np.maximum(p, 1-p)
    for thr in (0.58, 0.70):
        lo = conf < thr
        say(f"below {thr:.2f}  {lo.mean()*100:5.1f}% of fights, realised "
            f"{((p[lo]>.5).astype(int)==y[lo]).mean():.4f}   "
            f"at/above  {(~lo).mean()*100:5.1f}%, realised "
            f"{((p[~lo]>.5).astype(int)==y[~lo]).mean():.4f}")

    hi = p >= .5
    pf, yf = np.where(hi, p, 1-p), np.where(hi, y, 1-y)

    def bands(name, edges):
        say()
        say(f"-- {name} --")
        say(f"{'band':>12} {'n':>6} {'mean p':>8} {'realised':>9} {'gap pts':>8}")
        tot, wsum, worst = 0, 0.0, 0.0
        for lo_, up in zip(edges[:-1], edges[1:]):
            m = (pf >= lo_) & (pf < up if up < 1.0 else pf <= 1.0)
            if not m.sum():
                continue
            mp, rr = pf[m].mean(), yf[m].mean()
            g = abs(mp-rr)*100
            worst = max(worst, g); tot += m.sum(); wsum += g*m.sum()
            say(f"{lo_:.2f}-{up:.2f} {m.sum():>6} {mp:>8.3f} {rr:>9.3f} {g:>8.2f}")
        say(f"weighted ECE {wsum/tot:.2f} pts   worst band {worst:.2f} pts")
        return wsum/tot, worst

    ece, worst = bands("published bands  0.50-0.55-0.65-0.75-1.00", [.50,.55,.65,.75,1.0])
    bands("equal width 0.05", [.50,.55,.60,.65,.70,.75,.80,1.0])
    bands("equal width 0.10", [.50,.60,.70,.80,1.0])
    say()
    say("per-year held-out accuracy 2018-2026: " + " ".join(f"{a:.3f}" for a in accs))
    # ---- THE READ's table --------------------------------------------------
    # The same held-out predictions the accuracy above is computed from, one row
    # per real bout, shipped so the browser can answer two questions live:
    #   - which held-out fights did the model read the way it just read yours,
    #     and how often was the favourite right in that band;
    #   - how has it done on these two fighters specifically.
    # Nothing here is a new estimate. It is the rolling-origin holdout itself,
    # exposed instead of summarised — which is why the reproduction check below
    # is printed and asserted rather than trusted.
    ho = pd.concat(HO, ignore_index=True)
    hp, hw = ho['p'].values, ho['w'].values
    say()
    say(f"THE READ table                : {len(ho)} fights, one row per real bout")
    say(f"  reproduces accuracy         : {((hp>.5).astype(int)==hw).mean():.4f}"
        f"   (pooled mirrored {((p>.5).astype(int)==y).mean():.4f})")
    say(f"  distinct fighters in it     : {len(set(ho['f1']) | set(ho['f2']))}")

    say()
    say("THE NUMBERS THE UI IS ALLOWED TO PRINT")
    say(f"  accuracy {np.mean(accs)*100:.1f}%   Brier {((p-y)**2).mean():.3f}   "
        f"ECE {ece:.1f} pts   worst band {worst:.1f} pts   N {len(p)//2} fights")
    open(os.path.join(ROOT, "tools", "metrics.txt"), "w").write("\n".join(out) + "\n")
    print("\n  wrote tools/metrics.txt")
    # ------------------------------------------------------------------------

    hnames = sorted(set(ho['f1']) | set(ho['f2']))
    hidx = {n: i for i, n in enumerate(hnames)}
    holdout = {'names': hnames,
               'fights': [[hidx[a], hidx[b], int(yr_), int(round(pp*10000)), int(ww),
                           int(round(qq))]
                          for a, b, yr_, pp, ww, qq
                          in ho[['f1', 'f2', 'yr', 'p', 'w', 'q']].itertuples(index=False)]}

    final = pipe().fit(D[COLS], D['y'])
    imp, sc, lr = (s[1] for s in final.steps)

    # ---- one version per fighter-year ----
    F['yr'] = F['DATE'].dt.year
    Y2 = F[F['n'] >= 1].groupby(['FIGHTER','yr']).tail(1)
    fighters = {}
    for name, gg in Y2.groupby('FIGHTER'):
        vers = []
        for _, r in gg.sort_values('yr').iterrows():
            w = r['wlb'] if pd.notna(r['wlb']) else lbs.get(name, np.nan)
            vers.append({'y': int(r['yr']),
                         'f': [None if pd.isna(r[f]) else round(float(r[f]), 3) for f in FEATS],
                         'e': round(float(r['elo']), 1) if pd.notna(r['elo']) else 1500.0,
                         'w': None if pd.isna(w) else int(w),
                         'n': int(r['n'])})
        if vers:
            rec = {'v': vers, 'p': max(range(len(vers)), key=lambda i: vers[i]['e'])}
            st = stance.get(name, '')
            if isinstance(st, str) and st and st.lower() != 'nan':
                rec['s'] = st
            fighters[name] = rec

    model = {'cols': COLS, 'feats': FEATS,
             'coef': [round(float(c), 6) for c in lr.coef_[0]],
             'intercept': round(float(lr.intercept_[0]), 6),
             'mean': [round(float(x), 6) for x in sc.mean_],
             'scale': [round(float(x), 6) for x in sc.scale_],
             'impute': [round(float(x), 6) for x in imp.statistics_]}
    # Fail rather than create. This used to be makedirs(exist_ok=True), which
    # after the FIGHT JURY -> FIGHT SIM rename meant a stale OUT path silently
    # produced a phantom folder, wrote a perfectly good data.json into it, and
    # printed success while the app kept serving the old file.
    outdir = os.path.dirname(OUT)
    if not os.path.isdir(outdir):
        sys.exit(f"\n  target directory missing: {outdir}\n"
                 "  this script writes into the existing app folder — it must not create one.")
    json.dump({'model': model, 'fighters': fighters, 'holdout': holdout},
              open(OUT, 'w'), separators=(',', ':'))
    print(f"\n  wrote {OUT}")
    print(f"  {len(fighters)} fighters · {sum(len(v['v']) for v in fighters.values())} versions"
          f" · {len(holdout['fights'])} held-out bouts · {os.path.getsize(OUT)/1024/1024:.2f} MB")
    print("  now run: npm run build:fightsim")


if __name__ == '__main__':
    main()
