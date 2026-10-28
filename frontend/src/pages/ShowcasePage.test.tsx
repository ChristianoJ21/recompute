import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import contact from '../../../contracts/examples/contact.json'
import listings from '../../../contracts/examples/listings.json'
import { App } from '../App'
import * as client from '../api/client'
import type { Contact, Listing } from '../api/types'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getListings: vi.fn(),
  getContact: vi.fn(),
}))

const renderShowcase = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

describe('available hardware (public, no login)', () => {
  beforeEach(() => {
    vi.mocked(client.getListings).mockReset().mockResolvedValue(listings as Listing[])
    vi.mocked(client.getContact).mockReset().mockResolvedValue(contact as Contact)
  })

  it('shows each listed device with its hardware facts, sample price and passport link', async () => {
    renderShowcase()

    const list = await screen.findByRole('list', { name: 'Listed hardware' })
    const card = within(list).getAllByRole('listitem')[0]
    expect(within(card).getByText('AccelServer-v1 (sample)')).toBeTruthy()
    expect(within(card).getByText(/IDR\s45,000,000/)).toBeTruthy()
    expect(within(card).getByText(/sample asking price/i)).toBeTruthy()
    expect(within(card).getByText('REDEPLOY')).toBeTruthy()
    expect(within(card).getByText(/Passport intact/)).toBeTruthy()
    expect(within(card).getByText(/gpu Accel-v1/)).toBeTruthy()
    expect(within(card).getByText(/Data wiped/)).toBeTruthy()
    expect(within(card).getByText(/gpu_temp_c: 61/)).toBeTruthy()
    expect(within(card).getByRole('link', { name: /passport/i }).getAttribute('href')).toBe('/device/GPU-SRV-001')
  })

  it('shows the fictional contact box', async () => {
    renderShowcase()

    const box = await screen.findByRole('region', { name: /Contact the data centre/ })
    expect(within(box).getByText(contact.organisation)).toBeTruthy()
    expect(within(box).getByRole('link', { name: contact.email }).getAttribute('href')).toBe(`mailto:${contact.email}`)
    expect(within(box).getByText(contact.hours)).toBeTruthy()
  })

  it('has no buy, cart, order or payment button', async () => {
    renderShowcase()

    await screen.findByRole('list', { name: 'Listed hardware' })
    expect(screen.queryByRole('button', { name: /buy|cart|order|pay|checkout/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /buy|cart|order|pay|checkout/i })).toBeNull()
  })

  it('says so when nothing is listed', async () => {
    vi.mocked(client.getListings).mockResolvedValue([])
    renderShowcase()

    expect(await screen.findByText(/No hardware is listed right now/)).toBeTruthy()
  })

  it('shows the API error and can try again', async () => {
    vi.mocked(client.getListings).mockRejectedValueOnce(new client.ApiError(0, 'Cannot reach the ReCompute server.'))
    renderShowcase()

    expect((await screen.findByRole('alert')).textContent).toContain('Cannot reach')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Listed hardware' })).toBeTruthy()
  })

  it('offers the technician login in the header', async () => {
    renderShowcase()

    expect(await screen.findByRole('link', { name: 'Technician login' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Fleet' })).toBeNull()
  })
})

describe('showcase explains itself', () => {
  beforeEach(() => {
    vi.mocked(client.getListings).mockReset().mockResolvedValue(listings as Listing[])
    vi.mocked(client.getContact).mockReset().mockResolvedValue(contact as Contact)
  })

  it('says in three steps how ReCompute works', async () => {
    renderShowcase()

    const steps = await screen.findByRole('list', { name: 'How ReCompute works' })
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3)
  })

  it('lets a buyer ask about a device by e-mail, quoting its ID, without an account', async () => {
    renderShowcase()

    const card = within(await screen.findByRole('list', { name: 'Listed hardware' })).getAllByRole('listitem')[0]
    const ask = within(card).getByRole('link', { name: /Ask about this device/ })
    expect(ask.getAttribute('href')).toMatch(/^mailto:hardware@example\.com\?subject=.*GPU-SRV-001/)
  })
})
