import { useState } from 'react'
import { imgSrc, gifSrc } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { youtubeVideo } from '../lib/youtube.js'

// Big autoplaying animation; tap toggles to the still frame. `compact` shrinks it (superset cards).
// Custom exercises can show a YouTube demonstration in place of an animation.
// `minimizable` (workout view) adds a persistent minimize/expand control so the animation stops
// eating the screen; the chosen size is saved to settings and carries across exercises and
// future workouts (issue #12).
export default function Media(props) {
  const { ex } = props
  // Recreate the player whenever its exercise or media changes, including in sheets
  // that reuse a component slot. This also resets paused state and stops old videos.
  return <ExerciseMedia key={JSON.stringify([ex.id, ex.img, ex.gif, ex.videoUrl])} {...props} />
}

function ExerciseMedia({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)
  const video = youtubeVideo(ex.videoUrl || '')
  if (!ex.gif && !video) return null
  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => { e.stopPropagation(); update(s => { s.gifSize = mini ? 'full' : 'mini' }) }
  if (video) return <div className="exvideo" id={id}>
    {!mini && <iframe key={`${ex.id}:${video.id}:${video.start}`} src={`https://www.youtube-nocookie.com/embed/${video.id}?start=${video.start}`}
      title={ex.n} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin" />}
    <div className="row between" style={{ padding: 8, gap: 8 }}>
      <a className="small" href={`https://www.youtube.com/watch?v=${video.id}&t=${video.start}s`} target="_blank" rel="noopener noreferrer">{t('Watch on YouTube')}</a>
      {minimizable && <button className="chip" onClick={toggleSize}><Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}</button>}
    </div>
  </div>
  return (
    <div className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '')} id={id} onClick={() => setPlaying(p => !p)}>
      <img key={playing ? gifSrc(ex) : imgSrc(ex)} decoding="async" src={playing ? gifSrc(ex) : imgSrc(ex)} alt={ex.n} />
      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
        </button>
      )}
      {!mini && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

export function Thumb({ ex }) {
  if (!ex.img) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>
  return <img key={`${ex.id}:${imgSrc(ex)}`} className="thumb" loading="lazy" decoding="async" src={imgSrc(ex)} alt="" />
}
