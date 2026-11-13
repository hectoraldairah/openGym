import { EXIDX } from './exercises.js'
import { fmtNum, fmtVol, fmtDur } from './format.js'
import { fmtSec, setLabel, setsDone, workoutVolume } from './history.js'
import { exerciseWeightUnit, displayWeight } from './weight.js'
import { RECORD_NAME, recordComparison } from './records.js'
import { t, dateLocale } from './i18n.js'

export function recordMeasure(record, state) {
  const unit = exerciseWeightUnit(state, record.id)
  if (['weight', 'e1rm'].includes(record.kind)) return fmtNum(displayWeight(record.value, state.unit, unit)) + ' ' + unit
  if (record.kind === 'reps') return t('{0} reps', fmtNum(record.value))
  if (record.kind === 'time') return fmtSec(record.value)
  if (record.kind === 'cardioDuration') return fmtSec(record.value * 60)
  return fmtNum(record.value) + ' km/h'
}

export function recordSource(record, state) {
  if (record.confirmed) return t('Confirmed working weight')
  if (!record.set) return ''
  const unit = exerciseWeightUnit(state, record.id)
  const set = { ...record.set, w: displayWeight(record.set.w, state.unit, unit) }
  const mode = ['speed', 'cardioDuration'].includes(record.kind) ? 'cardio' : record.kind === 'time' || record.set.sec != null ? 'time' : 'reps'
  return setLabel(record.id, set, { ...record.target, mode }) + (set.w > 0 ? ' ' + unit : '')
}

export function buildPRSlides(record, state, name = '') {
  const workout = state.workouts.find(w => w.id === record.workoutId)
  const comparison = recordComparison(record, state.workouts)
  const exercise = EXIDX[record.id]?.n || record.name || t('Unknown exercise')
  const date = new Date(record.d + 'T12:00:00').toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' })
  const common = { exercise, date, name, metric: t(RECORD_NAME[record.kind]), estimate: record.kind === 'e1rm' }
  return [
    {
      ...common, kind: 'record', kicker: t('Personal record'), title: exercise,
      value: recordMeasure(record, state), subtitle: recordSource(record, state),
      caption: t('A new milestone.'), stats: []
    },
    {
      ...common, kind: 'progress', kicker: t('My progress'), title: exercise,
      value: comparison.previous ? '+' + recordMeasure({ ...record, value: comparison.delta }, state) : recordMeasure(record, state),
      subtitle: comparison.previous ? t('{0}% improvement', fmtNum(comparison.percent)) : t('First recorded mark'),
      caption: comparison.previous ? t('Stronger than before.') : t('Your baseline starts here.'),
      stats: comparison.previous ? [
        { label: t('Previous best:'), value: recordMeasure(comparison.previous, state) },
        { label: t('New best'), value: recordMeasure(record, state) }
      ] : []
    },
    {
      ...common, kind: 'workout', kicker: t('The session'), title: workout?.name || exercise,
      value: recordMeasure(record, state), subtitle: exercise,
      caption: t('Showing up pays off.'),
      stats: workout ? [
        { label: t('Duration'), value: workout.end - workout.start >= 60000 ? fmtDur(workout.end - workout.start) : t('Not recorded') },
        { label: t('Sets'), value: String(setsDone(workout)) },
        { label: t('Volume'), value: fmtVol(workoutVolume(workout), state.unit) }
      ] : []
    }
  ]
}
