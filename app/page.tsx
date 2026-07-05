"use client"

import { useState, useEffect } from "react"
import affirmationsData from "../affirmations.json"
import { usePeriodTracker } from "@/hooks/use-period-tracker"
import { CycleDashboard } from "@/components/cycle-dashboard"
import { PeriodCalendar } from "@/components/period-calendar"
import { InfoView } from "@/components/info-view"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, CalendarDays, Home, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const NAME_STORAGE_KEY = "name"
// Placeholder in affirmations.json that gets swapped for the user's name.
const AFFIRMATION_NAME = "{name}"

export default function PeriodTrackerPage() {
  const [view, setView] = useState<"dashboard" | "calendar" | "info">("dashboard")
  const [affirmation, setAffirmation] = useState<string>("")
  const [name, setName] = useState<string | null>(null)
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [nameInput, setNameInput] = useState("")

  useEffect(() => {
    if (affirmationsData && affirmationsData.affirmations?.length > 0) {
      const idx = Math.floor(Math.random() * affirmationsData.affirmations.length)
      setAffirmation(affirmationsData.affirmations[idx])
    }
  }, [])

  useEffect(() => {
    const storedName = localStorage.getItem(NAME_STORAGE_KEY)
    if (storedName && storedName.trim().length > 0) {
      setName(storedName)
    } else {
      setNameDialogOpen(true)
    }
  }, [])

  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    if (trimmed.length === 0) return
    localStorage.setItem(NAME_STORAGE_KEY, trimmed)
    setName(trimmed)
    setNameDialogOpen(false)
  }

  const displayedAffirmation =
    affirmation && name
      ? affirmation.replaceAll(AFFIRMATION_NAME, name)
      : affirmation
  const {
    isLoaded,
    averageCycleLength,
    averagePeriodLength,
    togglePeriodDay,
    setAveragePeriodLength,
    isPeriodStartDay,
    isPeriodDay,
    isPredictedPeriodDay,
    isPredictedPeriodStartDay,
    isOvulationDay,
    isFertileDay,
    getNextPeriodStart,
    getPrediction,
    getDaysUntilNextPeriod,
    getCurrentCycleDay,
    getCyclePhase,
  } = usePeriodTracker()

  const prediction = getPrediction()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>What's your name?</DialogTitle>
            <DialogDescription>
              We'll use your name to personalize your daily affirmations.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName()
            }}
            placeholder="Enter your name"
            autoFocus
          />
          <DialogFooter>
            <Button onClick={handleSaveName} disabled={nameInput.trim().length === 0}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="max-w-md mx-auto pb-24">
        {/* Affirmation */}
        {name && displayedAffirmation && (
          <div className="bg-gradient-to-br from-pink-100 to-pink-50 border border-pink-200 rounded-2xl shadow p-4 my-6 text-center animate-fade-in">
            <span className="block text-lg font-semibold text-pink-700 leading-snug">
              {displayedAffirmation}
            </span>
          </div>
        )}
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">
              {view === "dashboard" ? "Cycle Tracker" : view === "calendar" ? "Calendar" : "How It Works"}
            </h1>
            {view === "calendar" && (
              <button
                onClick={() => setView("dashboard")}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close calendar"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="px-4">
          {view === "dashboard" ? (
            <CycleDashboard
              daysUntilPeriod={getDaysUntilNextPeriod()}
              currentCycleDay={getCurrentCycleDay()}
              averageCycleLength={averageCycleLength}
              nextPeriodStart={getNextPeriodStart()}
              cyclePhase={getCyclePhase()}
              isPeriodDay={isPeriodDay}
              isPeriodStartDay={isPeriodStartDay}
              isPredictedPeriodDay={isPredictedPeriodDay}
              isPredictedPeriodStartDay={isPredictedPeriodStartDay}
              isOvulationDay={isOvulationDay}
              isFertileDay={isFertileDay}
              onOpenCalendar={() => setView("calendar")}
              prediction={prediction}
            />
          ) : view === "info" ? (
            <InfoView />
          ) : (
            <div className="space-y-4">
              <PeriodCalendar
                isPeriodDay={isPeriodDay}
                isPeriodStartDay={isPeriodStartDay}
                isPredictedPeriodDay={isPredictedPeriodDay}
                isPredictedPeriodStartDay={isPredictedPeriodStartDay}
                isOvulationDay={isOvulationDay}
                isFertileDay={isFertileDay}
                onToggleDay={togglePeriodDay}
              />

              {/* Instructions */}
              <div className="bg-card rounded-xl p-4 text-sm text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">How to use:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Tap the first day of your period each cycle</li>
                  <li>Tap the same day again to undo it</li>
                  <li>The more cycles you log, the better your predictions</li>
                </ul>
                <p className="mt-3 text-xs">
                  🔒 All your data is stored only on your device and nowhere else!
                </p>
              </div>

              {/* Stats */}
              <div className="bg-card rounded-xl p-4">
                <h3 className="font-medium text-foreground mb-3">Cycle Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Avg Cycle</span>
                    <p className="font-semibold text-foreground">{averageCycleLength} days</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Period</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={averagePeriodLength}
                        onChange={(e) => setAveragePeriodLength(Number(e.target.value))}
                        className="w-16 rounded-md border border-border bg-background px-2 py-1 font-semibold text-foreground"
                      />
                      <span className="text-muted-foreground">days</span>
                    </div>
                  </div>
                  {prediction && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Regularity</span>
                        <p className="font-semibold text-foreground capitalize">{prediction.regularity}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence</span>
                        <p className={`font-semibold capitalize ${prediction.confidence === "high" ? "text-green-500" : prediction.confidence === "medium" ? "text-yellow-500" : "text-muted-foreground"}`}>{prediction.confidence}</p>
                      </div>
                    </>
                  )}
                </div>
                {prediction && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Window: {new Date(prediction.windowStart).toLocaleDateString("en", { month: "short", day: "numeric" })} – {new Date(prediction.windowEnd).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
          <div className="max-w-md mx-auto flex justify-around py-3">
            <button
              onClick={() => setView("dashboard")}
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors",
                view === "dashboard" ? "text-period" : "text-muted-foreground"
              )}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">Today</span>
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors",
                view === "calendar" ? "text-period" : "text-muted-foreground"
              )}
            >
              <CalendarDays className="w-5 h-5" />
              <span className="text-xs font-medium">Calendar</span>
            </button>
            <button
              onClick={() => setView("info")}
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors",
                view === "info" ? "text-period" : "text-muted-foreground"
              )}
            >
              <Info className="w-5 h-5" />
              <span className="text-xs font-medium">Info</span>
            </button>
          </div>
        </nav>
      </div>
    </main>
  )
}
