import { describe, expect, it } from 'vitest'
import { searchExercises } from './exercise-search.js'

const exercises = [
  { id: 'barbell', n: 'barbell bench press', tg: 'pectorals', bp: 'chest', eq: 'barbell' },
  { id: 'dumbbell', n: 'dumbbell curl', tg: 'biceps', bp: 'upper arms', eq: 'dumbbell' },
  { id: 'bench', n: 'bench press', tg: 'pectorals', bp: 'chest', eq: 'machine' },
  { id: 'custom', n: 'Élévation latérale', desc: 'Keep elbows soft', custom: true },
  { id: 'squat', n: 'squat', bp: 'upper legs', eq: 'barbell' }
]
const find = query => searchExercises(exercises, query).map(e => e.id)

describe('searchExercises', () => {
  it('preserves catalogue order when the query is empty', () => {
    expect(searchExercises(exercises, '  ')).toBe(exercises)
  })
  it('puts an exact name before a longer name containing it', () => {
    expect(find('bench press')).toEqual(['bench', 'barbell'])
  })
  it.each(['bnch press', 'bnech press', 'bench pres', 'press bench'])('finds omitted letters, typos, and reordered words: %s', query => {
    expect(find(query)).toContain('bench')
  })
  it('tolerates misspelled equipment names', () => {
    expect(find('dumbell curl')).toEqual(['dumbbell'])
  })
  it('supports ordered-letter abbreviations', () => {
    expect(find('brbl bnch')).toEqual(['barbell'])
  })
  it('matches across name, muscle, body part, and equipment', () => {
    expect(find('chest machine press')).toEqual(['bench'])
    expect(find('pectorals')).toEqual(['barbell', 'bench'])
  })
  it('ignores case, accents, punctuation, and repeated spaces', () => {
    expect(find(' ELEVATION--  laterale ')).toEqual(['custom'])
  })
  it('searches custom descriptions and tolerates missing metadata', () => {
    expect(find('elbows')).toEqual(['custom'])
  })
  it('requires every query term to match and rejects unrelated queries', () => {
    expect(find('bench banana')).toEqual([])
    expect(find('zzzz')).toEqual([])
  })
  it('does not fuzzy-match single-letter mistakes in short queries', () => {
    expect(find('zz')).toEqual([])
  })
  it('does not mutate the input list', () => {
    const before = [...exercises]
    find('bench')
    expect(exercises).toEqual(before)
  })
})
