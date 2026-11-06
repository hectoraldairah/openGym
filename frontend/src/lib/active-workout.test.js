import { describe, expect, it } from 'vitest'
import { removeActiveExercise, supersetUnits, setsDoneActive, workoutVolume } from './history.js'

const entry = (id, sg) => ({ id, ...(sg ? { sg } : {}), sets: [{ w: 50, r: 10, done: false }] })

describe('removing exercises during a workout', () => {
  it('moves to the next exercise when removing the current one', () => {
    const A = { cur: 1, entries: [entry('a'), entry('b'), entry('c')] }
    removeActiveExercise(A, 1)
    expect(A.entries.map(e => e.id)).toEqual(['a', 'c'])
    expect(A.entries[A.cur].id).toBe('c')
  })

  it('keeps the selected exercise when removing an earlier or later entry', () => {
    const A = { cur: 1, entries: [entry('a'), entry('b'), entry('c')] }
    removeActiveExercise(A, 0)
    expect(A.cur).toBe(0)
    expect(A.entries[A.cur].id).toBe('b')
    removeActiveExercise(A, 1)
    expect(A.entries[A.cur].id).toBe('b')
  })

  it('falls back to the previous entry, then supports an empty workout and adding again', () => {
    const A = { cur: 1, entries: [entry('a'), entry('b')] }
    removeActiveExercise(A, 1)
    expect(A.cur).toBe(0)
    expect(A.entries[A.cur].id).toBe('a')
    removeActiveExercise(A, 0)
    expect(A).toEqual({ cur: 0, entries: [] })
    expect(setsDoneActive(A)).toBe(0)
    A.entries.push(entry('replacement'))
    expect(A.entries[A.cur].id).toBe('replacement')
  })

  it('unlinks an orphaned superset partner and preserves other supersets', () => {
    const A = { cur: 0, entries: [entry('a', 'one'), entry('b', 'one'), entry('c', 'two'), entry('d', 'two')] }
    removeActiveExercise(A, 0)
    expect(A.entries[0].sg).toBeUndefined()
    expect(supersetUnits(A.entries)).toEqual([[0], [1, 2]])
  })

  it('keeps a larger superset together after removing its middle exercise', () => {
    const A = { cur: 0, entries: [entry('a', 'one'), entry('b', 'one'), entry('c', 'one')] }
    removeActiveExercise(A, 1)
    expect(supersetUnits(A.entries)).toEqual([[0, 1]])
  })

  it('excludes removed sets from progress and volume while retaining the other logs', () => {
    const A = { cur: 0, entries: [entry('a'), entry('b')] }
    A.entries.forEach(e => { e.sets[0].done = true })
    const retained = A.entries[1]
    removeActiveExercise(A, 0)
    expect(A.entries[0]).toBe(retained)
    expect(setsDoneActive(A)).toBe(1)
    expect(workoutVolume(A)).toBe(500)
  })

  it('ignores invalid indices and an ended workout', () => {
    const A = { cur: 0, entries: [entry('a')] }
    const before = structuredClone(A)
    for (const idx of [-1, 1, 0.5, undefined]) removeActiveExercise(A, idx)
    expect(A).toEqual(before)
    expect(() => removeActiveExercise(null, 0)).not.toThrow()
  })
})
