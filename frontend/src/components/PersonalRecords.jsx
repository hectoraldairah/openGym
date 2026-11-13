import { useMemo, useState } from 'react'
import { EXIDX } from '../lib/exercises.js'
import { personalRecords, RECORD_NAME } from '../lib/records.js'
import { searchExercises } from '../lib/exercise-search.js'
import { fmtDate } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { exerciseDetailSheet, prShareSheet } from '../sheets.jsx'
import { recordMeasure, recordSource } from '../lib/pr-share.js'
import { Thumb } from './Media.jsx'
import Icon from './Icon.jsx'
import { Button, Segmented } from './ui.jsx'

export default function PersonalRecords({ S }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('recent')
  const [shown, setShown] = useState(15)
  const records = useMemo(() => personalRecords(S.workouts), [S.workouts])
  const exercises = new Map(records.map(record => [record.id, EXIDX[record.id] || {
    id: record.id, n: record.name || t('Unknown exercise'), tg: '', bp: '', eq: ''
  }]))
  const matchingIds = new Set(searchExercises([...exercises.values()], query).map(e => e.id))
  const filtered = records.filter(record => matchingIds.has(record.id) &&
    (type === 'all' || (type === 'cardio' ? ['speed', 'cardioDuration'].includes(record.kind) : record.kind === type)))
    .sort((a, b) => sort === 'exercise'
      ? exercises.get(a.id).n.localeCompare(exercises.get(b.id).n, dateLocale()) || a.kind.localeCompare(b.kind)
      : b.d.localeCompare(a.d) || b.start - a.start || exercises.get(a.id).n.localeCompare(exercises.get(b.id).n, dateLocale()))
  return <section className="card">
    <h2 className="row" style={{ gap: 8 }}><Icon name="trophy" style={{ color: 'var(--yellow)' }} />{t('Personal records')}</h2>
    <div className="small muted" style={{ marginBottom: 12 }}>{t('{0} records across {1} exercises', records.length, exercises.size)}</div>
    {records.length ? <>
      <input className="input" aria-label={t('Search personal records')} placeholder={t('Search personal records')}
        value={query} onChange={e => { setQuery(e.target.value); setShown(15) }} />
      <div className="chips bodypart-chips" style={{ margin: '12px 0' }}>
        {[
          ['all', 'All'], ['weight', 'Weight'], ['e1rm', 'Est. 1RM'], ['reps', 'Reps'], ['time', 'Time'], ['cardio', 'Cardio']
        ].map(([value, label]) => <button className={'chip' + (type === value ? ' on' : '')} key={value} onClick={() => { setType(value); setShown(15) }}>{t(label)}</button>)}
      </div>
      <Segmented value={sort} onChange={value => { setSort(value); setShown(15) }} options={[{ value: 'recent', label: t('Most recent') }, { value: 'exercise', label: t('Exercise') }]} />
      <div className="list" style={{ marginTop: 12 }}>
        {filtered.slice(0, shown).map(record => {
          const exercise = exercises.get(record.id)
          return <div className="item" key={`${record.id}:${record.kind}`} role="button" tabIndex={0}
            style={{ gap: 10, cursor: 'pointer', flexWrap: 'wrap' }} onClick={() => prShareSheet(record)}
            onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); prShareSheet(record) } }}>
            <Thumb ex={exercise} />
            <div className="grow" style={{ minWidth: 120 }}>
              <div className="tt capitalize">{exercise.n}</div>
              <div className="ss">{t(RECORD_NAME[record.kind])} · {fmtDate(record.d)}</div>
              <div className="small dim" style={{ marginTop: 3 }}>{recordSource(record, S)}</div>
            </div>
            <strong style={{ color: 'var(--yellow)', fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>{recordMeasure(record, S)}</strong>
            {EXIDX[record.id] && <button className="iconbtn" aria-label={t('Details')} onClick={event => { event.stopPropagation(); exerciseDetailSheet(exercise) }}><Icon name="info" /></button>}
          </div>
        })}
        {!filtered.length && <div className="empty">{t('No match')}</div>}
      </div>
      {filtered.length > shown && <div style={{ marginTop: 10 }}><Button onClick={() => setShown(value => value + 15)}>{t('Show more')} ({filtered.length - shown})</Button></div>}
      <div className="small dim" style={{ marginTop: 12 }}>{t('Your current all-time bests. Tap a record to create a shareable card. Estimated 1RM is calculated, not a tested max.')}</div>
    </> : <div className="muted small">{t('Finish a workout to see your personal records here.')}</div>}
  </section>
}
