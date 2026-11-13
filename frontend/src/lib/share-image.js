import { MOBILE, shareImage } from './mobile.js'

export function downloadImage(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename
  document.body.appendChild(link)
  link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function shareRecordImage(blob, filename, title) {
  if (MOBILE) {
    await shareImage(blob, filename, title)
    return 'shared'
  }
  try {
    const file = new File([blob], filename, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title })
      return 'shared'
    }
  } catch (error) {
    if (error.name === 'AbortError') return 'cancelled'
    // Browsers may advertise file sharing but reject it for this target or device.
    // Keep the image available through a normal download in that case.
  }
  downloadImage(blob, filename)
  return 'downloaded'
}
