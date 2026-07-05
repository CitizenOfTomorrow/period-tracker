"use client"

import { useState, useEffect, useCallback } from "react"
import {
  addDays,
  differenceInDays,
  startOfDay,
  isSameDay,
  isWithinInterval,
  parseISO,
  format,
} from "date-fns"

export type CyclePhase = "menstrual" | "follicular" | "fertile" | "ovulation" | "luteal" | "unknown"
export type Confidence = "high" | "medium" | "low"
export type Regularity = "regular" | "moderate" | "irregular"

export interface PeriodEntry {
  startDate: string
  endDate: string
}

export interface PredictionWindow {
  predictedStart: Date
  windowStart: Date
  windowEnd: Date
  predictedCycleLength: number
  confidence: Confidence
  regularity: Regularity
  skippedLogSuspected: boolean
}

interface PeriodData {
  periods: PeriodEntry[]
  averageCycleLength: number
  averagePeriodLength: number
}

const STORAGE_KEY = "period-tracker-data"
const POPULATION_CYCLE = 29
const POPULATION_PERIOD = 5
const MIN_CYCLE = 10
const MAX_PLAUSIBLE_CYCLE = 45
const SKIPPED_TOLERANCE = 0.25

function medianOf(arr: number[]): number {
  if (arr.length === 0) return POPULATION_CYCLE
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = arr.reduce((a, b) => a + b, 0) / arr.length
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length)
}

function toCycleLengths(startDates: Date[]): number[] {
  const sorted = [...startDates].sort((a, b) => a.getTime() - b.getTime())
  const lengths: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    lengths.push(differenceInDays(sorted[i], sorted[i - 1]))
  }
  return lengths
}

function repairSkippedLogs(raw: number[]): number[] {
  const plausible = raw.filter(l => l >= MIN_CYCLE && l <= MAX_PLAUSIBLE_CYCLE)
  const m = plausible.length >= 2 ? medianOf(plausible) : POPULATION_CYCLE
  const result: number[] = []
  for (const L of raw) {
    const k = Math.round(L / m)
    if (k >= 2 && Math.abs(L - k * m) <= k * SKIPPED_TOLERANCE * m) {
      for (let i = 0; i < k; i++) result.push(L / k)
    } else {
      result.push(L)
    }
  }
  return result
}

function excludeOutliers(cycles: number[]): number[] {
  return cycles.filter(l => l >= MIN_CYCLE)
}

function weightedCycleLength(cycles: number[], halfLife = 3): number {
  const n = cycles.length
  let wSum = 0, cSum = 0
  for (let i = 0; i < n; i++) {
    const age = (n - 1) - i
    const w = Math.pow(0.5, age / halfLife)
    wSum += w
    cSum += w * cycles[i]
  }
  return cSum / wSum
}

function clampSd(sd: number): number {
  return Math.min(Math.max(sd, 1.0), 10)
}

function consecutiveDiffs(cycles: number[]): number[] {
  const diffs: number[] = []
  for (let i = 1; i < cycles.length; i++) {
    diffs.push(Math.abs(cycles[i] - cycles[i - 1]))
  }
  return diffs
}

function classifyRegularity(cycles: number[]): Regularity {
  if (cycles.length < 2) return "moderate"
  const cld = medianOf(consecutiveDiffs(cycles))
  if (cld <= 2) return "regular"
  if (cld <= 5) return "moderate"
  return "irregular"
}

function coldStartEstimate(userCycles: number[]): number {
  const k = 2
  const n = userCycles.length
  if (n === 0) return POPULATION_CYCLE
  const userMean = userCycles.reduce((a, b) => a + b, 0) / n
  return (n * userMean + k * POPULATION_CYCLE) / (n + k)
}

function predictNextPeriod(sortedStarts: Date[], lastStart: Date): PredictionWindow {
  const raw = toCycleLengths(sortedStarts)
  const repaired = repairSkippedLogs(raw)
  const clean = excludeOutliers(repaired)
  const recent = clean.slice(-12)

  const today = startOfDay(new Date())
  const daysSinceLast = differenceInDays(today, lastStart)

  if (recent.length < 3) {
    const est = Math.round(coldStartEstimate(recent))
    const sd = recent.length < 2 ? 6 : clampSd(stdDev(recent))
    return {
      predictedStart: addDays(lastStart, est),
      windowStart: addDays(lastStart, Math.round(est - sd)),
      windowEnd: addDays(lastStart, Math.round(est + sd)),
      predictedCycleLength: est,
      confidence: "low",
      regularity: "moderate",
      skippedLogSuspected: false,
    }
  }

  const mean = weightedCycleLength(recent)
  const sd = clampSd(stdDev(recent))
  const regularity = classifyRegularity(recent)

  const isLate = daysSinceLast > Math.round(mean + sd)
  const skippedLogSuspected = daysSinceLast >= Math.round(mean * 1.8)
  const windowSd = isLate ? sd * 1.5 : sd

  const medianCLD = recent.length >= 2 ? medianOf(consecutiveDiffs(recent)) : 5
  const confidence: Confidence = skippedLogSuspected ? "low"
    : medianCLD <= 2 ? "high"
    : medianCLD <= 5 ? "medium"
    : "low"

  return {
    predictedStart: addDays(lastStart, Math.round(mean)),
    windowStart: addDays(lastStart, Math.round(mean - windowSd)),
    windowEnd: addDays(lastStart, Math.round(mean + windowSd)),
    predictedCycleLength: Math.round(mean),
    confidence,
    regularity,
    skippedLogSuspected,
  }
}

