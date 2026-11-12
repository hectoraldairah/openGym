export const ROUTINE_PHASES = ['pre', 'main', 'post']
export const PHASE_NAME = { pre: 'Pre-workout', main: 'Main workout', post: 'Post-workout' }
export const phaseOf = entry => entry?.phase || entry?.target?.phase || 'main'

export function phaseExercises(routine, phase = 'main') {
  return phase === 'main' ? routine?.ex || [] : routine?.[phase]?.ex || []
}

export function routineSections(routine, { includeDisabled = false } = {}) {
  return ROUTINE_PHASES.filter(phase => phase === 'main' || (routine?.[phase] && (includeDisabled || routine[phase].enabled !== false)))
    .map(phase => ({ phase, ex: phaseExercises(routine, phase) }))
}

export const routineExercises = (routine, options) => routineSections(routine, options).flatMap(section => section.ex)
