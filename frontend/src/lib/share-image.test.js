import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shareRecordImage } from './share-image.js'

let link
beforeEach(() => {
  vi.useFakeTimers()
  link = { click: vi.fn(), remove: vi.fn() }
  vi.stubGlobal('document', { createElement: vi.fn(() => link), body: { appendChild: vi.fn() } })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:record')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('sharing record images', () => {
  const image = () => new Blob(['png-data'], { type: 'image/png' })

  it('sends the actual PNG file through the browser share sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare: vi.fn(() => true), share })
    expect(await shareRecordImage(image(), 'record.png', 'PR')).toBe('shared')
    expect(share.mock.calls[0][0].files[0]).toMatchObject({ name: 'record.png', type: 'image/png' })
    expect(link.click).not.toHaveBeenCalled()
  })

  it('downloads a PNG if file sharing is unavailable and releases its URL', async () => {
    vi.stubGlobal('navigator', {})
    expect(await shareRecordImage(image(), 'record.png', 'PR')).toBe('downloaded')
    expect(link.download).toBe('record.png')
    expect(link.click).toHaveBeenCalledOnce()
    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:record')
  })

  it('does not download anything when the user cancels sharing', async () => {
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')) })
    expect(await shareRecordImage(image(), 'record.png', 'PR')).toBe('cancelled')
    expect(link.click).not.toHaveBeenCalled()
  })

  it('falls back to downloading if a share target rejects the image', async () => {
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new Error('Unsupported target')) })
    expect(await shareRecordImage(image(), 'record.png', 'PR')).toBe('downloaded')
    expect(link.click).toHaveBeenCalledOnce()
  })
})
