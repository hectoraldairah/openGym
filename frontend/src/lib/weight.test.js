import { describe, expect, it } from 'vitest'
import { convertWeight, displayWeight, exerciseWeightUnit } from './weight.js'
import { buildSets, workoutVolume, bestWeightFor } from './history.js'

describe('per-exercise weight units', () => {
  it('defaults existing profiles to their unit and remembers independent choices', () => {
    expect(exerciseWeightUnit({ unit: 'lb' }, 'bench')).toBe('lb')
    const S = { unit: 'kg', exUnits: { bench: 'kg', machine: 'lb' } }
    const restored = JSON.parse(JSON.stringify(S))
    expect(exerciseWeightUnit(restored, 'bench')).toBe('kg')
    expect(exerciseWeightUnit(restored, 'machine')).toBe('lb')
    expect(exerciseWeightUnit(restored, 'squat')).toBe('kg')
  })

  it('converts both directions without rounding stored weights', () => {
    expect(convertWeight(100, 'lb', 'kg')).toBeCloseTo(45.359237, 6)
    expect(displayWeight(100, 'kg', 'lb')).toBe(220.46)
    expect(convertWeight(convertWeight(185, 'lb', 'kg'), 'kg', 'lb')).toBeCloseTo(185, 10)
    expect(displayWeight(0, 'kg', 'lb')).toBe(0)
    expect(convertWeight(62.5, 'kg', 'kg')).toBe(62.5)
  })

  it('keeps mixed-unit workouts comparable and carries the correct load forward', () => {
    const machineWeight = convertWeight(100, 'lb', 'kg')
    const workout = { entries: [
      { id: 'bench', sets: [{ w: 60, r: 10, done: true }] },
      { id: 'machine', sets: [{ w: machineWeight, r: 10, done: true }] },
    ] }
    const S = { unit: 'kg', exUnits: { machine: 'lb' }, exWeights: {}, workouts: [workout] }
    expect(workoutVolume(workout)).toBeCloseTo((60 + machineWeight) * 10)
    expect(bestWeightFor(S, 'machine')).toBe(machineWeight)
    const sets = buildSets(S, { id: 'machine', mode: 'reps', sets: 1, reps: 10 })
    expect(sets[0].w).toBe(machineWeight)
    expect(displayWeight(sets[0].w, S.unit, exerciseWeightUnit(S, 'machine'))).toBe(100)
    // Toggling the preference never rewrites a completed set.
    S.exUnits.machine = 'kg'
    expect(displayWeight(sets[0].w, S.unit, exerciseWeightUnit(S, 'machine'))).toBe(45.36)
    expect(workout.entries[1].sets[0].w).toBe(machineWeight)
  })
})
