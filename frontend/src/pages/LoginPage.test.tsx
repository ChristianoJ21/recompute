import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import contact from '../../../contracts/examples/contact.json'
import devicesList from '../../../contracts/examples/devices_list.json'
import chainOk from '../../../contracts/examples/events_verify.json'
import fleetSummary from '../../../contracts/examples/fleet_summary.json'
import { App } from '../App'
import * as client from '../api/client'
import type { ChainCheck, Contact, DeviceSummary, FleetSummary } from '../api/types'
import { TECH_SESSION, signIn } from '../test/session'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  login: vi.fn(),
  listDevices: vi.fn(),
  getFleetSummary: vi.fn(),
  getListings: vi.fn(),
  getContact: vi.fn(),
  verifyEvents: vi.fn(),
}))

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('technician login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(client.listDevices).mockResolvedValue(devicesList as DeviceSummary[])
    vi.mocked(client.getFleetSummary).mockResolvedValue(fleetSummary as FleetSummary)
    vi.mocked(client.getListings).mockResolvedValue([])
    vi.mocked(client.getContact).mockResolvedValue(contact as Contact)
    vi.mocked(client.verifyEvents).mockResolvedValue(chainOk as ChainCheck)
  })

  it('logs in and opens the fleet dashboard', async () => {
    const user = userEvent.setup()
    vi.mocked(client.login).mockImplementation(async () => {
      signIn()
      return TECH_SESSION
    })
    renderAt('/login')

    await user.type(screen.getByLabelText('Username'), 'tech-1')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(client.login).toHaveBeenCalledWith('tech-1', 'correct horse battery')
    expect(await screen.findByRole('heading', { name: 'Fleet dashboard' })).toBeTruthy()
    expect(screen.getByText(TECH_SESSION.technician.name)).toBeTruthy()
  })

  it('shows the API message for a wrong password', async () => {
    const user = userEvent.setup()
    vi.mocked(client.login).mockRejectedValue(new client.ApiError(401, 'Wrong username or password.'))
    renderAt('/login')

    await user.type(screen.getByLabelText('Username'), 'tech-1')
    await user.type(screen.getByLabelText('Password'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Wrong username or password.')
  })

  it('logs out from the header and returns to the public page', async () => {
    const user = userEvent.setup()
    signIn()
    renderAt('/fleet')

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(client.currentSession()).toBeNull()
    expect(await screen.findByRole('heading', { name: 'Available hardware' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Technician login' })).toBeTruthy()
  })
})
