import { BODYPARTS, EXDB } from './exercises.js'
import { workoutVolume, bestWeightFor } from './history.js'
import { convertWeight } from './weight.js'
import { isoOf, uid } from './format.js'
import { t } from './i18n.js'
import { ROUTINE_PHASES, phaseOf } from './routine-sections.js'

const object = value => value && typeof value === 'object' && !Array.isArray(value)
const validId = value => typeof value === 'string' && /^[\w-]{1,128}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value)
const fail = message => { throw new Error(t(message)) }
function number(value, fallback = 0) {
  if (value == null) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail('Measurements must be finite, non-negative numbers.')
  return value
}

export function parseWorkoutJSON(raw, { unit = 'kg', exercises = EXDB } = {}) {
  let data
  try { data = typeof raw === 'string' ? JSON.parse(raw) : raw }
  catch { fail('Invalid JSON. Check the file syntax.') }
  const list = Array.isArray(data) ? data : object(data) && Array.isArray(data.workouts) ? data.workouts : object(data) && Array.isArray(data.entries) ? [data] : null
  if (!list?.length) fail('Provide a workout, an array of workouts, or an object containing workouts.')
  const fileUnit = !Array.isArray(data) && data.unit != null ? data.unit : unit
  if (!['kg', 'lb'].includes(fileUnit)) fail('The unit must be kg or lb.')
  const weight = value => convertWeight(number(value), fileUnit, unit)
  const known = new Map(exercises.map(e => [e.id, e]))
  const definitions = new Map()
  if (object(data) && data.customEx != null) {
    if (!Array.isArray(data.customEx)) fail('customEx must be an array.')
    data.customEx.forEach(e => {
      if (!object(e) || !validId(e.id)) fail('Each exercise needs a valid id.')
      if (definitions.has(e.id)) fail('Exercise ids must be unique in customEx.')
      definitions.set(e.id, e)
    })
  }
  const customEx = new Map()
  const workouts = list.map((w, index) => {
    try {
      if (!object(w) || typeof w.name !== 'string' || !w.name.trim()) fail('Each workout needs a name.')
      if (typeof w.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(w.d)) fail('Use YYYY-MM-DD for the workout date (d).')
      const day = new Date(w.d + 'T12:00:00')
      if (!Number.isFinite(+day) || isoOf(day) !== w.d) fail('The workout date is invalid.')
      const start = number(w.start, +day)
      const end = number(w.end, start)
      if (!Number.isFinite(+new Date(start)) || !Number.isFinite(+new Date(end)) || end < start) fail('Workout timestamps are invalid or end precedes start.')
      if (!Array.isArray(w.entries) || !w.entries.length) fail('Each workout needs exercise entries.')
      const entries = w.entries.map(e => {
        if (!object(e) || !validId(e.id)) fail('Each exercise needs a valid id.')
        const definition = definitions.get(e.id)
        const existing = known.get(e.id)
        if (existing && definition && definition.n !== existing.n) fail('A custom exercise id belongs to a different exercise here.')
        if (!existing && !customEx.has(e.id)) {
          const ex = definition || e
          if (typeof ex.n !== 'string' || !ex.n.trim() || !BODYPARTS.includes(ex.bp)) fail('Unknown exercises need a name (n) and a valid body part (bp), in the entry or customEx.')
          customEx.set(e.id, { id: e.id, n: ex.n.trim().slice(0, 200), bp: ex.bp, tg: '', eq: 'custom', custom: true, desc: typeof ex.desc === 'string' ? ex.desc.slice(0, 1000) : '' })
        }
        if (!Array.isArray(e.sets) || !e.sets.length) fail('Each exercise needs at least one set.')
        if (e.target != null && !object(e.target)) fail('The exercise target must be an object.')
        const sourceTarget = e.target || {}
        const phase = e.phase ?? sourceTarget.phase ?? 'main'
        if (!ROUTINE_PHASES.includes(phase)) fail('The workout phase must be pre, main, or post.')
        if (sourceTarget.mode != null && !['reps', 'time', 'cardio'].includes(sourceTarget.mode)) fail('The exercise mode must be reps, time, or cardio.')
        const mode = sourceTarget.mode || (e.sets[0]?.sec != null ? 'time' : e.sets[0]?.min != null ? 'cardio' : 'reps')
        const target = { mode, phase }
        for (const field of ['weight', 'inc']) if (sourceTarget[field] != null) target[field] = weight(sourceTarget[field])
        for (const field of ['sets', 'reps', 'sec', 'min', 'speed', 'repsMin', 'repsMax']) if (sourceTarget[field] != null) target[field] = number(sourceTarget[field])
        for (const field of ['bodyweight', 'side']) if (sourceTarget[field] != null) {
          if (typeof sourceTarget[field] !== 'boolean') fail('Bodyweight and side flags must be booleans.')
          target[field] = sourceTarget[field]
        }
        if (sourceTarget.prog != null) {
          if (typeof sourceTarget.prog !== 'string') fail('The progression rule must be a string.')
          target.prog = sourceTarget.prog
        }
        const sets = e.sets.map(s => {
          if (!object(s) || (s.done != null && typeof s.done !== 'boolean')) fail('Each set must be an object with an optional boolean done field.')
          const set = { done: s.done ?? true }
          if (mode === 'cardio') {
            if (s.min == null || s.r != null || s.sec != null) fail('Cardio sets need min and optional speed.')
            set.min = number(s.min); set.speed = number(s.speed)
          } else if (mode === 'time') {
            if (s.sec == null || s.r != null || s.min != null) fail('Timed sets need sec and optional w.')
            set.sec = number(s.sec); set.w = weight(s.w)
          } else {
            if (s.r == null || s.sec != null || s.min != null) fail('Rep sets need r and optional w.')
            set.r = number(s.r); set.w = weight(s.w)
            if (!Number.isInteger(set.r)) fail('Repetitions must be whole numbers.')
            for (const field of ['rir', 'rpe']) if (s[field] != null) {
              set[field] = number(s[field])
              if (set[field] > 10 || (field === 'rpe' && set[field] < 6)) fail('RIR must be between 0 and 10; RPE between 6 and 10.')
            }
          }
          return set
        })
        return { id: e.id, phase, sets, target, topW: e.topW == null ? null : weight(e.topW) }
      })
      if (!entries.some(e => e.sets.some(s => s.done))) fail('Each workout needs at least one completed set.')
      if (w.id != null && !validId(w.id)) fail('The workout id is invalid.')
      const result = { id: w.id || uid(), d: w.d, name: w.name.trim().slice(0, 200), start, end, routineId: null, bw: w.bw == null ? null : weight(w.bw), entries, prs: [] }
      result.vol = workoutVolume(result)
      return result
    } catch (error) {
      throw new Error(t('Workout {0}: {1}', index + 1, error.message))
    }
  })
  return { workouts, customEx: [...customEx.values()], fileUnit, unit, converted: fileUnit !== unit }
}

