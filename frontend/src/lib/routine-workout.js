import { buildSets } from './history.js'
import { nextPrescription, applyPrescription } from './progression.js'
import { routineSections, phaseOf, ROUTINE_PHASES } from './routine-sections.js'

export function routineWorkoutEntries(S, routine, included = {}) {
  return routineSections(routine).filter(({ phase }) => phase === 'main' || included[phase] !== false)
    .flatMap(({ phase, ex }) => ex.map((config, index) => {
      const target = { ...config, phase, ...(phase !== 'main' && !config.prog ? { prog: 'off' } : {}) }
      const plan = nextPrescription(S, target, routine)
      return {
        id: config.id, phase, sg: config.sg, target, plan,
        sets: applyPrescription(buildSets(S, target), plan),
        routineSource: { phase, index, config: { ...config } }
      }
    }))
}

export function insertPhaseEntry(active, entry) {
  const phase = phaseOf(entry)
  const later = active.entries.findIndex(e => ROUTINE_PHASES.indexOf(phaseOf(e)) > ROUTINE_PHASES.indexOf(phase))
  const index = later < 0 ? active.entries.length : later
  active.entries.splice(index, 0, entry)
  active.cur = index
}
