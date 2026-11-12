import { describe, expect, it } from 'vitest'
import { parseWorkoutJSON, freshJSONWorkouts, mergeWorkoutJSON } from './import-workout-json.js'

const example = () => ({
  id: 'session-1', d: '2026-11-01', name: 'Upper body', start: 1793534400000, end: 1793538000000,
  entries: [{ id: '0025', sets: [{ w: 60, r: 10, done: true }, { w: 70, r: 8, done: false }], target: { sets: 2, reps: 10, weight: 60 }, topW: 60 }], vol: 9999, prs: ['untrusted']
})
const state = () => ({ unit: 'kg', workouts: [], customEx: [], exWeights: {}, routines: [{ id: 'routine' }], active: { id: 'in-progress' } })

describe('parseWorkoutJSON', () => {
  it('reads a stored workout, retains unchecked sets, and recalculates volume', () => {
    const { workouts } = parseWorkoutJSON(JSON.stringify(example()))
    expect(workouts[0]).toMatchObject({ id: 'session-1', name: 'Upper body', vol: 600, prs: [], routineId: null })
    expect(workouts[0].entries[0].sets[1].done).toBe(false)
  })

  it('accepts arrays and the workouts portion of a full backup', () => {
    expect(parseWorkoutJSON([example()]).workouts).toHaveLength(1)
    expect(parseWorkoutJSON({ unit: 'kg', workouts: [example()], routines: [] }).workouts).toHaveLength(1)
  })

  it('allows hand-written JSON without IDs, timestamps, or done flags', () => {
    const result = parseWorkoutJSON({ name: 'Bench', d: '2026-11-02', entries: [{ id: '0025', sets: [{ w: 20, r: 10 }] }] })
    expect(result.workouts[0].id).toBeTruthy()
    expect(result.workouts[0].end).toBe(result.workouts[0].start)
    expect(result.workouts[0].vol).toBe(200)
  })

  it('converts all weight fields but leaves reps, speed, duration and effort alone', () => {
    const w = example()
    w.bw = 200
    w.entries[0].sets[0].rir = 2
    w.entries[0].target.inc = 5
    const parsed = parseWorkoutJSON({ unit: 'lb', workouts: [w] })
    const result = parsed.workouts[0]
    expect(parsed.converted).toBe(true)
    expect(result.bw).toBeCloseTo(90.718474)
    expect(result.entries[0].sets[0]).toMatchObject({ r: 10, rir: 2 })
    expect(result.entries[0].sets[0].w).toBeCloseTo(27.2155422)
    expect(result.entries[0].topW).toBeCloseTo(27.2155422)
    expect(result.entries[0].target.weight).toBeCloseTo(27.2155422)
    expect(result.entries[0].target.inc).toBeCloseTo(2.26796185)
  })

  it('infers timed and cardio modes and excludes them from weight volume', () => {
    const w = example()
    w.entries = [
      { id: '0025', sets: [{ sec: 45, w: 20 }] },
      { id: '0025', sets: [{ min: 20, speed: 8 }] }
    ]
    const result = parseWorkoutJSON(w).workouts[0]
    expect(result.vol).toBe(0)
    expect(result.entries.map(e => e.target.mode)).toEqual(['time', 'cardio'])
  })

  it('imports 40s and 50s bodyweight holds, retaining prescribed and actual durations', () => {
    const parsed = parseWorkoutJSON({
      customEx: [{ id: 'side-plank', n: 'Side plank', bp: 'waist' }],
      workouts: [{ name: 'Core', d: '2026-11-12', entries: [{
        id: 'side-plank', target: { mode: 'time', bodyweight: true, sec: 40, sets: 2 },
        sets: [{ sec: 40, done: true }, { sec: 50, done: true }, { sec: 60, done: false }]
      }] }]
    })
    const S = state()
    mergeWorkoutJSON(S, parsed)
    expect(S.workouts[0].entries[0].target).toMatchObject({ mode: 'time', bodyweight: true, sec: 40 })
    expect(S.workouts[0].entries[0].sets).toEqual([
      { sec: 40, w: 0, done: true }, { sec: 50, w: 0, done: true }, { sec: 60, w: 0, done: false }
    ])
    expect(S.workouts[0].vol).toBe(0)
    expect(S.workouts[0].prs).toEqual([])
    expect(S.exWeights['side-plank']).toBeUndefined()
    expect(S.customEx[0]).toMatchObject({ id: 'side-plank', bp: 'waist' })
  })

  it('brings referenced custom exercises from backups or entry metadata', () => {
    const w = example()
    w.entries[0].id = 'my-lift'
    const custom = { id: 'my-lift', n: 'My lift', bp: 'glutes' }
    expect(parseWorkoutJSON({ workouts: [w], customEx: [custom] }).customEx[0]).toMatchObject({ ...custom, custom: true })
    Object.assign(w.entries[0], { n: 'My lift', bp: 'glutes' })
    expect(parseWorkoutJSON(w).customEx).toHaveLength(1)
    expect(parseWorkoutJSON(w, { exercises: [custom] }).customEx).toHaveLength(0)
  })

  it.each([
    ['bad JSON', '{'],
    ['wrong structure', { routines: [] }],
    ['invalid date', { ...example(), d: '2026-02-30' }],
    ['reversed timestamps', { ...example(), end: 1 }],
    ['invalid unit', { unit: 'stone', workouts: [example()] }],
    ['unknown exercise without metadata', { ...example(), entries: [{ id: 'unknown', sets: [{ r: 5 }] }] }],
    ['non-array sets', { ...example(), entries: [{ id: '0025', sets: {} }] }],
    ['negative load', { ...example(), entries: [{ id: '0025', sets: [{ w: -5, r: 5 }] }] }],
    ['string measurement', { ...example(), entries: [{ id: '0025', sets: [{ w: '60', r: 5 }] }] }],
    ['invalid effort', { ...example(), entries: [{ id: '0025', sets: [{ w: 60, r: 5, rpe: 12 }] }] }],
    ['mixed set modes', { ...example(), entries: [{ id: '0025', sets: [{ r: 5 }, { min: 20 }] }] }],
    ['no logged sets', { ...example(), entries: [{ id: '0025', sets: [{ r: 5, done: false }] }] }],
    ['invalid exercise id', { ...example(), entries: [{ id: '__proto__', sets: [{ r: 5 }] }] }]
  ])('rejects %s', (_, raw) => {
    expect(() => parseWorkoutJSON(raw)).toThrow()
  })
})

