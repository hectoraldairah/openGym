import { bestWeightFor, modeOf } from './history.js'
import { is1RMRecord, estimate1RM } from './onerm.js'

export const RECORD_NAME = {
  weight: 'Heaviest weight', e1rm: 'Est. 1RM', reps: 'Most reps in one set',
  time: 'Longest hold', speed: 'Top speed', cardioDuration: 'Longest cardio interval'
}

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

// Derive current all-time records from history rather than stored PR flags, which may
// be absent on imports or stale after a workout is deleted. Equal values keep the date
// they were first achieved, even if the stored workouts arrive out of order.
export function personalRecords(workouts) {
  const best = new Map()
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0
  const sorted = [...workouts].sort((a, b) => a.d.localeCompare(b.d) || (a.start || 0) - (b.start || 0))
  sorted.forEach(workout => workout.entries.forEach(entry => {
    const done = entry.sets.filter(s => s.done)
    if (!done.length) return
    const mode = entry.target?.mode || (done[0].sec != null ? 'time' : done[0].min != null ? 'cardio' : modeOf({ ...entry.target, id: entry.id }))
    const record = (kind, value, set, confirmed = false) => {
      if (!positive(value)) return
      const key = `${entry.id}:${kind}`
      if (!best.has(key) || value > best.get(key).value) best.set(key, {
        id: entry.id, kind, value, d: workout.d, start: workout.start || 0,
        workoutId: workout.id, name: entry.n || '', set: set ? { ...set } : null,
        target: entry.target ? { ...entry.target } : null, confirmed
      })
    }
    done.forEach(set => {
      if (mode === 'cardio') {
        record('speed', set.speed, set)
        record('cardioDuration', set.min, set)
      } else {
        record('weight', set.w, set)
        if (mode === 'time') record('time', set.sec, set)
        else {
          record('reps', set.r, set)
          record('e1rm', estimate1RM(set.w, set.r), set)
        }
      }
    })
    // A confirmed working weight has no associated rep count. Keep that distinction
    // visible instead of presenting it as a completed set or using it for a 1RM.
    if (mode !== 'cardio') record('weight', entry.topW, null, true)
  }))
  return [...best.values()]
}

// Finish-time celebrations use the same metrics and source data as the Stats cards.
// Compute before appending the workout so tied records never trigger another celebration.
export function newWorkoutRecords(state, workout) {
  const previous = new Map(personalRecords(state.workouts).map(record => [`${record.id}:${record.kind}`, record.value]))
  return personalRecords([workout]).filter(record => record.value > (previous.get(`${record.id}:${record.kind}`) || 0))
}

export function recordComparison(record, workouts) {
  const sourceIndex = workouts.findIndex(w => w.id === record.workoutId)
  const previousWorkouts = workouts.filter((w, index) => {
    if (w.id === record.workoutId) return false
    if (w.d !== record.d) return w.d < record.d
    if ((w.start || 0) !== record.start) return (w.start || 0) < record.start
    return sourceIndex >= 0 && index < sourceIndex
  })
  const previous = personalRecords(previousWorkouts).find(p => p.id === record.id && p.kind === record.kind) || null
  return {
    previous,
    delta: previous ? record.value - previous.value : null,
    percent: previous ? Math.round((record.value / previous.value - 1) * 1000) / 10 : null
  }
}
