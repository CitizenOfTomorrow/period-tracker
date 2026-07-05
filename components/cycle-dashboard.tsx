"use client"

import { startOfWeek, endOfWeek, eachDayOfInterval, isToday } from "date-fns"
import { Calendar, Droplets, Heart, Sparkles, Zap, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CyclePhase, PredictionWindow } from "@/hooks/use-period-tracker"
import { format } from "date-fns"

interface CycleDashboardProps {
  daysUntilPeriod: number | null
  currentCycleDay: number | null
  averageCycleLength: number
  nextPeriodStart: Date | null
  cyclePhase: CyclePhase
  isPeriodStartDay: (date: Date) => boolean
  isPeriodDay: (date: Date) => boolean
  isPredictedPeriodDay: (date: Date) => boolean
  isPredictedPeriodStartDay: (date: Date) => boolean
  isOvulationDay: (date: Date) => boolean
  isFertileDay: (date: Date) => boolean
  onOpenCalendar: () => void
  prediction?: PredictionWindow | null
}

export function CycleDashboard({
  daysUntilPeriod,
  currentCycleDay,
  averageCycleLength,
  nextPeriodStart,
  cyclePhase,
  isPeriodStartDay,
  isPeriodDay,
  isPredictedPeriodDay,
  isPredictedPeriodStartDay,
  isOvulationDay,
  isFertileDay,
  onOpenCalendar,
  prediction,
}: CycleDashboardProps) {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const weekDayNames = ["M", "T", "W", "T", "F", "S", "S"]

  // Determine current status
  const isOnPeriod = isPeriodDay(today)

  const getStatusMessage = () => {
    switch (cyclePhase) {
      case "menstrual": return "Currently on period"
      case "ovulation": return "Peak fertility today"
      case "fertile": return "High chance of pregnancy"
      case "luteal":
        return daysUntilPeriod !== null && daysUntilPeriod <= 3
          ? "Period approaching soon"
          : "Luteal phase"
      case "follicular": return "Low chance of pregnancy"
      default: return "Log a period to begin tracking"
    }
  }

  const getPhaseInfo = () => {
    switch (cyclePhase) {
      case "menstrual":
        return { phase: "Menstrual Phase", icon: Droplets, color: "text-period", description: "Your period is here" }
      case "follicular":
        return { phase: "Follicular Phase", icon: Sparkles, color: "text-blue-400", description: "Energy is rising" }
      case "ovulation":
        return { phase: "Ovulation", icon: Zap, color: "text-ovulation", description: "Peak fertility" }
      case "fertile":
        return { phase: "Fertile Window", icon: Heart, color: "text-fertile", description: "High fertility" }
      case "luteal":
        return { phase: "Luteal Phase", icon: Moon, color: "text-purple-400", description: "Winding down" }
      default:
        return { phase: "Unknown", icon: Sparkles, color: "text-muted-foreground", description: "Log a period" }
    }
  }

  const phaseInfo = getPhaseInfo()
  const PhaseIcon = phaseInfo.icon

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      {/* Top gradient section */}
      <div className="bg-gradient-to-br from-period-light to-background p-6 pb-8">
        {/* Date header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-foreground font-medium">
            {format(today, "d MMMM")}
          </div>
          <button
            onClick={onOpenCalendar}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            aria-label="Open calendar"
          >
            <Calendar className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Week strip */}
        <div className="flex justify-between">
          {weekDays.map((day, i) => {
            const isPeriodStart = isPeriodStartDay(day)
            const isPeriod = isPeriodDay(day)
            const isPeriodFrame = isPeriod && !isPeriodStart
            const isPredicted = !isPeriod && isPredictedPeriodDay(day)
            const isPredictedStart = isPredicted && isPredictedPeriodStartDay(day)
            const isPredictedFrame = isPredicted && !isPredictedStart
            const isOvulation = !isPeriod && !isPredicted && isOvulationDay(day)
            const isFertile = !isPeriod && !isPredicted && !isOvulation && isFertileDay(day)
            const dayIsToday = isToday(day)

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{weekDayNames[i]}</span>
                <div
                  className={cn(
                    "relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isPeriodStart && "bg-period text-white",
                    isPeriodFrame && "bg-period/20 text-period",
                    isPredictedStart && "border-2 border-dashed border-period text-period",
                    isPredictedFrame && "bg-period/20 text-period",
                    isOvulation && "bg-ovulation text-white",
                    isFertile && "border-2 border-fertile text-fertile",
                    !isPeriod && !isPredicted && !isOvulation && !isFertile && "text-foreground"
                  )}
                >
                  {format(day, "d")}
                  {dayIsToday && (
                    <span className="absolute bottom-0.5 w-3 h-0.5 rounded-full bg-black dark:bg-white" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main countdown */}
      <div className="px-6 py-8 text-center">
        {daysUntilPeriod !== null ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              {isOnPeriod ? "Period day" : "Period in"}
            </p>
            <p className="text-6xl font-bold text-foreground mb-2">
              {isOnPeriod ? currentCycleDay : daysUntilPeriod}
              <span className="text-2xl font-normal text-muted-foreground ml-2">
                {isOnPeriod ? `of ~${averageCycleLength}` : daysUntilPeriod === 1 ? "day" : "days"}
              </span>
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{getStatusMessage()}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              No period data yet
            </p>
            <p className="text-lg text-foreground">
              Tap the calendar to log your period days
            </p>
          </>
        )}

        {/* Log period button */}
        <button
          onClick={onOpenCalendar}
          className="mt-6 px-6 py-3 bg-period text-white rounded-full font-medium hover:bg-period/90 transition-colors"
        >
          Log Period
        </button>
      </div>

      {/* Info cards */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <PhaseIcon className={cn("w-4 h-4", phaseInfo.color)} />
            <span className="text-xs text-muted-foreground">Current Phase</span>
          </div>
          <p className="font-medium text-foreground">{phaseInfo.phase}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cycle Day</span>
          </div>
          <p className="font-medium text-foreground">
            {currentCycleDay ? `Day ${currentCycleDay}` : "--"}
          </p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Avg. Cycle</span>
          </div>
          <p className="font-medium text-foreground">{averageCycleLength} days</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Next Period</span>
          </div>
          {prediction ? (
            <div>
              <p className="font-medium text-foreground">{format(prediction.predictedStart, "MMM d")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(prediction.windowStart, "d")}–{format(prediction.windowEnd, "MMM d")}
                {" "}
                <span className={prediction.confidence === "high" ? "text-green-500" : prediction.confidence === "medium" ? "text-yellow-500" : "text-muted-foreground"}>
                  ({prediction.confidence})
                </span>
              </p>
            </div>
          ) : (
            <p className="font-medium text-foreground">--</p>
          )}
        </div>
      </div>
    </div>
  )
}