describe('mergeWorkoutJSON', () => {
  it('adds workouts without replacing routines or the active workout', () => {
    const S = state()
    expect(mergeWorkoutJSON(S, parseWorkoutJSON(example()))).toEqual({ added: 1, skipped: 0 })
    expect(S.routines).toEqual([{ id: 'routine' }])
    expect(S.active).toEqual({ id: 'in-progress' })
    expect(S.exWeights['0025'].w).toBe(60)
    expect(S.workouts[0].prs).toEqual(['0025'])
  })

  it('skips repeated IDs and content even if object property order differs', () => {
    const S = state()
    S.workouts.push(example())
    const parsed = parseWorkoutJSON({ ...example(), id: 'another-id' })
    expect(mergeWorkoutJSON(S, parsed)).toEqual({ added: 0, skipped: 1 })
    expect(S.workouts).toHaveLength(1)
  })

  it('does not duplicate hand-written imports without IDs', () => {
    const S = state()
    const raw = { name: 'Bench', d: '2026-11-02', entries: [{ id: '0025', sets: [{ w: 20, r: 10 }] }] }
    mergeWorkoutJSON(S, parseWorkoutJSON(raw))
    expect(mergeWorkoutJSON(S, parseWorkoutJSON(raw)).added).toBe(0)
  })

  it('allows distinct sessions on the same day and sorts them chronologically', () => {
    const S = state()
    const first = example()
    const second = { ...example(), id: 'session-2', start: first.start + 7200000, end: first.end + 7200000 }
    expect(mergeWorkoutJSON(S, parseWorkoutJSON([second, first])).added).toBe(2)
    expect(S.workouts.map(w => w.id)).toEqual(['session-1', 'session-2'])
  })

  it('deduplicates within a file and avoids orphan custom exercises from skipped sessions', () => {
    const S = state()
    S.workouts.push(example())
    const w = { ...example(), entries: [{ id: 'custom-id', sets: [{ r: 5 }] }] }
    const parsed = parseWorkoutJSON({ workouts: [w, w], customEx: [{ id: 'custom-id', n: 'Custom', bp: 'waist' }] })
    expect(freshJSONWorkouts([], parsed.workouts)).toHaveLength(1)
    expect(mergeWorkoutJSON(S, parsed).added).toBe(0)
    expect(S.customEx).toHaveLength(0)
  })

  it('refuses to merge if the profile unit changed after preview', () => {
    expect(() => mergeWorkoutJSON({ ...state(), unit: 'lb' }, parseWorkoutJSON(example()))).toThrow()
  })
})
