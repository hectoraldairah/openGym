const WIDTH = 1080, HEIGHT = 1350
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

function text(context, value, x, y, maxWidth, size, color, { weight = 500, lines = 1 } = {}) {
  context.font = `${weight} ${size}px ${FONT}`
  context.fillStyle = color
  const words = String(value || '').split(/\s+/)
  const rows = []
  let row = ''
  for (const word of words) {
    const next = row ? row + ' ' + word : word
    if (row && context.measureText(next).width > maxWidth) { rows.push(row); row = word }
    else row = next
  }
  if (row) rows.push(row)
  const visible = rows.slice(0, lines)
  if (rows.length > lines) visible[lines - 1] += '…'
  visible.forEach((line, index) => {
    while (line.length > 1 && context.measureText(line).width > maxWidth) line = line.slice(0, -2) + '…'
    context.fillText(line, x, y + index * size * 1.2)
  })
}

function trophy(context, x, y, color) {
  context.save()
  context.translate(x, y)
  context.scale(5, 5)
  context.strokeStyle = color
  context.lineWidth = 1.5
  context.lineCap = 'round'
  context.lineJoin = 'round'
  const path = new Path2D('M7.6 4h8.8v4.6a4.4 4.4 0 0 1-8.8 0ZM7.6 5.6H4.9v1.5a3 3 0 0 0 2.9 3M16.4 5.6h2.7v1.5a3 3 0 0 1-2.9 3M12 13v3.4M8.6 20.4h6.8l-.7-4H9.3Z')
  context.stroke(path)
  context.restore()
}

// The preview and exported PNG use the same canvas, so there are no screenshot/CORS
// dependencies and no exercise images or third-party videos to download.
export function renderPRImage(slide, index) {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH; canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')
  const accent = ['#ffd60a', '#63e6be', '#80bfff'][index]
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT)
  gradient.addColorStop(0, '#1c2431'); gradient.addColorStop(1, '#080b10')
  context.fillStyle = gradient; context.fillRect(0, 0, WIDTH, HEIGHT)
  context.strokeStyle = accent + '22'; context.lineWidth = 2
  for (const radius of [210, 310, 410]) {
    context.beginPath(); context.arc(WIDTH - 30, 80, radius, 0, Math.PI * 2); context.stroke()
  }
  context.fillStyle = accent; context.fillRect(76, 164, 76, 6)
  text(context, 'openGym', 76, 104, 600, 38, '#ffffff', { weight: 700 })
  text(context, `0${index + 1} / 03`, 852, 104, 160, 26, '#aeb8c7')
  trophy(context, 65, 213, accent)
  text(context, slide.kicker.toLocaleUpperCase(), 76, 420, 920, 29, accent, { weight: 700 })
  text(context, slide.title, 76, 500, 920, 61, '#ffffff', { weight: 700, lines: 3 })
  text(context, slide.metric, 76, 755, 920, 29, '#aeb8c7')
  let valueSize = 112
  context.font = `750 ${valueSize}px ${FONT}`
  while (valueSize > 48 && context.measureText(slide.value).width > 920) {
    valueSize -= 2; context.font = `750 ${valueSize}px ${FONT}`
  }
  text(context, slide.value, 76, 875, 920, valueSize, accent, { weight: 750 })
  text(context, slide.subtitle, 76, 932, 920, 30, '#e2e8f0')
  if (slide.stats.length) {
    const width = 920 / slide.stats.length
    slide.stats.forEach((stat, i) => {
      context.fillStyle = '#ffffff0a'; context.fillRect(76 + i * width, 990, width - 12, 114)
      text(context, stat.label, 94 + i * width, 1025, width - 48, 22, '#aeb8c7')
      text(context, stat.value, 94 + i * width, 1075, width - 48, 34, '#ffffff', { weight: 650 })
    })
  } else text(context, slide.caption, 76, 1065, 920, 37, '#e2e8f0', { weight: 600 })
  text(context, [slide.name, slide.date].filter(Boolean).join(' · '), 76, 1182, 920, 26, '#aeb8c7')
  text(context, slide.estimate ? 'openGym · ' + slide.metric : 'openGym · ' + slide.caption, 76, 1260, 920, 24, accent)
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob)
    else reject(new Error('Unable to create the record image'))
  }, 'image/png'))
}
