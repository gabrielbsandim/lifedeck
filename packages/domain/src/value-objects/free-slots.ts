// Pure interval math for smart scheduling ("find me time"): subtract busy
// periods from candidate windows and enumerate bookable slots. Everything here
// is absolute-time and timezone-free — the caller (the findFreeSlots use case)
// builds the candidate windows in the user's timezone and passes busy events in.

export type TimeInterval = { start: Date; end: Date }

const MINUTE_MS = 60_000
const DEFAULT_GRANULARITY_MIN = 30
const DEFAULT_MAX_RESULTS = 8

// Merge overlapping or touching intervals into a sorted, disjoint set. Empty and
// inverted intervals are dropped.
function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  const sorted = intervals
    .filter(interval => interval.end.getTime() > interval.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: TimeInterval[] = []
  for (const interval of sorted) {
    const last = merged[merged.length - 1]
    if (last && interval.start.getTime() <= last.end.getTime()) {
      if (interval.end.getTime() > last.end.getTime()) {
        last.end = interval.end
      }
    } else {
      merged.push({ start: interval.start, end: interval.end })
    }
  }
  return merged
}

// Subtract a sorted, disjoint set of blocks from a single window, returning the
// free remainder (zero or more intervals) in ascending order.
function subtractFromWindow(
  window: TimeInterval,
  blocks: TimeInterval[],
): TimeInterval[] {
  const free: TimeInterval[] = []
  const end = window.end.getTime()
  let cursor = window.start.getTime()
  for (const block of blocks) {
    const blockStart = block.start.getTime()
    const blockEnd = block.end.getTime()
    if (blockEnd <= cursor || blockStart >= end) {
      continue // block falls entirely outside the window
    }
    if (blockStart > cursor) {
      free.push({
        start: new Date(cursor),
        end: new Date(Math.min(blockStart, end)),
      })
    }
    cursor = Math.max(cursor, blockEnd)
    if (cursor >= end) {
      break
    }
  }
  if (cursor < end) {
    free.push({ start: new Date(cursor), end: new Date(end) })
  }
  return free
}

// Subtract every block from every window, returning the free remainder sorted
// ascending. Blocks are merged first so overlaps do not double-cut.
export function subtractIntervals(
  windows: TimeInterval[],
  blocks: TimeInterval[],
): TimeInterval[] {
  const merged = mergeIntervals(blocks)
  return windows
    .flatMap(window => subtractFromWindow(window, merged))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

function ceilToStep(ms: number, stepMs: number): number {
  return Math.ceil(ms / stepMs) * stepMs
}

export type FindFreeSlotsParams = {
  /** Candidate windows (e.g. work hours minus quiet hours), absolute time. */
  windows: TimeInterval[]
  /** Busy intervals to avoid (existing calendar events). */
  busy: TimeInterval[]
  /** Desired slot length in minutes. */
  durationMin: number
  /** Grid the slot starts snap to, in minutes. Defaults to 30. */
  granularityMin?: number
  /** Cap on how many slots to return. Defaults to 8. */
  maxResults?: number
}

// The bookable slots of `durationMin`, aligned to the granularity grid, that fit
// inside `windows` and clear of `busy`. Sorted earliest-first, capped at
// `maxResults`.
export function findFreeSlots({
  windows,
  busy,
  durationMin,
  granularityMin = DEFAULT_GRANULARITY_MIN,
  maxResults = DEFAULT_MAX_RESULTS,
}: FindFreeSlotsParams): TimeInterval[] {
  if (durationMin <= 0 || granularityMin <= 0 || maxResults <= 0) {
    return []
  }
  const durationMs = durationMin * MINUTE_MS
  const stepMs = granularityMin * MINUTE_MS
  const slots: TimeInterval[] = []
  for (const gap of subtractIntervals(windows, busy)) {
    const gapEnd = gap.end.getTime()
    let start = ceilToStep(gap.start.getTime(), stepMs)
    while (start + durationMs <= gapEnd) {
      slots.push({ start: new Date(start), end: new Date(start + durationMs) })
      if (slots.length >= maxResults) {
        return slots
      }
      start += stepMs
    }
  }
  return slots
}
