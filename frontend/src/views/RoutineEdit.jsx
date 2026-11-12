import { useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import { exOr } from '../lib/exercises.js'
import { uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { supersetUnits, cleanupSg, exLine, defaultConfig } from '../lib/history.js'
import { Thumb } from '../components/Media.jsx'
import { glyphPicker, exercisePicker, exConfigSheet, confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { Button, SelectRow, Switch } from '../components/ui.jsx'
import { POLICIES_FOR, POLICY_NAME, POLICY_DESC } from '../lib/progression.js'
import BodyMap from '../components/BodyMap.jsx'
import { loadOfRoutine, rankOf, MUSCLE_NAME } from '../lib/muscles.js'
import { phaseExercises, routineExercises, PHASE_NAME } from '../lib/routine-sections.js'

function RoutineBlock({ routine, phase }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const optional = phase !== 'main'
  const enabled = !optional || (!!routine[phase] && routine[phase].enabled !== false)
  const exercises = phaseExercises(routine, phase)
  const edit = fn => update(s => {
    const current = s.routines.find(r => r.id === routine.id)
    if (current) fn(phaseExercises(current, phase))
  })
  const move = (i, dir) => edit(ex => {
    const j = i + dir
    if (j < 0 || j >= ex.length) return
    ;[ex[i], ex[j]] = [ex[j], ex[i]]
    cleanupSg(ex)
  })
  const toggleLink = i => edit(ex => {
    if (i < 1) return
    const current = ex[i], previous = ex[i - 1]
    if (current.sg && previous.sg === current.sg) delete current.sg
    else { const sg = previous.sg || ('sg' + uid()); previous.sg = sg; current.sg = sg }
    cleanupSg(ex)
  })
  const units = supersetUnits(exercises)
  const first = new Set(units.filter(u => u.length > 1).map(u => u[0]))
  const linked = new Set(units.filter(u => u.length > 1).flat())
  const policyRoutine = optional ? { ...routine, prog: 'off' } : routine
  return <section style={{ marginBottom: 20 }}>
    <div className="row between" style={{ marginBottom: 10, gap: 12 }}>
      <div><h2 style={{ margin: 0 }}>{t(PHASE_NAME[phase])}</h2>{optional && <div className="small dim">{t(phase === 'pre' ? 'Optional mobility and warm-up before your main workout.' : 'Optional stretches and cooldown after your main workout.')}</div>}</div>
      {optional && <Switch aria-label={t(PHASE_NAME[phase])} checked={enabled} onChange={value => update(s => {
        const current = s.routines.find(r => r.id === routine.id)
        if (current) current[phase] = { ...(current[phase] || { ex: [] }), enabled: value }
      })} />}
    </div>
    {enabled && <>
      {exercises.length ? <div className="list">{exercises.map((e, i) => {
        const ex = exOr(e.id)
        const linkedPrevious = i > 0 && e.sg && exercises[i - 1].sg === e.sg
        return <div key={`${i}:${e.id}`}>
          {first.has(i) && <div className="ss-label"><Icon name="link" />{t('Superset')}</div>}
          <div className={'item' + (linked.has(i) ? ' in-ss' : '')} onClick={() => exConfigSheet(ex, e,
            cfg => edit(list => { list[i] = { id: list[i].id, sg: list[i].sg, ...cfg } }),
            () => edit(list => { list.splice(i, 1); cleanupSg(list) }), policyRoutine)}>
            <Thumb ex={ex} />
            <div className="grow"><div className="tt capitalize">{ex.n}</div><div className="ss">{exLine(e, S.unit)}</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none', alignItems: 'center' }}>
              {i > 0 && <button className={'iconbtn' + (linkedPrevious ? ' on-ss' : '')} title={t('Superset with exercise above')} style={{ width: 32, height: 28, borderRadius: 8, fontSize: 15 }} onClick={event => { event.stopPropagation(); toggleLink(i) }}><Icon name="link" /></button>}
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="iconbtn" aria-label={t('Move up')} style={{ width: 28, height: 24, fontSize: 12 }} onClick={event => { event.stopPropagation(); move(i, -1) }}><Icon name="chevronUp" /></button>
                <button className="iconbtn" aria-label={t('Move down')} style={{ width: 28, height: 24, fontSize: 12 }} onClick={event => { event.stopPropagation(); move(i, 1) }}><Icon name="chevronDown" /></button>
              </div>
            </div>
          </div>
        </div>
      })}</div> : <div className="small muted" style={{ margin: '12px 0' }}>{t('No exercises yet — add your first one.')}</div>}
      <div style={{ height: 10 }} />
      <Button icon="plus" variant={optional ? 'tinted' : 'primary'} onClick={() => exercisePicker(ex => {
        const initial = optional ? { ...defaultConfig(ex.id), sets: 1, prog: 'off' } : null
        exConfigSheet(ex, initial, cfg => edit(list => { list.push({ id: ex.id, ...cfg }) }), null, policyRoutine)
      })}>{t('Add exercise')}</Button>
    </>}
  </section>
}

export default function RoutineEdit() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const r = S.routines.find(x => x.id === id)
  useEffect(() => { if (!r) nav('/plan') }, [!!r])
  if (!r) return null

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/plan')} aria-label={t('Plan')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px' }}>
        <input className="input" defaultValue={r.name} style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-.021em' }}
          onChange={e => update(s => { s.routines.find(x => x.id === id).name = e.target.value.trim() || t('Routine') })} />
      </div>
      <button className="iconbtn" aria-label={t('Pick an icon')} onClick={() => glyphPicker(r.emoji, g => update(s => { s.routines.find(x => x.id === id).emoji = g }))}><Icon name={glyphOf(r.emoji)} /></button>
    </div>

    <div className="sect-b" style={{ marginBottom: 16 }}>
      <SelectRow icon="chartLine" title={t('Progression')} sheetTitle={t('Progression')}
        value={r.prog || 'linear'} onChange={v => update(s => { s.routines.find(x => x.id === id).prog = v })}
        options={POLICIES_FOR.reps.map(p => ({ value: p, label: t(POLICY_NAME[p]), subtitle: t(POLICY_DESC[p]) }))} />
    </div>
    <div className="small dim" style={{ margin: '-10px 2px 16px' }}>
      {t('Applies to every exercise in this routine that does not set its own rule.')}
    </div>

    <RoutineBlock routine={r} phase="pre" />
    <RoutineBlock routine={r} phase="main" />
    <RoutineBlock routine={r} phase="post" />

    {/* Coverage of the routine as planned, so a gap shows up while you're building it
        rather than after a month of training around it. */}
    {routineExercises(r).length > 0 && (() => {
      const load = loadOfRoutine(r)
      const { worked } = rankOf(load)
      return <div className="card" style={{ marginTop: 12 }}>
        <h2>{t('What this session hits')}</h2>
        <BodyMap load={load} body={S.body} />
        <div className="mchips">
          {worked.slice(0, 6).map(m => <span key={m} className="mchip">{t(MUSCLE_NAME[m])}</span>)}
        </div>
      </div>
    })()}

    <div className="small dim row" style={{ margin: '10px 2px', gap: 5 }}><Icon name="link" style={{ fontSize: 13 }} />{t('Tap the link button on an exercise to superset it with the one above — you’ll do them back-to-back.')}</div>
    <div style={{ height: 10 }} />
    <Button variant="danger" onClick={() => confirmSheet({
      title: t('Delete routine?'), message: t('“{0}” and its exercises will be removed.', r.name), confirmText: t('Delete'), danger: true,
      onConfirm: () => {
        update(s => {
          s.routines = s.routines.filter(x => x.id !== id)
          Object.keys(s.week).forEach(k => { if (s.week[k] === id) delete s.week[k] })
          Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === id) delete s.dayPlan[k] })
        })
        nav('/plan')
      }
    })}>{t('Delete routine')}</Button>
  </div>
}
