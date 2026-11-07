// Turns a day's work into a grid shade for the Progress map (Project.md: "daily + tasks").

export interface DaySummary {
  date: string // YYYY-MM-DD
  sessions: number // finished study sessions (from the API)
  tasks: number // frogs eaten + questions resolved (this browser)
  labels: string[]
}

export type Shade = 0 | 1 | 2 | 3 | 4

// A session counts as two tasks so one session already reads as a real day (small wins show).
// Cut-offs are a design guess (TUNE). Empty days stay 0 and neutral: no streaks, no "you broke it".
export function shadeFor(day: DaySummary): Shade {
  const points = day.sessions * 2 + day.tasks
  if (points === 0) return 0
  if (points <= 1) return 1
  if (points <= 3) return 2
  if (points <= 5) return 3
  return 4
}
