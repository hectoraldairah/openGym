import { useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { allExercises } from '../lib/exercises.js'
import { parseWorkoutJSON, freshJSONWorkouts, mergeWorkoutJSON } from '../lib/import-workout-json.js'
import { fmtDate, fmtVol, todayISO, exCount } from '../lib/format.js'
import { setsDone, setLabel } from '../lib/history.js'
import { t } from '../lib/i18n.js'
import { Button } from './ui.jsx'

export default function WorkoutJsonImport({ close }) {
  const state = useStore(s => s.S)
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const preview = value => {
    setError('')
    try {
      const current = useStore.getState().S
      setParsed(parseWorkoutJSON(value, { unit: current.unit, exercises: allExercises(current) }))
    } catch (e) { setError(e.message) }
  }
  const pickFile = event => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { const value = String(reader.result); setText(value); preview(value) }
    reader.onerror = () => setError(t('Could not read that file'))
    reader.readAsText(file)
  }
  const importWorkouts = () => {
    try {
      let result
      useStore.getState().update(s => { result = mergeWorkoutJSON(s, parsed) })
      close()
      useUI.getState().toast(t('{0} workouts imported', result.added))
    } catch (e) { setError(e.message) }
  }
  const example = () => {
    setText(JSON.stringify({ unit: state.unit, workouts: [{
      name: 'Bench press', d: todayISO(), entries: [{ id: '0025', sets: [{ w: 60, r: 10, done: true }, { w: 60, r: 8, done: true }] }]
    }] }, null, 2))
    setError('')
  }
  const timedExample = () => {
    setText(JSON.stringify({
      unit: state.unit,
      customEx: [{ id: 'side-plank', n: 'Side plank', bp: 'waist' }],
      workouts: [{
        name: t('Core holds'), d: todayISO(), entries: [{
          id: 'side-plank',
          target: { mode: 'time', bodyweight: true, sets: 2, sec: 40 },
          sets: [{ sec: 40, w: 0, done: true }, { sec: 50, w: 0, done: true }]
        }]
      }]
    }, null, 2))
    setError('')
  }
  const fresh = parsed ? freshJSONWorkouts(state.workouts, parsed.workouts) : []
  const exerciseNames = new Map([...allExercises(state), ...(parsed?.customEx || [])].map(e => [e.id, e.n]))
  return <>
    <h3>{t('Import workouts from JSON')}</h3>
    {error && <div role="alert" className="small" style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</div>}
    {!parsed ? <>
      <div className="muted small" style={{ marginBottom: 12 }}>{t('Choose a JSON file or paste a workout below. You can import one workout, a list, or the workouts from an openGym backup.')}</div>
      <Button icon="folder" onClick={() => fileRef.current?.click()}>{t('Choose JSON file')}</Button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pickFile} />
      <label style={{ display: 'block', margin: '14px 0' }}>
        <span className="small muted">{t('Workout JSON')}</span>
        <textarea className="input" rows={9} spellCheck={false} value={text} onChange={e => setText(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
      </label>
      <Button size="sm" variant="ghost" onClick={example}>{t('Use example JSON')}</Button>
      <Button size="sm" variant="ghost" icon="timer" onClick={timedExample}>{t('Use timed exercise example')}</Button>
      <div className="small dim" style={{ margin: '8px 0 14px' }}>{t('If unit is omitted, weights use your profile unit ({0}).', state.unit)}</div>
      <Button variant="primary" disabled={!text.trim()} onClick={() => preview(text)}>{t('Preview import')}</Button>
    </> : <>
      <div className="tiles">
        <div className="tile"><div className="l">{t('Workouts')}</div><div className="v">{parsed.workouts.length}</div></div>
        <div className="tile"><div className="l">{t('New')}</div><div className="v">{fresh.length}</div></div>
        <div className="tile"><div className="l">{t('Sets')}</div><div className="v">{parsed.workouts.reduce((n, w) => n + setsDone(w), 0)}</div></div>
        <div className="tile"><div className="l">{t('Added as your own')}</div><div className="v">{parsed.customEx.length}</div></div>
      </div>
      {parsed.converted && <div className="small dim" style={{ marginBottom: 12 }}>{t('The file is in {0} and your profile is in {1} — weights will be converted.', parsed.fileUnit, parsed.unit)}</div>}
      {fresh.length < parsed.workouts.length && <div className="small dim" style={{ marginBottom: 12 }}>{t('{0} duplicate workouts will be skipped.', parsed.workouts.length - fresh.length)}</div>}
      <div className="list" style={{ marginBottom: 14 }}>
        {fresh.slice(0, 20).map(w => <div className="item" key={w.id}><div className="grow">
          <div className="tt">{w.name}</div>
          <div className="ss">{fmtDate(w.d)} · {exCount(w.entries.length)} · {fmtVol(w.vol, parsed.unit)}</div>
          {w.entries.map((entry, i) => <div key={i} style={{ marginTop: 8 }}>
            <div className="small capitalize">{exerciseNames.get(entry.id) || entry.id}</div>
            <div className="small muted">{entry.sets.filter(s => s.done).map(s => setLabel(entry.id, s, entry.target)).join(' · ') || t('no sets')}</div>
          </div>)}
        </div></div>)}
        {fresh.length > 20 && <div className="item small muted">+{fresh.length - 20}</div>}
      </div>
      <Button variant="primary" disabled={!fresh.length} onClick={importWorkouts}>{fresh.length ? t('Import') : t('Nothing new to import')}</Button>
      <div style={{ height: 8 }} />
      <Button variant="ghost" onClick={() => { setParsed(null); setError('') }}>{t('Edit JSON')}</Button>
    </>}
    <div style={{ height: 8 }} />
    <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
  </>
}
