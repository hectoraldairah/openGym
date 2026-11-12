import { describe, expect, it } from 'vitest'
import { BODYPARTS, bodyPartName, matchesBodyPart } from './exercises.js'
import { musclesOf } from './muscles.js'

describe('body-part options', () => {
  it('includes legs, core, calves, and glutes with readable names', () => {
    expect(BODYPARTS).toEqual(expect.arrayContaining(['upper legs', 'waist', 'lower legs', 'glutes']))
    expect(bodyPartName('upper legs')).toBe('legs')
    expect(bodyPartName('waist')).toBe('core')
    expect(bodyPartName('lower legs')).toBe('calves')
    expect(bodyPartName('glutes')).toBe('glutes')
  })

  it('finds both built-in glute movements and custom glutes exercises', () => {
    expect(matchesBodyPart({ bp: 'upper legs', tg: 'glutes' }, 'glutes')).toBe(true)
    expect(matchesBodyPart({ bp: 'glutes', custom: true }, 'glutes')).toBe(true)
    expect(matchesBodyPart({ bp: 'upper legs', tg: 'quads' }, 'glutes')).toBe(false)
    expect(matchesBodyPart({ bp: 'upper legs', tg: 'glutes' }, 'upper legs')).toBe(true)
  })

  it('tracks a custom glutes exercise on the correct muscle-map region', () => {
    expect(musclesOf({ bp: 'glutes', tg: '', custom: true })).toEqual({ gluteal: 1 })
  })
})
