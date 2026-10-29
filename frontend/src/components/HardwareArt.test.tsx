import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HardwareArt, pickArt } from './HardwareArt'

describe('pickArt (which bundled line drawing to show)', () => {
  it('draws a GPU server with one drawing per component type', () => {
    expect(pickArt('gpu_server', [{ type: 'gpu' }, { type: 'memory' }])).toEqual({ device: 'gpu_server', parts: ['gpu', 'memory'] })
  })

  it('ignores case and repeated component types', () => {
    expect(pickArt('GPU_SERVER', [{ type: 'GPU' }, { type: 'gpu' }, { type: 'Memory' }])).toEqual({
      device: 'gpu_server',
      parts: ['gpu', 'memory'],
    })
  })

  it('falls back to a plain chassis and skips component types it has no drawing for', () => {
    expect(pickArt('storage_array', [{ type: 'nvme' }])).toEqual({ device: 'generic', parts: [] })
  })
})

describe('HardwareArt', () => {
  it('is decorative: hidden from assistive technology, never announced as an image', () => {
    const { container } = render(<HardwareArt deviceType="gpu_server" components={[{ type: 'gpu' }, { type: 'memory' }]} colour="red" />)
    const art = container.firstElementChild as HTMLElement
    expect(art.getAttribute('aria-hidden')).toBe('true')
    expect(art.getAttribute('data-art')).toBe('gpu_server')
    expect(screen.queryByRole('img')).toBeNull()
    expect(art.querySelectorAll('[data-part]')).toHaveLength(2)
  })

  it('works offline: inline SVG only, no image files or links', () => {
    const { container } = render(<HardwareArt deviceType="gpu_server" components={[{ type: 'gpu' }]} colour="red" />)
    expect(container.querySelector('img, image, use[href], a')).toBeNull()
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })
})
