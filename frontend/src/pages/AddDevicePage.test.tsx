import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import * as client from '../api/client'
import { signIn } from '../test/session'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  createDevice: vi.fn(),
  getDevice: vi.fn(),
  verifyEvents: vi.fn(),
  getContact: vi.fn(),
}))

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/devices/new']}>
      <App />
    </MemoryRouter>,
  )

async function fillRequired() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Device ID'), 'NET-SW-009')
  await user.type(screen.getByLabelText('Model'), 'EdgeSwitch-48 (sample)')
  await user.selectOptions(screen.getByLabelText('Device type'), 'network_switch')
  await user.type(screen.getByLabelText('Install date'), '2022-01-15')
  return user
}

describe('add device page', () => {
  beforeEach(() => {
    vi.mocked(client.createDevice).mockReset()
    vi.mocked(client.getDevice).mockReset().mockReturnValue(new Promise(() => {}))
    vi.mocked(client.verifyEvents).mockReset().mockReturnValue(new Promise(() => {}))
    vi.mocked(client.getContact).mockReset().mockReturnValue(new Promise(() => {}))
  })

  it('shows the login form to a visitor', () => {
    renderPage()

    expect(screen.queryByLabelText('Device ID')).toBeNull()
    expect(screen.getByLabelText('Username')).toBeTruthy()
  })

  it('creates a sample device with its parts and opens its passport', async () => {
    signIn()
    vi.mocked(client.createDevice).mockImplementation(async (device) => device)
    renderPage()

    const user = await fillRequired()
    await user.selectOptions(screen.getByLabelText('Part 1 type'), 'psu')
    await user.type(screen.getByLabelText('Part 1 model'), 'PSU-550 (sample)')
    await user.click(screen.getByRole('button', { name: '+ Add part' }))
    await user.selectOptions(screen.getByLabelText('Part 2 type'), 'cpu')
    await user.type(screen.getByLabelText('Part 2 model'), 'Ctrl-v1')
    await user.type(screen.getByLabelText('I_old low'), '3')
    await user.type(screen.getByLabelText('I_old high'), '4')
    await user.click(screen.getByRole('button', { name: 'Add device' }))

    expect(client.createDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'NET-SW-009',
        device_type: 'network_switch',
        components: [
          { type: 'psu', model: 'PSU-550 (sample)' },
          { type: 'cpu', model: 'Ctrl-v1' },
        ],
        inputs: { I_old: { low: 3, high: 4 }, I_new: null, W: null, T: null, E_new: null },
        sample_data: true,
      }),
    )
    await vi.waitFor(() => expect(client.getDevice).toHaveBeenCalledWith('NET-SW-009'))
  })

  it('checks the form before calling the API', async () => {
    signIn()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Add device' }))

    expect(screen.getByText('Enter a device ID.')).toBeTruthy()
    expect(screen.getByText('Enter the model.')).toBeTruthy()
    expect(client.createDevice).not.toHaveBeenCalled()
  })

  it('shows the API message, e.g. an id that is already taken', async () => {
    signIn()
    vi.mocked(client.createDevice).mockRejectedValue(new client.ApiError(400, "Device 'NET-SW-009' already exists."))
    renderPage()

    const user = await fillRequired()
    await user.click(screen.getByRole('button', { name: 'Add device' }))

    expect((await screen.findByRole('alert')).textContent).toContain('already exists')
  })
})
