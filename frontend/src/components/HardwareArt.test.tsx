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

  it.each([
    ['storage_server', [{ type: 'storage' }, { type: 'nic' }, { type: 'psu' }], ['storage', 'nic', 'psu']],
    ['network_switch', [{ type: 'psu' }, { type: 'cpu' }], ['cpu', 'psu']],
    ['workstation', [{ type: 'ssd' }, { type: 'cpu' }, { type: 'gpu' }], ['gpu', 'cpu', 'storage']],
  ])('draws a %s with its own parts, in a fixed order', (deviceType, components, parts) => {
    expect(pickArt(deviceType, components)).toEqual({ device: deviceType, parts })
  })

  it('draws SSDs, hard drives and "storage" with the one drive drawing, once', () => {
    expect(pickArt('workstation', [{ type: 'SSD' }, { type: 'hdd' }, { type: 'storage' }]).parts).toEqual(['storage'])
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

  it.each(['storage_server', 'network_switch', 'workstation'])('has its own drawing for a %s', (deviceType) => {
    const { container } = render(<HardwareArt deviceType={deviceType} components={[]} colour="red" />)
    expect(container.firstElementChild?.getAttribute('data-art')).toBe(deviceType)
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('draws every part type it knows and letters the figures in order', () => {
    const { container } = render(
      <HardwareArt
        deviceType="workstation"
        components={[{ type: 'psu' }, { type: 'nic' }, { type: 'ssd' }, { type: 'cpu' }, { type: 'memory' }, { type: 'gpu' }]}
        colour="red"
      />,
    )
    const parts = [...container.querySelectorAll('[data-part]')]
    expect(parts.map((part) => part.getAttribute('data-part'))).toEqual(['gpu', 'memory', 'cpu', 'storage', 'nic', 'psu'])
    expect(parts.every((part) => part.querySelector('svg path, svg rect'))).toBe(true)
    expect([...container.querySelectorAll('span')].map((span) => span.textContent)).toEqual([
      'FIG. A · FRONT AND SIDE VIEW',
      'FIG. B · GPU',
      'FIG. C · MEMORY',
      'FIG. D · CPU',
      'FIG. E · STORAGE',
      'FIG. F · NETWORK CARD',
      'FIG. G · POWER SUPPLY',
    ])
  })

  it('works offline: inline SVG only, no image files or links', () => {
    const { container } = render(<HardwareArt deviceType="gpu_server" components={[{ type: 'gpu' }]} colour="red" />)
    expect(container.querySelector('img, image, use[href], a')).toBeNull()
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })
})
