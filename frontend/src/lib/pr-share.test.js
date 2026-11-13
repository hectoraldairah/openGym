import { describe, expect, it } from 'vitest'
import { personalRecords, recordComparison, newWorkoutRecords } from './records.js'
import { buildPRSlides, recordMeasure, recordSource } from './pr-share.js'

const workout = (id, day, weight) => ({
  id, name: 'Upper A', d: day, start: +new Date(day + 'T12:00:00'), end: +new Date(day + 'T13:00:00'),
  entries: [{ id: '0025', sets: [{ w: weight, r: 5, done: true }] }]
})
const recordOf = (history, kind = 'weight') => personalRecords(history).find(r => r.kind === kind)

describe('PR sharing data', () => {
  it('builds the same progress card for a record captured immediately at workout completion', () => {
    const first = workout('first', '2026-11-01', 60)
    const source = workout('source', '2026-11-02', 70)
    const state = { unit: 'kg', workouts: [first] }
    const record = newWorkoutRecords(state, source).find(record => record.kind === 'weight')
    state.workouts.push(source)
    const slides = buildPRSlides(record, state)
    expect(slides[0].value).toBe('70 kg')
    expect(slides[1].value).toBe('+10 kg')
    expect(slides[1].stats.map(stat => stat.value)).toEqual(['60 kg', '70 kg'])
    expect(slides[2].title).toBe(source.name)
  })
  it('compares against the best before the selected workout, excluding later sessions', () => {
    const first = workout('first', '2026-11-01', 60)
    const source = workout('source', '2026-11-02', 70)
    const later = workout('later', '2026-11-03', 80)
    const record = recordOf([first, source])
    const comparison = recordComparison(record, [later, first, source])
    expect(comparison.previous.value).toBe(60)
    expect(comparison.delta).toBe(10)
    expect(comparison.percent).toBe(16.7)
  })

  it('never invents a previous value or percentage for a first record', () => {
    const source = workout('source', '2026-11-02', 70)
    const record = recordOf([source])
    expect(recordComparison(record, [source])).toEqual({ previous: null, delta: null, percent: null })
    const slides = buildPRSlides(record, { unit: 'kg', workouts: [source] })
    expect(slides[1].subtitle).toBe('First recorded mark')
    expect(slides[1].value).toBe('70 kg')
    expect(slides[1].stats).toEqual([])
  })

  it('compares separate sessions on the same day using their start times', () => {
    const first = workout('first', '2026-11-01', 60)
    const source = { ...workout('source', '2026-11-01', 70), start: first.start + 3600000 }
    expect(recordComparison(recordOf([first, source]), [source, first]).delta).toBe(10)
  })

  it('keeps the reference set and clearly labels estimated records', () => {
    const source = workout('source', '2026-11-02', 60)
    const record = recordOf([source], 'e1rm')
    const state = { unit: 'kg', workouts: [source] }
    const slides = buildPRSlides(record, state, 'Ana')
    expect(slides.map(slide => slide.kind)).toEqual(['record', 'progress', 'workout'])
    expect(slides.every(slide => slide.estimate && slide.metric === 'Est. 1RM')).toBe(true)
    expect(slides[0].name).toBe('Ana')
    expect(recordSource(record, state)).toBe('60×5 kg')
    expect(slides[0].date).toContain('2026')
  })

  it('converts weights consistently with the exercise display unit', () => {
    const record = { id: '0025', kind: 'weight', value: 100 }
    expect(recordMeasure(record, { unit: 'kg', exUnits: { '0025': 'lb' } })).toBe('220.5 lb')
    expect(recordMeasure({ ...record, kind: 'time', value: 50 }, { unit: 'kg' })).toBe('0:50')
    expect(recordMeasure({ ...record, kind: 'cardioDuration', value: 20 }, { unit: 'lb' })).toBe('20:00')
  })

  it('uses completed sets for the session summary and does not invent a duration', () => {
    const source = workout('source', '2026-11-02', 60)
    source.end = source.start
    source.entries[0].sets.push({ w: 100, r: 20, done: false })
    const slide = buildPRSlides(recordOf([source]), { unit: 'kg', workouts: [source] })[2]
    expect(slide.stats).toEqual([
      { label: 'Duration', value: 'Not recorded' },
      { label: 'Sets', value: '1' },
      { label: 'Volume', value: '300 kg' }
    ])
  })
})
