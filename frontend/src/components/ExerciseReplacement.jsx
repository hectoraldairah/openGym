import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { allExercises, exOr, equipmentOf, bodyPartName } from '../lib/exercises.js'
import { searchExercises } from '../lib/exercise-search.js'
import { replacementCandidates, replacementRoutineIndex } from '../lib/exercise-replacement.js'
import { t } from '../lib/i18n.js'
import { Thumb } from './Media.jsx'
import { Button, Segmented } from './ui.jsx'

export default function ExerciseReplacement({ entryIdx, onChoose, close }) {
  const state = useStore(s => s.S)
  const [query, setQuery] = useState('')
  const [sameGroup, setSameGroup] = useState(true)
  const [equipment, setEquipment] = useState('')
  const [permanent, setPermanent] = useState(false)
  const [shown, setShown] = useState(40)
  const entry = state.active?.entries[entryIdx]
  if (!entry) return <Button onClick={close}>{t('Cancel')}</Button>
  const source = exOr(entry.id)
  const all = allExercises(state).filter(e => e.id !== entry.id)
  const base = searchExercises(sameGroup ? replacementCandidates(source, all) : all, query)
  const equipmentOptions = equipmentOf(base)
  const filter = equipmentOptions.includes(equipment) ? equipment : ''
  const matches = filter ? base.filter(e => e.eq === filter) : base
  const canUpdateRoutine = replacementRoutineIndex(state, entryIdx) >= 0
  return <>
    <h3>{t('Replace exercise')}</h3>
    <div className="muted small capitalize" style={{ marginBottom: 12 }}>{source.n}</div>
    <Segmented value={canUpdateRoutine && permanent ? 'routine' : 'today'}
      options={[{ value: 'today', label: t('Only today') }, ...(canUpdateRoutine ? [{ value: 'routine', label: t('Also update routine') }] : [])]}
      onChange={v => setPermanent(v === 'routine')} />
    <div className="small dim" style={{ margin: '8px 0 12px' }}>{t('Completed sets stay with the original exercise. Configure the remaining sets for the replacement.')}</div>
    <div className="chips" style={{ marginBottom: 12 }}>
      <button className={'chip' + (sameGroup ? ' on' : '')} onClick={() => { setSameGroup(true); setEquipment(''); setShown(40) }}>{t('Same muscle group')}</button>
      <button className={'chip' + (!sameGroup ? ' on' : '')} onClick={() => { setSameGroup(false); setEquipment(''); setShown(40) }}>{t('All exercises')}</button>
    </div>
    <label>
      <span className="small muted">{t('Search…')}</span>
      <input className="input" placeholder={t('Search…')} value={query} onChange={e => { setQuery(e.target.value); setShown(40) }} />
    </label>
    {equipmentOptions.length > 1 && <div className="chips" style={{ margin: '12px 0' }}>
      <button className={'chip' + (!filter ? ' on' : '')} onClick={() => { setEquipment(''); setShown(40) }}>{t('Any equipment')}</button>
      {equipmentOptions.map(eq => <button key={eq} className={'chip' + (filter === eq ? ' on' : '')} onClick={() => { setEquipment(eq); setShown(40) }}>{t(eq)}</button>)}
    </div>}
    <div className="list" style={{ margin: '12px 0' }}>
      {matches.slice(0, shown).map(exercise => <button className="item" style={{ width: '100%', textAlign: 'left' }} key={exercise.id}
        onClick={() => { close(); onChoose(exercise, canUpdateRoutine && permanent) }}>
        <Thumb ex={exercise} />
        <div className="grow"><div className="tt capitalize">{exercise.n}</div><div className="ss capitalize">{exercise.tg ? t(exercise.tg) : bodyPartName(exercise.bp)} · {t(exercise.eq)}</div></div>
      </button>)}
      {!matches.length && <div className="empty">{t('No match')}</div>}
    </div>
    {matches.length > shown && <Button onClick={() => setShown(v => v + 40)}>{t('Show more')}</Button>}
    <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
  </>
}
