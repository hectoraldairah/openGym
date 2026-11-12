import { useEffect, useRef } from 'react'
import { EXIDX } from '../lib/exercises.js'
import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { displayWeight, exerciseWeightUnit } from '../lib/weight.js'
import Icon from './Icon.jsx'

export default function RecordCard({ record, state, index }) {
  const card = useRef(null)
  useEffect(() => {
    // Celebrate the summary once, even when several exercises set records.
    if (index !== 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const { default: confetti } = await import('@hiseb/confetti')
        if (cancelled || !card.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const bounds = card.current.getBoundingClientRect()
        confetti({
          position: { x: bounds.left + bounds.width / 2, y: bounds.top + Math.min(bounds.height / 2, 60) },
          count: 100,
          velocity: 180,
          fade: true,
          color: ['#ffd60a', '#30d158', '#0a84ff', '#ff375f']
        })
      } catch { /* Celebration is optional if canvas or the lazy-loaded module is unavailable. */ }
    }, 350)
    // The library removes its canvas automatically after the fading particles finish.
    return () => { cancelled = true; clearTimeout(timer) }
  }, [index])
  const unit = exerciseWeightUnit(state, record.id)
  const measure = value => fmtNum(displayWeight(value, state.unit, unit)) + ' ' + unit
  return <div ref={card} className="record-card" style={{ animationDelay: `${Math.min(index, 6) * 100}ms` }}>
    <div className="record-heading">
      <span className="record-trophy"><Icon name="trophy" /></span>
      <div>
        <div className="record-label">{t('New record!')}</div>
        <div className="record-exercise">{EXIDX[record.id]?.n || record.id}</div>
      </div>
    </div>
    <div className="small muted">{record.kind === 'weight' ? t('Heaviest weight') : t('Best estimated 1RM:')}</div>
    <div className="record-comparison">
      <div><div className="small muted">{t('Previous best:')}</div><div className="record-old">{record.previous > 0 ? measure(record.previous) : t('First record')}</div></div>
      <Icon name="chevronRight" />
      <div><div className="small muted">{t('New best')}</div><div className="record-new">{measure(record.current)}</div></div>
    </div>
    {record.previous > 0 && <div className="record-gain"><Icon name="arrowUp" />+{measure(record.current - record.previous)}</div>}
  </div>
}