function loadData(): PeriodData {
  if (typeof window === "undefined") {
    return { periods: [], averageCycleLength: POPULATION_CYCLE, averagePeriodLength: POPULATION_PERIOD }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error("Failed to load period data:", e)
  }
  return { periods: [], averageCycleLength: POPULATION_CYCLE, averagePeriodLength: POPULATION_PERIOD }
}

function saveData(data: PeriodData): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error("Failed to save period data:", e)
  }
}

function calculateAverageCycle(periods: PeriodEntry[]): number {
  if (periods.length < 2) return POPULATION_CYCLE

  const sortedStarts = [...periods]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map(p => parseISO(p.startDate))

  const raw = toCycleLengths(sortedStarts)
  const repaired = repairSkippedLogs(raw)
  const clean = excludeOutliers(repaired)
  const recent = clean.slice(-12)

  return recent.length >= 1
    ? Math.round(recent.length < 3 ? coldStartEstimate(recent) : weightedCycleLength(recent))
    : POPULATION_CYCLE
}

export function usePeriodTracker() {
  const [data, setData] = useState<PeriodData>(() => loadData())
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loaded = loadData()
    setData({
      ...loaded,
      averageCycleLength: calculateAverageCycle(loaded.periods),
      averagePeriodLength: loaded.averagePeriodLength || POPULATION_PERIOD,
    })
    setIsLoaded(true)
  }, [])
  useEffect(() => { if (isLoaded) saveData(data) }, [data, isLoaded])

  // Single-day logging: tap to add/remove a period start day
  const togglePeriodDay = useCallback((date: Date) => {
    const dateStr = format(startOfDay(date), "yyyy-MM-dd")
    setData(prev => {
      const exists = prev.periods.findIndex(p => p.startDate === dateStr)
      let newPeriods: PeriodEntry[]
      if (exists !== -1) {
        newPeriods = prev.periods.filter((_, i) => i !== exists)
      } else {
        newPeriods = [...prev.periods, { startDate: dateStr, endDate: dateStr }]
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
      }
      return { ...prev, periods: newPeriods, averageCycleLength: calculateAverageCycle(newPeriods) }
    })
  }, [])

  // User-set period length — single-day logging can't measure it, so it's manual
  const setAveragePeriodLength = useCallback((length: number) => {
    setData(prev => ({
      ...prev,
      averagePeriodLength: Math.max(1, Math.min(15, Math.round(length || 1))),
    }))
  }, [])

  // True only for the logged first day (solid red)
  const isPeriodStartDay = useCallback((date: Date): boolean => {
    const d = format(startOfDay(date), "yyyy-MM-dd")
    return data.periods.some(p => p.startDate === d)
  }, [data.periods])

  // True for logged start day + the estimated frame days after it (faint red)
  const isPeriodDay = useCallback((date: Date): boolean => {
    const target = startOfDay(date)
    return data.periods.some(p => {
      const start = parseISO(p.startDate)
      const frameEnd = addDays(start, data.averagePeriodLength - 1)
      return isWithinInterval(target, { start, end: frameEnd })
    })
  }, [data.periods, data.averagePeriodLength])

  const getPrediction = useCallback((): PredictionWindow | null => {
    if (data.periods.length === 0) return null
    const sortedStarts = [...data.periods]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map(p => parseISO(p.startDate))
    return predictNextPeriod(sortedStarts, sortedStarts[sortedStarts.length - 1])
  }, [data.periods])

  const getNextPeriodStart = useCallback((): Date | null => {
    return getPrediction()?.predictedStart ?? null
  }, [getPrediction])

  const getPredictedPeriodDays = useCallback((monthsAhead = 3): Date[] => {
    const prediction = getPrediction()
    if (!prediction) return []
    const { predictedStart } = prediction
    const days: Date[] = []
    const today = startOfDay(new Date())
    for (let c = 0; c < monthsAhead; c++) {
      const cycleStart = addDays(predictedStart, c * data.averageCycleLength)
      if (cycleStart >= today || c === 0) {
        for (let d = 0; d < data.averagePeriodLength; d++) {
          days.push(addDays(cycleStart, d))
        }
      }
    }
    return days
  }, [getPrediction, data.averageCycleLength, data.averagePeriodLength])

  const isPredictedPeriodDay = useCallback((date: Date): boolean => {
    return getPredictedPeriodDays().some(d => isSameDay(d, date))
  }, [getPredictedPeriodDays])

  const getPredictedPeriodStartDays = useCallback((monthsAhead = 3): Date[] => {
    const prediction = getPrediction()
    if (!prediction) return []
    const { predictedStart } = prediction
    const starts: Date[] = []
    const today = startOfDay(new Date())
    for (let c = 0; c < monthsAhead; c++) {
      const cycleStart = addDays(predictedStart, c * data.averageCycleLength)
      if (cycleStart >= today || c === 0) starts.push(cycleStart)
    }
    return starts
  }, [getPrediction, data.averageCycleLength])

  // True only for the predicted first day of each upcoming cycle (dashed marker)
  const isPredictedPeriodStartDay = useCallback((date: Date): boolean => {
    return getPredictedPeriodStartDays().some(d => isSameDay(d, date))
  }, [getPredictedPeriodStartDays])

  const getOvulationDay = useCallback((periodStart: Date): Date => {
    return addDays(periodStart, data.averageCycleLength - 14)
  }, [data.averageCycleLength])

  const getFertileWindow = useCallback((periodStart: Date): { start: Date; end: Date } => {
    const ov = getOvulationDay(periodStart)
    return { start: addDays(ov, -5), end: addDays(ov, 1) }
  }, [getOvulationDay])

  const isOvulationDay = useCallback((date: Date): boolean => {
    if (data.periods.length === 0) return false
    const sorted = [...data.periods].sort((a, b) => b.startDate.localeCompare(a.startDate))
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      if (isSameDay(date, getOvulationDay(parseISO(sorted[i].startDate)))) return true
    }
    const next = getNextPeriodStart()
    if (next) {
      for (let c = 0; c < 3; c++) {
        if (isSameDay(date, getOvulationDay(addDays(next, c * data.averageCycleLength)))) return true
      }
    }
    return false
  }, [data.periods, data.averageCycleLength, getOvulationDay, getNextPeriodStart])

  const isFertileDay = useCallback((date: Date): boolean => {
    if (data.periods.length === 0) return false
    const sorted = [...data.periods].sort((a, b) => b.startDate.localeCompare(a.startDate))
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      const w = getFertileWindow(parseISO(sorted[i].startDate))
      if (isWithinInterval(startOfDay(date), { start: w.start, end: w.end })) return true
    }
    const next = getNextPeriodStart()
    if (next) {
      for (let c = 0; c < 3; c++) {
        const w = getFertileWindow(addDays(next, c * data.averageCycleLength))
        if (isWithinInterval(startOfDay(date), { start: w.start, end: w.end })) return true
      }
    }
    return false
  }, [data.periods, data.averageCycleLength, getFertileWindow, getNextPeriodStart])

  const getDaysUntilNextPeriod = useCallback((): number | null => {
    const next = getNextPeriodStart()
    if (!next) return null
    return differenceInDays(next, startOfDay(new Date()))
  }, [getNextPeriodStart])

  const getCurrentCycleDay = useCallback((): number | null => {
    if (data.periods.length === 0) return null
    const sorted = [...data.periods].sort((a, b) => b.startDate.localeCompare(a.startDate))
    const day = differenceInDays(startOfDay(new Date()), parseISO(sorted[0].startDate)) + 1
    return day > 0 ? day : null
  }, [data.periods])

  const getCyclePhase = useCallback((): CyclePhase => {
    const cycleDay = getCurrentCycleDay()
    if (cycleDay === null) return "unknown"
    const ovDay = data.averageCycleLength - 14
    if (cycleDay <= data.averagePeriodLength) return "menstrual"
    if (cycleDay === ovDay) return "ovulation"
    if (cycleDay >= ovDay - 5 && cycleDay <= ovDay + 1) return "fertile"
    if (cycleDay < ovDay - 5) return "follicular"
    return "luteal"
  }, [getCurrentCycleDay, data.averageCycleLength, data.averagePeriodLength])

  return {
    periods: data.periods,
    averageCycleLength: data.averageCycleLength,
    averagePeriodLength: data.averagePeriodLength,
    isLoaded,
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
    getPredictedPeriodDays,
  }
}
