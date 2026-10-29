import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import contact from '../../../contracts/examples/contact.json'
import detail from '../../../contracts/examples/device_detail.json'
import listings from '../../../contracts/examples/listings.json'
import { App } from '../App'
import * as client from '../api/client'
import type { Contact, DeviceDetail, Listing } from '../api/types'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getListings: vi.fn(),
  getContact: vi.fn(),
  getDevice: vi.fn(),
}))

const FIRST = listings[0] as Listing
const SECOND: Listing = {
  ...FIRST,
  device_id: 'GPU-SRV-003',
  latest_outcome: 'UPGRADE',
  price: { amount: 38000000, currency: 'IDR' },
  note: 'Memory upgrade path documented in the passport (sample)',
}

const renderHardware = () =>
  render(
    <MemoryRouter initialEntries={['/hardware']}>
      <App />
    </MemoryRouter>,
  )

const cards = async () => within(await screen.findByRole('list', { name: 'Listed hardware' })).getAllByRole('listitem')
const cardIds = async () => (await cards()).map((card) => within(card).getByText(/^GPU-SRV-\d+$/).textContent)

describe('available hardware page (public, no login)', () => {
  beforeEach(() => {
    vi.mocked(client.getListings).mockReset().mockResolvedValue([FIRST])
    vi.mocked(client.getContact).mockReset().mockResolvedValue(contact as Contact)
    vi.mocked(client.getDevice).mockReset().mockResolvedValue(detail as DeviceDetail)
  })

  it('shows each listed device with its hardware facts, sample price and passport link', async () => {
    renderHardware()

    const [card] = await cards()
    expect(screen.getByRole('heading', { level: 1, name: 'Available hardware' })).toBeTruthy()
    expect(within(card).getByText('AccelServer-v1 (sample)')).toBeTruthy()
    expect(within(card).getByText(/IDR\s45,000,000/)).toBeTruthy()
    expect(within(card).getByText(/sample asking price/i)).toBeTruthy()
    expect(within(card).getByText('REDEPLOY')).toBeTruthy()
    expect(within(card).getByText(/Passport intact/)).toBeTruthy()
    expect(within(card).getByText(/GPU Accel-v1/)).toBeTruthy()
    expect(within(card).getByText('data wipe')).toBeTruthy()
    expect(within(card).getByText('gpu temp')).toBeTruthy()
    expect(within(card).getByText('61 °C')).toBeTruthy()
    expect(within(card).getByRole('link', { name: /passport/i }).getAttribute('href')).toBe('/device/GPU-SRV-001')
  })

  it('shows a decorative line drawing of the device on each card', async () => {
    renderHardware()

    const [card] = await cards()
    const art = card.querySelector('[data-art="gpu_server"]')
    expect(art?.getAttribute('aria-hidden')).toBe('true')
    expect(art?.querySelectorAll('[data-part]')).toHaveLength(2)
  })

  it('says a passport changed when the server found its chain broken', async () => {
    vi.mocked(client.getListings).mockResolvedValue([{ ...FIRST, passport_intact: false }])
    renderHardware()

    const [card] = await cards()
    expect(within(card).getByText(/Passport changed/)).toBeTruthy()
    expect(within(card).queryByText(/Passport intact/)).toBeNull()
  })

  it('filters by outcome and sorts by price', async () => {
    vi.mocked(client.getListings).mockResolvedValue([SECOND, FIRST])
    const user = userEvent.setup()
    renderHardware()

    expect(await cardIds()).toEqual(['GPU-SRV-001', 'GPU-SRV-003'])
    expect(screen.getByText('Showing 2 of 2')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /Price high → low/ }))
    expect(await cardIds()).toEqual(['GPU-SRV-003', 'GPU-SRV-001'])

    const upgrade = screen.getByRole('button', { name: /^Upgrade/ })
    await user.click(upgrade)
    expect(upgrade.getAttribute('aria-pressed')).toBe('true')
    expect(await cardIds()).toEqual(['GPU-SRV-003'])
    expect(screen.getByText('Showing 1 of 2')).toBeTruthy()
  })

  it('shows the fictional contact box', async () => {
    renderHardware()

    const box = await screen.findByRole('region', { name: 'Interested in a device?' })
    expect(within(box).getByText(contact.organisation)).toBeTruthy()
    expect(within(box).getByRole('link', { name: contact.email }).getAttribute('href')).toBe(`mailto:${contact.email}`)
    expect(within(box).getByText(contact.hours)).toBeTruthy()
  })

  it('has no buy, cart, order or payment button', async () => {
    renderHardware()

    await cards()
    expect(screen.queryByRole('button', { name: /buy|cart|order|pay|checkout/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /buy|cart|order|pay|checkout/i })).toBeNull()
  })

  it('says so when nothing is listed', async () => {
    vi.mocked(client.getListings).mockResolvedValue([])
    renderHardware()

    expect(await screen.findByText(/No hardware is listed right now/)).toBeTruthy()
  })

  it('shows the API error and can try again', async () => {
    vi.mocked(client.getListings).mockRejectedValueOnce(new client.ApiError(0, 'Cannot reach the ReCompute server.'))
    renderHardware()

    expect((await screen.findByRole('alert')).textContent).toContain('Cannot reach')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Listed hardware' })).toBeTruthy()
  })

  it('lets a buyer ask about a device by e-mail, quoting its ID, without an account', async () => {
    renderHardware()

    const [card] = await cards()
    const ask = within(card).getByRole('link', { name: /Ask about this device/ })
    expect(ask.getAttribute('href')).toMatch(/^mailto:hardware@example\.com\?subject=.*GPU-SRV-001/)
  })
})
