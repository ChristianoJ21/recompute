import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import devicesList from '../../../contracts/examples/devices_list.json'
import customersList from '../../../contracts/examples/customers_list.json'
import enquiriesList from '../../../contracts/examples/enquiries_list.json'
import chainOk from '../../../contracts/examples/events_verify.json'
import fleetSummary from '../../../contracts/examples/fleet_summary.json'
import listings from '../../../contracts/examples/listings.json'
import { App } from '../App'
import * as client from '../api/client'
import type { ChainCheck, CustomerRow, DeviceSummary, Enquiry, FleetSummary, Listing } from '../api/types'
import { signIn } from '../test/session'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  listDevices: vi.fn(),
  getFleetSummary: vi.fn(),
  getListings: vi.fn(),
  verifyEvents: vi.fn(),
  getEnquiries: vi.fn(),
  getCustomers: vi.fn(),
}))

const renderFleet = () =>
  render(
    <MemoryRouter initialEntries={['/fleet']}>
      <App />
    </MemoryRouter>,
  )

describe('fleet page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn()
    vi.mocked(client.getListings).mockResolvedValue(listings as Listing[])
    vi.mocked(client.verifyEvents).mockImplementation(async (id) => ({ ...(chainOk as ChainCheck), device_id: id }))
    vi.mocked(client.listDevices).mockResolvedValue(devicesList as DeviceSummary[])
    vi.mocked(client.getFleetSummary).mockResolvedValue(fleetSummary as FleetSummary)
    vi.mocked(client.getEnquiries).mockResolvedValue([])
    vi.mocked(client.getCustomers).mockResolvedValue([])
  })

  it('shows the technicians (the admins) the questions from customers and the customer accounts', async () => {
    vi.mocked(client.getEnquiries).mockResolvedValue(enquiriesList as Enquiry[])
    vi.mocked(client.getCustomers).mockResolvedValue(customersList as CustomerRow[])
    renderFleet()

    const questions = await screen.findByRole('list', { name: 'Questions from customers' })
    expect(within(questions).getByText('Is the power supply included? (sample)')).toBeTruthy()
    expect(within(questions).getByRole('link', { name: 'GPU-SRV-001' }).getAttribute('href')).toBe('/device/GPU-SRV-001')
    expect(within(questions).getByRole('link', { name: 'ana@example.com' }).getAttribute('href')).toMatch(/^mailto:ana@example\.com\?subject=/)
    const accounts = await screen.findByRole('table', { name: 'Customer accounts' })
    expect(within(accounts).getByText('Ana (sample)')).toBeTruthy()
  })

  it('lists every device with its outcome badge, linked to its passport', async () => {
    renderFleet()

    const list = await screen.findByRole('list', { name: 'Devices' })
    expect(within(list).getAllByRole('link')).toHaveLength(devicesList.length)
    const first = within(list).getByRole('link', { name: /GPU-SRV-001/ })
    expect(first.getAttribute('href')).toBe('/device/GPU-SRV-001')
    expect(within(first).getByText('REDEPLOY')).toBeTruthy()
    expect(within(list).getByText('INSUFFICIENT DATA')).toBeTruthy()
  })

  it('filters the device list by search text and by outcome', async () => {
    const user = userEvent.setup()
    renderFleet()

    const list = await screen.findByRole('list', { name: 'Devices' })
    await user.type(screen.getByRole('searchbox', { name: 'Search devices' }), 'light inference')
    expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/device/GPU-SRV-002'])

    await user.clear(screen.getByRole('searchbox', { name: 'Search devices' }))
    const counts = screen.getByRole('list', { name: 'Devices per outcome' })
    const upgrade = within(counts).getByRole('button', { name: /UPGRADE/ })
    await user.click(upgrade)
    expect(upgrade.getAttribute('aria-pressed')).toBe('true')
    expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/device/GPU-SRV-003'])

    await user.type(screen.getByRole('searchbox', { name: 'Search devices' }), 'nothing like this')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(within(list).getAllByRole('link')).toHaveLength(devicesList.length)
  })

  it('shows the count for each of the six outcomes at the top', async () => {
    renderFleet()

    const counts = await screen.findByRole('list', { name: 'Devices per outcome' })
    const tiles = within(counts).getAllByRole('listitem')
    expect(tiles).toHaveLength(6)
    expect(tiles.map((tile) => within(tile).getByText(/^\d+$/).textContent)).toEqual(['1', '1', '1', '1', '1', '1'])
    expect(screen.getByText(/· 6 devices$/)).toBeTruthy()
  })

  it('flags devices that have not been evaluated', async () => {
    vi.mocked(client.listDevices).mockResolvedValue([{ ...(devicesList[0] as DeviceSummary), latest_outcome: null }])
    vi.mocked(client.getFleetSummary).mockResolvedValue({ ...(fleetSummary as FleetSummary), devices: 1, not_evaluated: 1 })
    renderFleet()

    expect(await screen.findByText('NOT EVALUATED')).toBeTruthy()
    expect(screen.getByText(/· 1 device$/)).toBeTruthy()
    const stats = screen.getByRole('list', { name: 'Fleet stats' })
    expect(within(stats).getByText('Not evaluated').closest('li')!.textContent).toContain('1')
  })

  it('links to the add device and add technician forms', async () => {
    renderFleet()

    expect((await screen.findByRole('link', { name: '+ Add device' })).getAttribute('href')).toBe('/devices/new')
    expect(screen.getByRole('link', { name: '+ Add technician' }).getAttribute('href')).toBe('/technicians/new')
  })

  it('shows the SAMPLE DATA label', async () => {
    renderFleet()

    await screen.findByRole('list', { name: 'Devices' })
    expect(screen.getByText('SAMPLE DATA')).toBeTruthy()
  })

  it('shows the API error and can try again', async () => {
    vi.mocked(client.listDevices).mockRejectedValueOnce(new client.ApiError(500, 'Is the backend running on port 8000?'))
    renderFleet()

    expect((await screen.findByRole('alert')).textContent).toContain('Is the backend running on port 8000?')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Devices' })).toBeTruthy()
  })

  it('shows the technician stats: listed for sale and passports intact vs changed', async () => {
    vi.mocked(client.verifyEvents).mockImplementation(async (id) => ({
      ...(chainOk as ChainCheck),
      device_id: id,
      valid: id !== 'GPU-SRV-004',
      first_bad_event_id: id === 'GPU-SRV-004' ? 3 : null,
    }))
    renderFleet()

    const stats = await screen.findByRole('list', { name: 'Fleet stats' })
    const tile = (label: RegExp) => within(stats).getByText(label).closest('li')!.textContent
    expect(tile(/Listed for sale/)).toContain('1')
    expect(tile(/Passports intact/)).toContain('5 of 6')
    expect(tile(/Passports changed/)).toContain('1')
  })

  it('sends a logged-out visitor to the login page', async () => {
    sessionStorage.clear()
    renderFleet()

    expect(await screen.findByRole('heading', { name: 'Technician login' })).toBeTruthy()
    expect(client.listDevices).not.toHaveBeenCalled()
  })
})
