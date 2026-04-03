import type { RobberyReport } from './types'

const STORAGE_KEY = 'robbery-map-incidents'

export function loadReports(): RobberyReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as RobberyReport[]
  } catch {
    return []
  }
}

export function saveReports(reports: RobberyReport[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}
