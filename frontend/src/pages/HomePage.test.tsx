import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import detail from '../../../contracts/examples/device_detail.json'
import verify from '../../../contracts/examples/events_verify.json'
import listings from '../../../contracts/examples/listings.json'
import { App } from '../App'
import * as client from '../api/client'
import type { ChainCheck, DeviceDetail, Listing } from '../api/types'
import { allowMotion } from '../test/motion'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getListings: vi.fn(),
  getDevice: vi.fn(),
  verifyEvents: vi.fn(),
}))

const LISTING = listings[0] as Listing
const DETAIL = detail as DeviceDetail
const VALID = verify as ChainCheck
const BROKEN: ChainCheck = { ...VALID, valid: false, first_bad_event_id: 1, reason: 'hash does not match' }

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

const liveCard = () => screen.findByRole('region', { name: /Live passport of GPU-SRV-001/ })

describe('home page', () => {
  beforeEach(() => {
    vi.mocked(client.getListings).mockReset().mockResolvedValue([LISTING])
    vi.mocked(client.getDevice).mockReset().mockResolvedValue(DETAIL)
    vi.mocked(client.verifyEvents).mockReset().mockResolvedValue(VALID)
  })

  it('plays the intro on the first visit of a browser session, and not again', async () => {
    const motion = allowMotion()
    try {
      const first = renderHome()
      await userEvent.setup().click(screen.getByRole('button', { name: 'Skip intro' }))
      expect(screen.queryByRole('button', { name: 'Skip intro' })).toBeNull()
      first.unmount()

      renderHome()
      expect(screen.queryByRole('button', { name: 'Skip intro' })).toBeNull()
    } finally {
      motion.mockRestore()
    }
  })

  it('never plays the intro for a visitor who asked for less motion', () => {
    renderHome()

    expect(screen.queryByRole('button', { name: 'Skip intro' })).toBeNull()
  })

  it('keeps the headline and the three steps of how ReCompute works', async () => {
    renderHome()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Second-life AI servers, each with a passport you can check/)
    const steps = await screen.findByRole('list', { name: 'How ReCompute works' })
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3)
  })

  it('teases the released devices with their sample price, linking to the hardware page', async () => {
    renderHome()

    const released = await screen.findByRole('list', { name: 'Released devices' })
    const link = within(released).getByRole('link', { name: /GPU-SRV-001/ })
    expect(link.getAttribute('href')).toBe('/hardware')
    expect(within(link).getByText(/IDR\s45,000,000/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See available hardware →' }).getAttribute('href')).toBe('/hardware')
  })

  it('counts verified events and broken chains from the real check of each released passport', async () => {
    renderHome()

    expect(await screen.findByText('1 DEVICE RELEASED', { exact: false })).toBeTruthy()
    const stats = await screen.findByRole('list', { name: 'Passport checks' })
    expect(await within(stats).findByText(/^1$/)).toBeTruthy()
    expect(within(stats).getByText(/passport events verified/)).toBeTruthy()
    expect(within(stats).getByText(/^0$/)).toBeTruthy()
    expect(client.verifyEvents).toHaveBeenCalledWith('GPU-SRV-001')
  })

  it('shows the live passport card with real events, and says intact only after the chain check passes', async () => {
    let answer: (check: ChainCheck) => void = () => {}
    vi.mocked(client.verifyEvents).mockReturnValue(new Promise((resolve) => (answer = resolve)))
    renderHome()

    const card = await liveCard()
    expect(await within(card).findByText(/Checking passport…/)).toBeTruthy()
    expect(within(card).queryByText(/Passport intact/)).toBeNull()
    expect(within(card).getByText('Data wipe')).toBeTruthy()

    answer(VALID)
    expect(await within(card).findByText(/Passport intact/)).toBeTruthy()
  })

  it('shows a broken chain on the live card instead of a tick', async () => {
    vi.mocked(client.verifyEvents).mockResolvedValue(BROKEN)
    renderHome()

    const card = await liveCard()
    expect(await within(card).findByText(/Passport changed at event #1/)).toBeTruthy()
    const stats = screen.getByRole('list', { name: 'Passport checks' })
    expect(await within(stats).findByText(/broken link/)).toBeTruthy()
  })
})
