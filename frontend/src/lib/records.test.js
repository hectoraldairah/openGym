import { describe, expect, it } from 'vitest'
import { workoutRecords, personalRecords, newWorkoutRecords } from './records.js'

const entry = (w, r = 5, done = true) => ({ id: 'bench', sets: [{ w, r, done }] })
const state = { workouts: [{ entries: [entry(80)] }], exWeights: { bench: { w: 100 } } }
const workout = (...entries) => ({ entries })

describe('workoutRecords', () => {
  it('captures the previous historical measurement even after confirming a working weight', () => {
    expect(workoutRecords(state, workout(entry(90)))).toEqual([
      { id: 'bench', kind: 'weight', previous: 80, current: 90 }
    ])
  })

  it('shows an estimated-strength record when more reps beat the previous estimate', () => {
    expect(workoutRecords(state, workout(entry(80, 8)))).toEqual([
      { id: 'bench', kind: 'e1rm', previous: 93.3, current: 101.3 }
    ])
  })

  it('does not celebrate tied, lower, or unchecked sets', () => {
    expect(workoutRecords(state, workout(entry(80), entry(60), entry(150, 5, false)))).toEqual([])
  })

  it('uses one highest record per exercise when it appears more than once', () => {
    expect(workoutRecords(state, workout(entry(85), entry(95)))).toEqual([
      { id: 'bench', kind: 'weight', previous: 80, current: 95 }
    ])
  })

  it('marks a first record with no previous measurement', () => {
    expect(workoutRecords({ workouts: [] }, workout(entry(50)))).toEqual([
      { id: 'bench', kind: 'weight', previous: 0, current: 50 }
    ])
  })

  it('respects historical confirmed top weights without crediting an unlogged current weight', () => {
    const S = { workouts: [{ entries: [{ ...entry(80), topW: 100 }] }] }
    expect(workoutRecords(S, workout({ ...entry(85, 1), topW: 120 }))).toEqual([])
  })

  it('leaves unloaded bodyweight and cardio sessions without weight records', () => {
    expect(workoutRecords({ workouts: [] }, workout(entry(0, 20), { id: 'run', sets: [{ min: 20, speed: 8, done: true }] }))).toEqual([])
  })
})

const session = (id, d, ...entries) => ({ id, d, start: +new Date(d + 'T12:00:00'), entries })
const get = (records, id, kind) => records.find(r => r.id === id && r.kind === kind)

describe('new records at workout completion', () => {
  it('returns the same shareable record data that Stats will show after saving', () => {
    const history = [session('first', '2026-11-01', entry(60, 5))]
    const finished = session('today', '2026-11-02', entry(70, 8))
    const records = newWorkoutRecords({ workouts: history }, finished)
    expect(records.map(r => r.kind)).toEqual(['weight', 'reps', 'e1rm'])
    expect(records).toEqual(personalRecords([...history, finished]).filter(r => r.workoutId === finished.id))
    expect(records.every(r => r.workoutId === 'today' && r.set.done)).toBe(true)
  })

  it('does not celebrate tied, lower or unchecked measurements', () => {
    const S = { workouts: [session('first', '2026-11-01', entry(70, 8))] }
    expect(newWorkoutRecords(S, session('tie', '2026-11-02', entry(70, 8)))).toEqual([])
    expect(newWorkoutRecords(S, session('lower', '2026-11-02', entry(60, 5)))).toEqual([])
    expect(newWorkoutRecords(S, session('unchecked', '2026-11-02', entry(100, 10, false)))).toEqual([])
  })

  it('celebrates timed and cardio records as well as weight records', () => {
    const S = { workouts: [session('first', '2026-11-01',
      { id: 'plank', sets: [{ sec: 40, done: true }] },
      { id: 'run', sets: [{ min: 20, speed: 8, done: true }] }
    )] }
    const records = newWorkoutRecords(S, session('today', '2026-11-02',
      { id: 'plank', sets: [{ sec: 50, done: true }] },
      { id: 'run', sets: [{ min: 25, speed: 10, done: true }] }
    ))
    expect(records.map(r => [r.id, r.kind, r.value])).toEqual([
      ['plank', 'time', 50], ['run', 'speed', 10], ['run', 'cardioDuration', 25]
    ])
  })

  it('supports first records and deduplicates exercises repeated in the same session', () => {
    const records = newWorkoutRecords({ workouts: [] }, session('today', '2026-11-02', entry(60), entry(70)))
    expect(get(records, 'bench', 'weight').value).toBe(70)
    expect(new Set(records.map(r => r.id + ':' + r.kind)).size).toBe(records.length)
  })

  it('does not mistake a repeated confirmed working weight for a new PR', () => {
    const S = { workouts: [session('first', '2026-11-01', { ...entry(60), topW: 80 })] }
    expect(newWorkoutRecords(S, session('today', '2026-11-02', { ...entry(60), topW: 80 }))).toEqual([])
  })
})

