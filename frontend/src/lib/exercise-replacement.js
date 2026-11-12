import { isCardio } from './exercises.js'
import { defaultConfig, lastEntryFor, modeOf, buildSets } from './history.js'
import { musclesOf } from './muscles.js'
import { nextPrescription, applyPrescription } from './progression.js'
import { t } from './i18n.js'

export function replacementCandidates(source, exercises) {
  const muscles = musclesOf(source)
  return exercises.filter(e => e.id !== source.id).map((exercise, index) => {
    const target = musclesOf(exercise)
    const overlap = Object.keys(muscles).some(m => muscles[m] >= 0.5 && target[m] >= 0.5)
    const score = (source.tg && exercise.tg === source.tg ? 8 : 0) + (overlap ? 4 : 0) + (source.bp && exercise.bp === source.bp ? 2 : 0)
    return { exercise, index, score }
  }).filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(x => x.exercise)
}

const sameConfig = (a, b) => JSON.stringify(Object.keys(a || {}).sort().map(k => [k, a[k]])) === JSON.stringify(Object.keys(b || {}).sort().map(k => [k, b[k]]))

// Active entries carry their original routine slot so repeated exercises and temporary
// substitutions can still update exactly the right occurrence later in the session.
export function replacementRoutineIndex(S, index) {
  const entry = S.active?.entries[index]
  const routine = S.routines.find(r => r.id === S.active?.routineId)
  if (!entry || !routine || entry.routineSource === null) return -1
  const source = entry.routineSource
  const config = source?.config || entry.target
  if (!config) return -1
  if (source && sameConfig(routine.ex[source.index], config)) return source.index
  const matches = routine.ex.map((e, i) => sameConfig(e, config) ? i : -1).filter(i => i >= 0)
  return matches.length === 1 ? matches[0] : -1
}

export function replacementConfig(S, index, exercise) {
  const old = S.active.entries[index]
  const mode = isCardio(exercise) ? 'cardio' : modeOf({ ...old.target, id: old.id }) === 'time' ? 'time' : 'reps'
  const config = defaultConfig(exercise.id, mode)
  config.sets = Math.max(1, old.sets.filter(s => !s.done).length)
  const last = lastEntryFor(S, exercise.id)
  const previous = last?.sets[0]
  if (mode === 'time') config.sec = previous?.sec || old.target?.sec || config.sec
  else if (mode === 'reps') config.reps = previous?.r || old.target?.reps || config.reps
  if (mode !== 'cardio') config.weight = S.exWeights[exercise.id]?.w || previous?.w || 0
  return config
}

// Mutate a store draft. Logged sets stay under the original exercise; loads and history
// for different machines never migrate to the replacement exercise.
export function replaceActiveExercise(S, index, exercise, config, { updateRoutine = false, activeId, originalId } = {}) {
  const active = S.active
  const old = active?.entries[index]
  if (!old || (activeId && active.id !== activeId) || (originalId && old.id !== originalId)) throw new Error(t('The workout changed. Choose the exercise again.'))
  if (exercise.id === old.id) throw new Error(t('Choose a different exercise.'))
  if (!old.sets.some(s => !s.done)) throw new Error(t('This exercise has no remaining sets to replace.'))
  const routine = S.routines.find(r => r.id === active.routineId)
  const slot = replacementRoutineIndex(S, index)
  if (updateRoutine && slot < 0) throw new Error(t('The original routine changed. Replace only for today or reopen the selector.'))
  const source = old.routineSource || (slot >= 0 ? { index: slot, config: { ...routine.ex[slot] } } : null)
  const full = { ...config, id: exercise.id }
  if (old.sg) full.sg = old.sg
  else delete full.sg
  const plan = nextPrescription(S, full, routine)
  const replacement = {
    id: exercise.id, target: full, plan,
    sets: applyPrescription(buildSets(S, full), plan),
    routineSource: source
  }
  if (old.sg) replacement.sg = old.sg
  if (updateRoutine) {
    const planned = { ...full, sets: routine.ex[slot].sets || full.sets }
    if (routine.ex[slot].sg) planned.sg = routine.ex[slot].sg
    else delete planned.sg
    routine.ex[slot] = planned
    replacement.routineSource = { index: slot, config: { ...planned } }
  }
  const logged = old.sets.filter(s => s.done)
  if (logged.length) {
    // Keep the replacement adjacent to every superset partner, even when the replaced
    // exercise was the second/third member. Archive its logs before the whole group.
    let groupStart = index
    while (old.sg && groupStart > 0 && active.entries[groupStart - 1].sg === old.sg) groupStart--
    old.sets = logged
    delete old.sg
    if (old.target) { old.target = { ...old.target }; delete old.target.sg }
    active.entries[index] = replacement
    active.entries.splice(groupStart, 0, old)
    active.cur = index + 1
  } else {
    active.entries[index] = replacement
    active.cur = index
  }
  return replacement
}
