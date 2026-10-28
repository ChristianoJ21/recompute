import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import * as client from '../api/client'
import { signIn } from '../test/session'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  addTechnician: vi.fn(),
}))

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/technicians/new']}>
      <App />
    </MemoryRouter>,
  )

async function fill(password = 'another long password') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Username'), 'tech-2')
  await user.type(screen.getByLabelText('Full name'), 'Technician Two')
  await user.type(screen.getByLabelText(/^Password/), password)
  await user.click(screen.getByRole('button', { name: 'Add technician' }))
}

describe('add technician page', () => {
  beforeEach(() => {
    vi.mocked(client.addTechnician).mockReset()
  })

  it('lets a logged-in technician add a colleague', async () => {
    signIn()
    vi.mocked(client.addTechnician).mockResolvedValue({ username: 'tech-2', name: 'Technician Two' })
    renderPage()

    await fill()

    expect(client.addTechnician).toHaveBeenCalledWith({
      username: 'tech-2',
      name: 'Technician Two',
      password: 'another long password',
    })
    expect(await screen.findByText(/tech-2 can now log in/)).toBeTruthy()
  })

  it('checks the password length before calling the API', async () => {
    signIn()
    renderPage()

    await fill('short')

    expect((await screen.findByRole('alert')).textContent).toMatch(/at least 10 characters/)
    expect(client.addTechnician).not.toHaveBeenCalled()
  })

  it('shows the API message, e.g. a taken username', async () => {
    signIn()
    vi.mocked(client.addTechnician).mockRejectedValue(new client.ApiError(400, "technician 'tech-2' already exists."))
    renderPage()

    await fill()

    expect((await screen.findByRole('alert')).textContent).toContain('already exists')
  })

  it('asks a visitor to log in instead', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Technician login' })).toBeTruthy()
  })
})
