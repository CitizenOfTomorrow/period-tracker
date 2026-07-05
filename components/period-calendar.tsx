"use client"

import { useState } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PeriodCalendarProps {
  isPeriodDay: (date: Date) => boolean
  isPeriodStartDay: (date: Date) => boolean
  isPredictedPeriodDay: (date: Date) => boolean
  isPredictedPeriodStartDay: (date: Date) => boolean
  isOvulationDay: (date: Date) => boolean
  isFertileDay: (date: Date) => boolean
  onToggleDay: (date: Date) => void
}

export function PeriodCalendar({
  isPeriodDay,
  isPeriodStartDay,
  isPredictedPeriodDay,
  isPredictedPeriodStartDay,
  isOvulationDay,
  isFertileDay,
  onToggleDay,
}: PeriodCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"]

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevMonth}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <button
          onClick={goToToday}
          className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
        >
          {format(currentMonth, "MMMM yyyy")}
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isPeriodStart = isPeriodStartDay(day)
          const isPeriod = isPeriodDay(day)
          const isPeriodFrame = isPeriod && !isPeriodStart
          const isPredicted = !isPeriod && isPredictedPeriodDay(day)
          const isPredictedStart = isPredicted && isPredictedPeriodStartDay(day)
          const isPredictedFrame = isPredicted && !isPredictedStart
          const isOvulation = !isPeriod && !isPredicted && isOvulationDay(day)
          const isFertile = !isPeriod && !isPredicted && !isOvulation && isFertileDay(day)
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)
          const hasIndicator = isPeriod || isPredicted || isOvulation || isFertile

          return (
            <button
              key={i}
              onClick={() => onToggleDay(day)}
              className={cn(
                "relative aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all",
                !inMonth && "opacity-30",
                today && "font-bold",
                // Period start day (logged first day — solid)
                isPeriodStart &&
                  "bg-period text-white hover:bg-period/90",
                // Period frame day (auto estimated — faint)
                isPeriodFrame &&
                  "bg-period/20 text-period hover:bg-period/30",
                // Predicted next start (dashed outline)
                isPredictedStart &&
                  "border-2 border-dashed border-period text-period hover:bg-period-light",
                // Predicted frame day (faint, same as period frame)
                isPredictedFrame &&
                  "bg-period/20 text-period hover:bg-period/30",
                // Ovulation day
                isOvulation &&
                  "bg-ovulation text-white hover:bg-ovulation/90",
                // Fertile day
                isFertile &&
                  "text-fertile hover:bg-fertile-light",
                // Normal day
                !hasIndicator &&
                  "text-foreground hover:bg-muted"
              )}
            >
              {format(day, "d")}

              {/* Today marker — underline dash */}
              {today && (
                <span className="absolute bottom-0.5 w-3 h-0.5 rounded-full bg-black dark:bg-white" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-period" />
          <span className="text-muted-foreground">Period</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-black dark:bg-white" />
          <span className="text-muted-foreground">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2 border-dashed border-period" />
          <span className="text-muted-foreground">Predicted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-ovulation" />
          <span className="text-muted-foreground">Ovulation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2 border-fertile" />
          <span className="text-muted-foreground">Fertile</span>
        </div>
      </div>
    </div>
  )
}
