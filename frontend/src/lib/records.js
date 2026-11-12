import { bestWeightFor } from './history.js'
import { is1RMRecord } from './onerm.js'

// Capture comparisons before the finished workout is added to history. Working-weight
// confirmations during this session are defaults for next time, not previous records.
export function workoutRecords(S, workout) {
  const entries = new Map()
  workout.entries.forEach(e => {
    if (!entries.has(e.id)) entries.set(e.id, { id: e.id, sets: [] })
    entries.get(e.id).sets.push(...e.sets)
  })
  const records = []
  entries.forEach(e => {
    const current = Math.max(0, ...e.sets.filter(s => s.done).map(s => s.w || 0))
    const previous = bestWeightFor(S, e.id)
    if (current > previous) records.push({ id: e.id, kind: 'weight', previous, current })
    else {
      // More reps can improve estimated strength without setting a heavier load record.
      const rec = is1RMRecord(S, e.id, e)
      if (rec) records.push({ id: e.id, kind: 'e1rm', previous: rec.prev, current: rec.est })
    }
  })
  return records
}
