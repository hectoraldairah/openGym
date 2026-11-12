import { describe, expect, it } from 'vitest'
import { routineExercises, phaseExercises, routineSections } from './routine-sections.js'
import { routineWorkoutEntries, insertPhaseEntry } from './routine-workout.js'
import { lastEntryFor, supersetUnits, cleanupSg, buildSets } from './history.js'
import { nextPrescription } from './progression.js'
import { buildPlanBundle, parsePlan, mergePlan } from './plan-share.js'
import { replaceActiveExercise, replacementRoutineIndex } from './exercise-replacement.js'
import { parseWorkoutJSON, mergeWorkoutJSON } from './import-workout-json.js'
import { best1RM } from './onerm.js'

const lift = { id: '0025', sets: 3, reps: 10, weight: 60, prog: 'off' }
const mobility = { id: 'hip-mobility', sets: 1, mode: 'time', sec: 40, weight: 0, bodyweight: true }
const stretch = { id: 'stretch', sets: 1, mode: 'time', sec: 50, weight: 0, bodyweight: true }
const routine = () => ({ id: 'lower-a', name: 'Lower A', ex: [{ ...lift }], pre: { enabled: true, ex: [{ ...mobility }] }, post: { enabled: true, ex: [{ ...stretch }] } })
const state = r => ({ unit: 'kg', workouts: [], exWeights: {}, routines: [r], customEx: [
  { id: mobility.id, n: 'Hip mobility', bp: 'upper legs', custom: true, videoUrl: 'https://youtu.be/dQw4w9WgXcQ' },
  { id: stretch.id, n: 'Stretch', bp: 'upper legs', custom: true }
], week: { 1: r.id }, dayPlan: {} })

