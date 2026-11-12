import { describe, expect, it } from 'vitest'
import { EXDB } from './exercises.js'
import { replacementCandidates, replacementConfig, replacementRoutineIndex, replaceActiveExercise } from './exercise-replacement.js'
import { supersetUnits, workoutVolume, setsDoneActive } from './history.js'

const alternative = { id: 'replacement', n: 'Machine press', bp: 'chest', tg: 'pectorals', eq: 'machine' }
const config = () => ({ id: 'original', sets: 3, reps: 10, weight: 80, prog: 'off' })
const newConfig = () => ({ sets: 3, reps: 12, weight: 0, mode: 'reps', prog: 'off' })
function state() {
  const cfg = config()
  return {
    unit: 'kg', exWeights: { original: { w: 80 }, replacement: { w: 25 } }, workouts: [],
    routines: [{ id: 'routine', ex: [{ ...cfg }] }],
    active: { id: 'session', routineId: 'routine', cur: 0, entries: [{
      id: cfg.id, target: { ...cfg }, asked: true, topW: 80,
      routineSource: { index: 0, config: { ...cfg } },
      sets: Array.from({ length: 3 }, () => ({ w: 80, r: 10, done: false }))
    }] }
  }
}

describe('replacement alternatives', () => {
  it('prefers the same target muscle and excludes the source and unrelated muscles', () => {
    const original = { id: 'original', bp: 'chest', tg: 'pectorals' }
    const others = [
      { id: 'legs', bp: 'upper legs', tg: 'quads' },
      { id: 'custom', bp: 'chest' }, alternative, original
    ]
    expect(replacementCandidates(original, others).map(e => e.id)).toEqual(['replacement', 'custom'])
  })

  it('matches a custom glutes exercise to glute movements in the legs category', () => {
    expect(replacementCandidates({ id: 'custom-glutes', bp: 'glutes' }, [
      { id: 'hip-thrust', bp: 'upper legs', tg: 'glutes' },
      { id: 'curl', bp: 'upper arms', tg: 'biceps' }
    ]).map(e => e.id)).toEqual(['hip-thrust'])
  })
})

