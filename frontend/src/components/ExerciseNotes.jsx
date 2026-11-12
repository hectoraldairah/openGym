import { useId, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { Button } from './ui.jsx'

// Personal notes belong to the exercise, so every routine and session sees the same cues.
export default function ExerciseNotes({ exerciseId }) {
  const note = useStore(s => s.S.exNotes?.[exerciseId] || '')
  const update = useStore(s => s.update)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const edit = () => { setDraft(note); setEditing(true) }
  const save = value => {
    const text = value.trim().slice(0, 1000)
    update(s => {
      s.exNotes ||= {}
      if (text) s.exNotes[exerciseId] = text
      else delete s.exNotes[exerciseId]
    })
    setEditing(false)
    useUI.getState().toast(t(text ? 'Notes saved' : 'Notes removed'))
  }

  return <div style={{ margin: '10px 0' }}>
    {editing ? <>
      <label className="small muted" htmlFor={inputId}>{t('Exercise notes')}</label>
      <textarea id={inputId} className="input" rows={3} maxLength={1000} autoFocus
        placeholder={t('Machine settings, technique cues, or reminders for next time…')}
        value={draft} onChange={e => setDraft(e.target.value)} />
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <Button size="sm" variant="primary" onClick={() => save(draft)}>{t('Save')}</Button>
        <Button size="sm" onClick={() => setEditing(false)}>{t('Cancel')}</Button>
        {note && <Button size="sm" variant="danger" icon="trash" onClick={() => save('')}>{t('Delete')}</Button>}
      </div>
    </> : note ? <>
      <div className="row between" style={{ marginBottom: 4 }}>
        <span className="small muted">{t('Exercise notes')}</span>
        <Button size="sm" variant="ghost" icon="pencil" onClick={edit}>{t('Edit')}</Button>
      </div>
      <div className="exnote" style={{ overflowWrap: 'anywhere' }}>{note}</div>
    </> : <Button size="sm" variant="ghost" icon="pencil" onClick={edit}>{t('Add exercise notes')}</Button>}
  </div>
}