describe('optional routine blocks', () => {
  it('keeps legacy routines working as a main-only session', () => {
    const r = { ex: [lift] }
    expect(routineSections(r)).toEqual([{ phase: 'main', ex: [lift] }])
    expect(routineWorkoutEntries(state(r), r).map(e => e.phase)).toEqual(['main'])
    expect(r.pre).toBeUndefined()
  })

  it('builds pre, main and post in order with timed holds and source slots', () => {
    const r = routine(), S = state(r)
    const entries = routineWorkoutEntries(S, r)
    expect(entries.map(e => e.phase)).toEqual(['pre', 'main', 'post'])
    expect(entries[0].sets).toEqual([{ sec: 40, w: 0, done: false }])
    expect(entries[2].sets).toEqual([{ sec: 50, w: 0, done: false }])
    expect(entries[0].routineSource).toEqual({ phase: 'pre', index: 0, config: mobility })
    expect(entries[0].plan.kind).toBe('off')
  })

  it('can omit either block for today without changing the saved routine', () => {
    const r = routine(), before = structuredClone(r), S = state(r)
    expect(routineWorkoutEntries(S, r, { pre: false }).map(e => e.phase)).toEqual(['main', 'post'])
    expect(routineWorkoutEntries(S, r, { post: false }).map(e => e.phase)).toEqual(['pre', 'main'])
    expect(routineWorkoutEntries(S, r, { pre: false, post: false }).map(e => e.phase)).toEqual(['main'])
    expect(r).toEqual(before)
  })

  it('retains disabled block configurations without scheduling them', () => {
    const r = routine()
    r.pre.enabled = false
    expect(routineExercises(r).map(e => e.id)).toEqual([lift.id, stretch.id])
    expect(routineExercises(r, { includeDisabled: true }).map(e => e.id)).toEqual([mobility.id, lift.id, stretch.id])
    expect(phaseExercises(r, 'pre')).toEqual([mobility])
  })

  it('does not link supersets across phase boundaries', () => {
    const entries = [{ phase: 'pre', sg: 'same' }, { phase: 'main', sg: 'same' }, { phase: 'main', sg: 'same' }, { phase: 'post', sg: 'same' }]
    expect(supersetUnits(entries)).toEqual([[0], [1, 2], [3]])
    cleanupSg(entries)
    expect(entries.map(e => e.sg)).toEqual([undefined, 'same', 'same', undefined])
  })

  it('keeps prescribed warm-up loads independent of main-lift history', () => {
    const S = { unit: 'kg', exWeights: { '0025': { w: 80 } }, workouts: [{ entries: [{ id: '0025', phase: 'main', sets: [{ w: 80, r: 12, done: true }] }] }] }
    expect(buildSets(S, { ...lift, phase: 'pre', sets: 1, weight: 20, reps: 8 })).toEqual([{ w: 20, r: 8, done: false }])
    expect(buildSets(S, { ...lift, phase: 'main', sets: 1 })[0].w).toBe(80)
  })

  it('keeps main progression and last-session suggestions separate from optional blocks', () => {
    const S = { unit: 'kg', exWeights: {}, workouts: [{ entries: [
      { id: '0025', phase: 'pre', sets: [{ w: 10, r: 5, done: true }] },
      { id: '0025', phase: 'main', target: { sets: 1, reps: 10 }, sets: [{ w: 60, r: 10, done: true }] }
    ] }] }
    expect(lastEntryFor(S, '0025').sets[0].w).toBe(60)
    expect(lastEntryFor(S, '0025', 'pre').sets[0].w).toBe(10)
    expect(nextPrescription(S, { ...lift, sets: 1, prog: 'linear', phase: 'main' }).weight).toBe(62.5)
    expect(nextPrescription(S, { ...lift, sets: 1, prog: 'linear', phase: 'post' }).kind).toBe('first')
    expect(best1RM(S, '0025').w).toBe(60)
  })

  it('adds exercises inside their phase, before later blocks', () => {
    const active = { entries: [{ id: 'pre-1', phase: 'pre' }, { id: 'main', phase: 'main' }, { id: 'post', phase: 'post' }] }
    insertPhaseEntry(active, { id: 'pre-2', phase: 'pre' })
    expect(active.entries.map(e => e.id)).toEqual(['pre-1', 'pre-2', 'main', 'post'])
    expect(active.cur).toBe(1)
  })

  it('replaces a pre-workout exercise in the correct routine block only', () => {
    const r = routine(), S = state(r)
    S.active = { id: 'active', routineId: r.id, cur: 0, entries: routineWorkoutEntries(S, r) }
    expect(replacementRoutineIndex(S, 0)).toBe(0)
    replaceActiveExercise(S, 0, { id: '3544' }, { sets: 1, mode: 'time', sec: 45, weight: 0, prog: 'off' }, { updateRoutine: true })
    expect(r.pre.ex[0].id).toBe('3544')
    expect(r.ex[0].id).toBe(lift.id)
    expect(S.active.entries[0].phase).toBe('pre')
    expect(replacementRoutineIndex(S, 0)).toBe(0)
  })

  it('round-trips blocks and their custom exercise definitions in shared plans', () => {
    const r = routine(), S = state(r)
    r.post.enabled = false
    const bundle = buildPlanBundle(S, 'Lower')
    expect(bundle.customEx.map(e => e.id)).toEqual([mobility.id, stretch.id])
    const parsed = parsePlan(JSON.stringify(bundle))
    expect(parsed.exerciseCount).toBe(3)
    expect(parsed.dropped).toBe(0)
    const destination = { routines: [], customEx: [], week: {} }
    mergePlan(destination, parsed)
    const imported = destination.routines[0]
    expect(imported.pre.ex[0].id).toBe(destination.customEx[0].id)
    expect(imported.post.enabled).toBe(false)
    expect(imported.post.ex[0].sec).toBe(50)
    expect(destination.customEx[0].videoUrl).toBe(S.customEx[0].videoUrl)
    expect(routineExercises(imported)).toHaveLength(2)
  })

  it('validates exercise IDs inside optional blocks during plan import', () => {
    const bundle = { opengym_plan: 1, routines: [{ ex: [lift], pre: { enabled: true, ex: [{ id: 'missing' }] } }] }
    const result = parsePlan(bundle)
    expect(result.dropped).toBe(1)
    expect(result.routines[0].pre.ex).toEqual([])
    expect(() => parsePlan({ ...bundle, routines: [{ ex: [], post: {} }] })).toThrow()
  })

  it('preserves phases in workout JSON without seeding main loads from warm-ups', () => {
    const parsed = parseWorkoutJSON({ name: 'Lower A', d: '2026-11-12', entries: [
      { id: '0025', phase: 'pre', sets: [{ w: 20, r: 10 }] },
      { id: '0025', phase: 'main', sets: [{ w: 60, r: 10 }] },
      { id: '3544', phase: 'post', sets: [{ sec: 50 }] }
    ] })
    const S = { unit: 'kg', workouts: [], exWeights: {}, customEx: [] }
    mergeWorkoutJSON(S, parsed)
    expect(S.workouts[0].entries.map(e => e.phase)).toEqual(['pre', 'main', 'post'])
    expect(S.exWeights['0025'].w).toBe(60)
    expect(S.workouts[0].vol).toBe(800)
    expect(() => parseWorkoutJSON({ name: 'Bad', d: '2026-11-12', entries: [{ id: '0025', phase: 'unknown', sets: [{ r: 5 }] }] })).toThrow()
  })
})
