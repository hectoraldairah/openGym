import { describe, expect, it } from 'vitest'
import { workoutRecords } from './records.js'

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