// IDs catch exported copies; the content key also catches repeated hand-written JSON without IDs.
const fingerprint = w => JSON.stringify([w.d, w.name, w.start, w.end, w.entries.map(e => [e.id, phaseOf(e), e.sets.map(s => [!!s.done, s.w || 0, s.r ?? null, s.sec ?? null, s.min ?? null, s.speed ?? null, s.rir ?? null, s.rpe ?? null])])])
export function freshJSONWorkouts(existing, incoming) {
  const ids = new Set(existing.map(w => w.id))
  const content = new Set(existing.map(fingerprint))
  return incoming.filter(w => {
    const key = fingerprint(w)
    if (ids.has(w.id) || content.has(key)) return false
    ids.add(w.id); content.add(key)
    return true
  })
}

export function mergeWorkoutJSON(S, parsed) {
  if (S.unit !== parsed.unit) fail('Your weight unit changed. Preview the JSON again before importing.')
  const fresh = freshJSONWorkouts(S.workouts, parsed.workouts)
  const used = new Set(fresh.flatMap(w => w.entries.map(e => e.id)))
  S.customEx ||= []
  parsed.customEx.filter(e => used.has(e.id)).forEach(e => {
    if (!S.customEx.some(x => x.id === e.id)) S.customEx.push(e)
  })
  S.exWeights ||= {}
  const history = [...S.workouts]
  fresh.sort((a, b) => a.start - b.start).forEach(w => {
    const previous = { workouts: history.filter(x => x.start <= w.start) }
    w.prs = [...new Set(w.entries.filter(e => Math.max(0, ...e.sets.filter(s => s.done).map(s => s.w || 0)) > bestWeightFor(previous, e.id)).map(e => e.id))]
    history.push(w)
    w.entries.forEach(e => {
      if (phaseOf(e) !== 'main') return
      const max = Math.max(0, ...e.sets.filter(s => s.done).map(s => s.w || 0), e.sets.some(s => s.done) ? e.topW || 0 : 0)
      const current = S.exWeights[e.id]
      if (max > 0 && (!current || w.d >= current.d)) S.exWeights[e.id] = { w: max, d: w.d }
    })
  })
  S.workouts = history.sort((a, b) => a.d.localeCompare(b.d) || a.start - b.start)
  return { added: fresh.length, skipped: parsed.workouts.length - fresh.length }
}
