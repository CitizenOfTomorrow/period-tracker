import type { ReactNode } from "react"
import { Sparkles, Filter, TrendingUp, Target, Repeat, Droplet, Egg, BookOpen, AlertTriangle } from "lucide-react"

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="bg-card rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-100 text-pink-600">
          {icon}
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  )
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <pre className="bg-muted rounded-lg px-3 py-2 text-xs text-foreground font-mono whitespace-pre-wrap">
      {children}
    </pre>
  )
}

export function InfoView() {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-pink-100 to-pink-50 border border-pink-200 rounded-2xl p-4">
        <h2 className="text-lg font-semibold text-pink-700">How predictions work</h2>
        <p className="text-sm text-pink-700/80 mt-1">
          You log just one date per cycle — the first day of bleeding. Everything below
          is derived from those dates.
        </p>
      </div>

      <Section icon={<Sparkles className="w-4 h-4" />} title="What you log">
        <p>
          You tap <span className="font-medium text-foreground">one date per cycle</span> —
          the first day of your period. From N logged starts, the app derives N−1 cycle
          lengths:
        </p>
        <Formula>cycleLength = daysBetween(start[i], start[i+1])</Formula>
      </Section>

      <Section icon={<Filter className="w-4 h-4" />} title="Step 0 — Data hygiene">
        <p>Raw cycle lengths are cleaned before any stats run:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <span className="font-medium text-foreground">Skipped-log detection:</span> a
            gap near 2× or 3× the typical cycle is split into synthetic cycles, so one
            forgotten log doesn&apos;t poison months of predictions.
          </li>
          <li>
            <span className="font-medium text-foreground">Outlier exclusion:</span> gaps
            shorter than 10 days are dropped as spotting or mis-taps.
          </li>
          <li>
            <span className="font-medium text-foreground">Recency window:</span> only the
            most recent 12 valid cycles are used.
          </li>
        </ul>
      </Section>

      <Section icon={<TrendingUp className="w-4 h-4" />} title="Step 1 — Next cycle length">
        <p>A recency-weighted mean gives newer cycles more influence:</p>
        <Formula>weight(i) = 0.5 ^ (age / 3)   // halfLife = 3 cycles</Formula>
        <p>
          With fewer than 3 cycles, a cold-start estimator blends your data with the
          population prior of 29 days:
        </p>
        <Formula>estimate = (n × userMean + 2 × 29) / (n + 2)</Formula>
      </Section>

      <Section icon={<Target className="w-4 h-4" />} title="Step 2 — Prediction window">
        <p>
          Instead of a single date, a window is computed from the standard deviation of
          recent cycles (clamped to 1–10 days):
        </p>
        <Formula>{`windowStart = lastStart + round(mean − SD)
windowEnd   = lastStart + round(mean + SD)`}</Formula>
        <p>A narrow window means a regular cycle; a wide one reflects real variability.</p>
      </Section>

      <Section icon={<Repeat className="w-4 h-4" />} title="Steps 3 & 4 — Late & regularity">
        <p>
          If today is past the predicted start, the window widens (SD × 1.5) and a skipped
          log is suspected once the gap reaches 1.8× the typical cycle.
        </p>
        <p>Regularity comes from the median Cycle Length Difference (CLD):</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted text-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Median CLD</th>
                <th className="px-3 py-2 text-left font-medium">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-3 py-2">0–2 days</td>
                <td className="px-3 py-2">Regular · high confidence</td>
              </tr>
              <tr>
                <td className="px-3 py-2">3–5 days</td>
                <td className="px-3 py-2">Moderate · medium confidence</td>
              </tr>
              <tr>
                <td className="px-3 py-2">5+ days</td>
                <td className="px-3 py-2">Irregular · low confidence</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={<Droplet className="w-4 h-4" />} title="Period frame (display only)">
        <p>
          Only the logged first day is stored. The app shades roughly{" "}
          <span className="font-medium text-foreground">averagePeriodLength</span> days
          (default 5) after it as an estimated frame.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <span className="font-medium text-foreground">Solid red</span> — the logged
            first day
          </li>
          <li>
            <span className="font-medium text-foreground">Faint red</span> — estimated
            frame days 2–N
          </li>
        </ul>
      </Section>

      <Section icon={<Egg className="w-4 h-4" />} title="Ovulation & fertile window">
        <p>Derived from the predicted cycle length, not from any sensor data:</p>
        <Formula>{`ovulationDay  = nextStart − 14 days
fertileWindow = ovulationDay − 5 → ovulationDay + 1`}</Formula>
        <p>
          The 14-day luteal phase is the most biologically constant part of the cycle,
          making it the most reliable thing to back-calculate from.
        </p>
        <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            This is a calendar estimate only.{" "}
            <span className="font-semibold">Do not use it for contraception</span> —
            calendar-only fertile windows are unreliable for pregnancy prevention.
          </p>
        </div>
      </Section>

      <Section icon={<BookOpen className="w-4 h-4" />} title="Sources">
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Li et al., generative predictive model for cycle lengths (Clue) — arXiv:2102.12439</li>
          <li>Li et al., physiological &amp; symptomatic variation — arXiv:1909.11211</li>
          <li>Bull et al., 600,000+ menstrual cycles — npj Digital Medicine</li>
          <li>Oliveira et al., state-space models for cycle length in athletes</li>
        </ul>
      </Section>
    </div>
  )
}
