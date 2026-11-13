import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { buildPRSlides } from '../lib/pr-share.js'
import { renderPRImage } from '../lib/pr-image.js'
import { shareRecordImage, downloadImage } from '../lib/share-image.js'
import { MOBILE } from '../lib/mobile.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function PRShareCard({ record, close, onWorkout, embedded = false }) {
  const state = useStore(s => s.S)
  const user = useStore(s => s.user)
  const [index, setIndex] = useState(0)
  const [images, setImages] = useState([])
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const touch = useRef(null)
  const slides = useMemo(() => buildPRSlides(record, state, user?.name || ''), [record, state, user?.name])
  useEffect(() => {
    let cancelled = false
    const urls = []
    setImages([]); setError(false)
    Promise.all(slides.map((slide, i) => Promise.resolve().then(() => renderPRImage(slide, i)))).then(blobs => {
      if (cancelled) return
      const next = blobs.map(blob => {
        const url = URL.createObjectURL(blob)
        urls.push(url)
        return { blob, url }
      })
      setImages(next)
    }).catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true; urls.forEach(url => URL.revokeObjectURL(url)) }
  }, [slides])
  const current = images[index]
  const filename = `opengym-pr-${record.id.replace(/[^a-z0-9_-]/gi, '-')}-${record.kind}-${record.d}-${index + 1}.png`
  const share = async () => {
    if (!current || busy) return
    setBusy(true)
    try {
      const outcome = await shareRecordImage(current.blob, filename, t('Personal record'))
      if (outcome === 'downloaded') useUI.getState().toast(t('Record image downloaded'))
    } catch (e) {
      if (e.name !== 'AbortError' && !/cancel/i.test(e.message || '')) useUI.getState().toast(t('Could not share the image. Please try again.'))
    } finally { setBusy(false) }
  }
  const move = step => setIndex(current => (current + step + 3) % 3)
  const workout = state.workouts.find(w => w.id === record.workoutId)
  return <>
    <div className="row between" style={{ marginBottom: 10 }}>
      <h3 style={{ margin: 0 }}>{t('Share your PR')}</h3>
      {!embedded && <button className="iconbtn" aria-label={t('Close')} onClick={close}><Icon name="xmark" /></button>}
    </div>
    <div className="pr-carousel" role="region" aria-roledescription={t('Carousel')} aria-label={t('Personal record')}
      tabIndex={0} data-nodrag onKeyDown={event => {
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
      }} onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }}
      onTouchEnd={event => {
        if (!touch.current) return
        const dx = event.changedTouches[0].clientX - touch.current.x
        const dy = event.changedTouches[0].clientY - touch.current.y
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1)
        touch.current = null
      }}>
      {current ? <img key={current.url} className="pr-share-image" src={current.url} alt={`${slides[index].kicker}: ${slides[index].title} · ${slides[index].metric} · ${slides[index].value} · ${slides[index].subtitle}`} />
        : <div className="pr-share-loading" role="status">{t(error ? 'Could not create the record image.' : 'Preparing your card…')}</div>}
    </div>
    <div className="pr-carousel-nav">
      <button className="iconbtn" aria-label={t('Previous slide')} onClick={() => move(-1)}><Icon name="chevronLeft" /></button>
      <div className="pr-carousel-dots" aria-label={t('Choose a slide')}>
        {slides.map((slide, i) => <button key={slide.kind} className={'pr-carousel-dot' + (i === index ? ' active' : '')}
          aria-label={t('Slide {0}: {1}', i + 1, slide.kicker)} aria-current={index === i ? 'true' : undefined} onClick={() => setIndex(i)} />)}
      </div>
      <button className="iconbtn" aria-label={t('Next slide')} onClick={() => move(1)}><Icon name="chevronRight" /></button>
    </div>
    <div className="small muted" style={{ textAlign: 'center', marginBottom: 12 }} aria-live="polite">{index + 1} / 3 · {slides[index].kicker}</div>
    <Button variant="primary" icon="upload" disabled={!current || busy} onClick={share}>{t('Share this slide')}</Button>
    {!MOBILE && <div style={{ marginTop: 8 }}><Button icon="download" disabled={!current || busy} onClick={() => {
      downloadImage(current.blob, filename)
      useUI.getState().toast(t('Record image downloaded'))
    }}>{t('Download image')}</Button></div>}
    <div className="small dim" style={{ marginTop: 10 }}>{t('Portrait PNG · 1080 × 1350. Share the selected slide or download it for your social posts.')}</div>
    {workout && <div style={{ marginTop: 8 }}><Button variant="ghost" onClick={() => onWorkout(workout)}>{t('View workout')}</Button></div>}
  </>
}