describe('all-time personal records', () => {
  it('keeps the best weight, reps and estimated 1RM with their own dates and source sets', () => {
    const history = [
      session('reps', '2026-11-01', entry(30, 20)),
      session('estimate', '2026-11-02', entry(90, 10)),
      session('weight', '2026-11-03', entry(100, 1))
    ]
    const records = personalRecords(history)
    expect(get(records, 'bench', 'weight')).toMatchObject({ value: 100, d: '2026-11-03', workoutId: 'weight', set: { w: 100, r: 1 } })
    expect(get(records, 'bench', 'e1rm')).toMatchObject({ value: 120, d: '2026-11-02', workoutId: 'estimate' })
    expect(get(records, 'bench', 'reps')).toMatchObject({ value: 20, d: '2026-11-01' })
  })

  it('looks at every occurrence, including exercises repeated across workout phases', () => {
    const records = personalRecords([session('mixed', '2026-11-01',
      { ...entry(20, 10), phase: 'pre' }, { ...entry(80, 8), phase: 'main' })])
    expect(get(records, 'bench', 'weight').value).toBe(80)
    expect(get(records, 'bench', 'e1rm').value).toBe(101.3)
    expect(get(records, 'bench', 'reps').value).toBe(10)
    expect(new Set(records.map(r => r.id + ':' + r.kind)).size).toBe(records.length)
  })

  it('ignores unchecked sets and recomputes records without stored PR flags', () => {
    const history = [session('imported', '2026-11-01', entry(60, 5), entry(999, 10, false))]
    expect(get(personalRecords(history), 'bench', 'weight').value).toBe(60)
    expect(personalRecords([session('empty', '2026-11-01', entry(60, 5, false))])).toEqual([])
  })

  it('records bodyweight reps, timed holds and cardio without inventing lifting estimates', () => {
    const records = personalRecords([session('varied', '2026-11-01',
      { id: 'pushups', target: { bodyweight: true }, sets: [{ w: 0, r: 20, done: true }] },
      { id: 'plank', sets: [{ sec: 40, done: true }, { sec: 50, done: true }] },
      { id: 'run', sets: [{ min: 20, speed: 8, done: true }, { min: 10, speed: 10, done: true }] }
    )])
    expect(get(records, 'pushups', 'reps').value).toBe(20)
    expect(get(records, 'pushups', 'weight')).toBeUndefined()
    expect(get(records, 'pushups', 'e1rm')).toBeUndefined()
    expect(get(records, 'plank', 'time').value).toBe(50)
    expect(get(records, 'plank', 'reps')).toBeUndefined()
    expect(get(records, 'run', 'speed').value).toBe(10)
    expect(get(records, 'run', 'cardioDuration').value).toBe(20)
    expect(get(records, 'run', 'e1rm')).toBeUndefined()
  })

  it('keeps the first achievement date for ties even if history is out of order', () => {
    const latest = session('later', '2026-11-10', entry(80))
    const earliest = session('first', '2026-10-01', entry(80))
    expect(get(personalRecords([latest, earliest]), 'bench', 'weight').workoutId).toBe('first')
  })

  it('distinguishes confirmed weights from completed sets and never estimates from topW', () => {
    const records = personalRecords([session('confirmed', '2026-11-01', { ...entry(60, 10), topW: 110 })])
    expect(get(records, 'bench', 'weight')).toMatchObject({ value: 110, set: null, confirmed: true })
    expect(get(records, 'bench', 'e1rm').value).toBe(80)
    expect(personalRecords([session('unlogged', '2026-11-01', { ...entry(60, 10, false), topW: 999 })])).toEqual([])
  })

  it('retains deleted exercise names and falls back to the previous record after deleting a workout', () => {
    const first = session('first', '2026-11-01', { ...entry(60), n: 'Deleted custom lift' })
    const last = session('last', '2026-11-02', entry(90))
    expect(get(personalRecords([first, last]), 'bench', 'weight').value).toBe(90)
    expect(get(personalRecords([first]), 'bench', 'weight')).toMatchObject({ value: 60, name: 'Deleted custom lift' })
  })

  it('does not change saved workouts when sorting or exposing the source set', () => {
    const history = [session('last', '2026-11-02', entry(90)), session('first', '2026-11-01', entry(60))]
    const before = structuredClone(history)
    const records = personalRecords(history)
    get(records, 'bench', 'weight').set.w = 1000
    expect(history).toEqual(before)
  })
})
