# Period Tracker — Prediction Logic

This document explains how the app predicts future periods, estimates cycle
length, and derives the fertile/ovulation window from a history of logged
first-day-of-period dates.

---

## What the user logs

The user taps **one date per cycle** — the first day of bleeding. That's it.
The app does everything else from that single data point per cycle.

From N logged start dates the app derives N−1 **cycle lengths**:

```
cycleLength = daysBetween(startDate[i], startDate[i+1])
```

A person with 6 logged starts gives 5 cycle lengths to work with.

---

## Step 0 — Data hygiene (runs before any stats)

Raw cycle lengths are cleaned before being used for prediction.

### Skipped-log detection

If a user forgets to log a period, the app sees one gap that is roughly
**2× (or 3×) the typical cycle length** instead of two separate cycles.
Naively averaging that in drags every future prediction later.

Detection algorithm:
1. Compute a provisional typical cycle `m` = median of plausible gaps (15–45 days). Fall back to the population prior of **29 days** if there isn't enough data yet.
2. For each observed gap `L`: compute `k = round(L / m)`.
3. If `k ≥ 2` and `L` is within ±25% of `k × m`, treat it as `k` missed cycles and **split** it into `k` synthetic cycles of length `L / k`.

This single step is the most impactful improvement over naive trackers. One
forgotten log no longer poisons months of predictions.

### Outlier exclusion

Gaps shorter than **10 days** are dropped (physiologically these are
spotting events or mis-taps, not real cycles).

### Recency window

Only the most recent **12 valid cycles** are used. This lets the model
track genuine long-term shifts (age, hormonal changes, medication) without
being dragged down by ancient history.

---

## Step 1 — Estimating the next cycle length

Once the cleaned list of recent cycles is ready, the app computes a
**recency-weighted mean** — newer cycles count more than older ones:

```
weight(i) = 0.5 ^ (age / halfLife)   // halfLife = 3 cycles
```

The newest cycle gets weight 1.0, the cycle 3 slots back gets weight 0.5,
6 slots back gets weight 0.25, and so on. This means a recent hormonal
change or life event naturally takes over the estimate within a few cycles
rather than being diluted by years of history.

### Cold start (fewer than 3 valid cycles)

With little personal data, the app blends the user's observed average with
the **population prior of 29 days** using a shrinkage estimator:

```
estimate = (n × userMean + 2 × 29) / (n + 2)
```

As more cycles accumulate the prior washes out and the estimate becomes
fully personal. This prevents wild early predictions from a single
unusually long or short cycle.

---

## Step 2 — Prediction window (uncertainty)

A single predicted date is misleading. The app also computes a **window**
using the standard deviation of recent cleaned cycles, clamped to the range
[1, 10] days:

```
windowStart = lastStart + round(mean - SD)
windowEnd   = lastStart + round(mean + SD)
```

A narrow window (SD ≈ 1–2 days) means a regular cycle; a wide window
means genuine variability and the UI reflects that honestly.

---

## Step 3 — In-cycle updating (running late)

If today is past the predicted start date, the app:

- **Widens** the prediction window (multiplies SD by 1.5)
- Sets `skippedLogSuspected = true` once the current gap reaches **1.8×**
  the typical cycle length, prompting the user to check whether they forgot
  to log a period

---

## Step 4 — Regularity classification

The app computes **Cycle Length Difference (CLD)** — the absolute
difference between consecutive cleaned cycles — and takes the median:

| Median CLD | Classification | Prediction behaviour        |
|------------|----------------|-----------------------------|
| 0–2 days   | Regular        | Narrow window, high confidence |
| 3–5 days   | Moderate       | Medium window, medium confidence |
| 5+ days    | Irregular      | Wide window, low confidence  |

---

## Period frame (display only)

The user logs **one day** (the start). The app shades approximately
`averagePeriodLength` days (default: **5 days**) after that date as the
estimated period frame. This is a display convenience — only the logged
first day is stored as data.

- **Solid red** — the logged first day
- **Faint red** — estimated frame days 2–N

---

## Ovulation and fertile window (derived estimate)

These are derived from the predicted cycle length, not from any sensor data.

```
ovulationDay  = nextPredictedStart − 14 days
fertileWindow = ovulationDay − 5  →  ovulationDay + 1
```

The **14-day luteal phase** (ovulation → next period) is the most
biologically constant part of the cycle across individuals, making it the
most reliable thing to back-calculate from. The 6-day fertile window
accounts for sperm viability (~5 days) plus egg lifespan (~1 day).

**Important caveats baked into this approach:**

- This is a calendar estimate only. True ovulation detection requires
  basal body temperature, LH strips, or hormone monitoring — none of which
  this app collects.
- For irregular cycles the window is wider and less reliable.
- **Do not use this for contraception.** Calendar-only fertile window
  estimates are well-documented to be unreliable for pregnancy prevention.

---

## Population reference values

These constants are used as priors and sanity bounds:

| Quantity       | Typical mean | Typical SD (individual) | Hard outlier bound |
|----------------|-------------|-------------------------|--------------------|
| Cycle length   | 29 days     | 3–4 days                | < 21 or > 45 days suspicious; > 90 = almost certainly a missed log |
| Period length  | 4–5 days    | ~2 days                 | > 10 days = outlier |
| Luteal phase   | 14 days     | ~2 days                 | Used for ovulation back-calculation |

---

## Sources

- Li et al., *A generative, predictive model for menstrual cycle lengths that accounts for potential self-tracking artifacts* (Columbia / Clue) — arXiv:2102.12439
- Li et al., *Characterizing physiological and symptomatic variation in menstrual cycles using self-tracked mobile health data* — arXiv:1909.11211
- Bull et al., *Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles* — npj Digital Medicine
- Oliveira et al., *Modelling menstrual cycle length in athletes using state-space models*
