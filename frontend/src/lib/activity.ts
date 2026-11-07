// Turns a day's work into a grid shade for the Progress map (Project.md: "daily + tasks").

export interface DaySummary {
  date: string // YYYY-MM-DD
  sessions: number // finished study sessions (from the API)
  tasks: number // frogs eaten + questions resolved (this browser)
  labels: string[]
}

export type Shade = 0 | 1 | 2 | 3 | 4

export interface Semester {
  name: string
  start: Date
  end: Date
}

// UK-style calendar, since term dates differ by university: Autumn runs Sep to Jan, Spring Feb to Jun,
// and Jul to Aug is shown as Summer.
export function semesterOf(today: Date): Semester {
  const y = today.getFullYear()
  const m = today.getMonth()
  const at = (year: number, month: number, day: number) => new Date(year, month, day, 12)
  if (m >= 8) return { name: `Autumn ${y}`, start: at(y, 8, 1), end: at(y + 1, 0, 31) }
  if (m === 0) return { name: `Autumn ${y - 1}`, start: at(y - 1, 8, 1), end: at(y, 0, 31) }
  if (m <= 5) return { name: `Spring ${y}`, start: at(y, 1, 1), end: at(y, 5, 30) }
  return { name: `Summer ${y}`, start: at(y, 6, 1), end: at(y, 7, 31) }
}

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