describe('replacing an active exercise', () => {
  it('replaces only today and uses the new exercise’s history, not the previous load', () => {
    const S = state()
    const routine = structuredClone(S.routines)
    const result = replaceActiveExercise(S, 0, alternative, newConfig())
    expect(result.id).toBe('replacement')
    expect(result.sets.every(s => s.w === 25 && !s.done)).toBe(true)
    expect(result.asked).toBeUndefined()
    expect(result.topW).toBeUndefined()
    expect(S.routines).toEqual(routine)
    expect(S.workouts).toEqual([])
    expect(S.exWeights.original.w).toBe(80)
  })

  it('preserves completed logs and volume under the original exercise', () => {
    const S = state()
    S.active.entries[0].sets[0] = { w: 80, r: 8, done: true, rir: 1 }
    const result = replaceActiveExercise(S, 0, alternative, { ...newConfig(), sets: 2 })
    expect(S.active.entries.map(e => e.id)).toEqual(['original', 'replacement'])
    expect(S.active.entries[0].sets).toEqual([{ w: 80, r: 8, done: true, rir: 1 }])
    expect(result.sets).toHaveLength(2)
    expect(S.active.cur).toBe(1)
    expect(setsDoneActive(S.active)).toBe(1)
    expect(workoutVolume(S.active)).toBe(640)
  })

  it('updates the routine while keeping its full planned set count', () => {
    const S = state()
    S.active.entries[0].sets[0].done = true
    replaceActiveExercise(S, 0, alternative, { ...newConfig(), sets: 2 }, { updateRoutine: true })
    expect(S.routines[0].ex[0]).toMatchObject({ id: 'replacement', sets: 3, reps: 12 })
    expect(S.active.entries[1].sets).toHaveLength(2)
    expect(replacementRoutineIndex(S, 1)).toBe(0)
  })

  it('can make a second temporary replacement permanent in the original routine slot', () => {
    const S = state()
    replaceActiveExercise(S, 0, alternative, newConfig())
    expect(replacementRoutineIndex(S, 0)).toBe(0)
    replaceActiveExercise(S, 0, { ...alternative, id: 'third' }, newConfig(), { updateRoutine: true })
    expect(S.routines[0].ex[0].id).toBe('third')
  })

  it('preserves superset partners and unlinks only the retained completed block', () => {
    const S = state()
    S.active.entries[0].sg = 'pair'
    S.active.entries[0].target.sg = 'pair'
    S.active.entries[0].sets[0].done = true
    S.active.entries.push({ id: 'partner', sg: 'pair', sets: [{ w: 20, r: 10, done: false }] })
    replaceActiveExercise(S, 0, alternative, { ...newConfig(), sets: 2 })
    expect(supersetUnits(S.active.entries)).toEqual([[0], [1, 2]])
    expect(S.active.entries[0].sg).toBeUndefined()
    expect(S.active.entries[0].target.sg).toBeUndefined()
    expect(S.active.entries[1].sg).toBe('pair')
  })

  it('updates the selected occurrence when the same exercise appears twice', () => {
    const S = state()
    S.routines[0].ex.push(config())
    S.active.entries[0].routineSource.index = 1
    replaceActiveExercise(S, 0, alternative, newConfig(), { updateRoutine: true })
    expect(S.routines[0].ex.map(e => e.id)).toEqual(['original', 'replacement'])
  })

  it('keeps the superset together when replacing its second member after logging a set', () => {
    const S = state()
    const old = S.active.entries[0]
    old.sg = 'pair'
    old.sets[0].done = true
    S.active.entries.unshift({ id: 'partner', sg: 'pair', sets: [{ w: 20, r: 10, done: false }] })
    replaceActiveExercise(S, 1, alternative, { ...newConfig(), sets: 2 })
    expect(S.active.entries.map(e => e.id)).toEqual(['original', 'partner', 'replacement'])
    expect(supersetUnits(S.active.entries)).toEqual([[0], [1, 2]])
    expect(S.active.cur).toBe(2)
    expect(workoutVolume(S.active)).toBe(800)
  })

  it('refuses stale routine edits without changing the active session', () => {
    const S = state()
    S.routines[0].ex[0].reps = 5
    const before = structuredClone(S)
    expect(replacementRoutineIndex(S, 0)).toBe(-1)
    expect(() => replaceActiveExercise(S, 0, alternative, newConfig(), { updateRoutine: true })).toThrow()
    expect(S).toEqual(before)
    expect(() => replaceActiveExercise(S, 0, alternative, newConfig())).not.toThrow()
  })

  it('supports old active sessions and limits freestyle entries to today', () => {
    const S = state()
    delete S.active.entries[0].routineSource
    expect(replacementRoutineIndex(S, 0)).toBe(0)
    S.active.entries[0].routineSource = null
    expect(replacementRoutineIndex(S, 0)).toBe(-1)
    S.active.routineId = null
    expect(() => replaceActiveExercise(S, 0, alternative, newConfig())).not.toThrow()
  })

  it('does not replace completed exercises, stale entries, or ended sessions', () => {
    const S = state()
    expect(() => replaceActiveExercise(S, 0, alternative, newConfig(), { activeId: 'other' })).toThrow()
    expect(() => replaceActiveExercise(S, 0, alternative, newConfig(), { originalId: 'other' })).toThrow()
    S.active.entries[0].sets.forEach(s => { s.done = true })
    expect(() => replaceActiveExercise(S, 0, alternative, newConfig())).toThrow()
    S.active = null
    expect(() => replaceActiveExercise(S, 0, alternative, newConfig())).toThrow()
  })

  it('keeps timed holds as timed sets when substituting another hold', () => {
    const S = state()
    S.active.entries[0].target = { mode: 'time', sec: 40 }
    S.active.entries[0].sets = [{ sec: 40, w: 0, done: false }]
    const defaults = replacementConfig(S, 0, alternative)
    expect(defaults).toMatchObject({ mode: 'time', sec: 40, sets: 1 })
    const result = replaceActiveExercise(S, 0, alternative, { ...defaults, prog: 'off' })
    expect(result.sets[0]).toMatchObject({ sec: 40, done: false })
    expect(result.sets[0].r).toBeUndefined()
  })

  it('defaults a bodyweight replacement to its own flags and weights', () => {
    const S = state()
    const bodyweight = EXDB.find(e => e.eq === 'body weight' && e.bp !== 'cardio')
    const defaults = replacementConfig(S, 0, bodyweight)
    expect(defaults.bodyweight).toBe(true)
    expect(defaults.weight).toBe(0)
    expect(defaults.side).toBeUndefined()
  })
})
