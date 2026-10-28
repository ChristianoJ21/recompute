import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import * as client from '../api/client'
import { THEME_KEY } from '../lib/theme'
import { TECH_SESSION, signIn } from '../test/session'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}))

const renderSettings = () =>
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <App />
    </MemoryRouter>,
  )

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('settings for a visitor', () => {
  it('offers only the appearance, and applies and remembers the choice', async () => {
    const user = userEvent.setup()
    renderSettings()

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Profile' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Credentials' })).toBeNull()
    const themes = screen.getByRole('radiogroup', { name: 'Theme' })
    expect((within(themes).getByRole('radio', { name: /Light/ }) as HTMLInputElement).checked).toBe(true)

    await user.click(within(themes).getByRole('radio', { name: /Dark/ }))

    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

describe('settings for a technician', () => {
  beforeEach(() => {
    signIn()
    vi.mocked(client.updateProfile).mockReset()
    vi.mocked(client.changePassword).mockReset()
  })

  it('shows the username read-only and saves a new full name', async () => {
    const user = userEvent.setup()
    vi.mocked(client.updateProfile).mockResolvedValue({ ...TECH_SESSION.technician, name: 'Technician Uno' })
    renderSettings()

    const profile = screen.getByRole('region', { name: 'Profile' })
    expect(within(profile).getAllByText(TECH_SESSION.technician.username).length).toBeGreaterThan(0)
    const name = within(profile).getByLabelText('Full name')
    await user.clear(name)
    await user.type(name, '  Technician Uno ')
    await user.click(within(profile).getByRole('button', { name: 'Save profile' }))

    expect(client.updateProfile).toHaveBeenCalledWith('Technician Uno')
    expect(await within(profile).findByRole('status')).toBeTruthy()
  })

  it('refuses an empty name before calling the API', async () => {
    const user = userEvent.setup()
    renderSettings()

    const profile = screen.getByRole('region', { name: 'Profile' })
    await user.clear(within(profile).getByLabelText('Full name'))
    await user.click(within(profile).getByRole('button', { name: 'Save profile' }))

    expect((await within(profile).findByRole('alert')).textContent).toMatch(/full name/i)
    expect(client.updateProfile).not.toHaveBeenCalled()
  })

  it('changes the password after checking length and confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(client.changePassword).mockResolvedValue(TECH_SESSION.technician)
    renderSettings()
    const credentials = screen.getByRole('region', { name: 'Credentials' })
    const fill = async (current: string, next: string, confirm: string) => {
      for (const [label, value] of [['Current password', current], [/^New password/, next], ['Confirm new password', confirm]] as const) {
        const field = within(credentials).getByLabelText(label)
        await user.clear(field)
        await user.type(field, value)
      }
      await user.click(within(credentials).getByRole('button', { name: 'Change password' }))
    }

    await fill('old password 1', 'short', 'short')
    expect((await within(credentials).findByRole('alert')).textContent).toMatch(/at least 10 characters/)

    await fill('old password 1', 'new password 22', 'new password 23')
    expect((await within(credentials).findByRole('alert')).textContent).toMatch(/do not match/)
    expect(client.changePassword).not.toHaveBeenCalled()

    await fill('old password 1', 'new password 22', 'new password 22')
    expect(client.changePassword).toHaveBeenCalledWith('old password 1', 'new password 22')
    expect((await within(credentials).findByRole('status')).textContent).toMatch(/Password changed/)
    expect((within(credentials).getByLabelText('Current password') as HTMLInputElement).value).toBe('')
  })

  it('shows the API message when the current password is wrong', async () => {
    const user = userEvent.setup()
    vi.mocked(client.changePassword).mockRejectedValue(new client.ApiError(400, 'Current password is wrong.'))
    renderSettings()
    const credentials = screen.getByRole('region', { name: 'Credentials' })

    await user.type(within(credentials).getByLabelText('Current password'), 'not it at all')
    await user.type(within(credentials).getByLabelText(/^New password/), 'new password 22')
    await user.type(within(credentials).getByLabelText('Confirm new password'), 'new password 22')
    await user.click(within(credentials).getByRole('button', { name: 'Change password' }))

    expect((await within(credentials).findByRole('alert')).textContent).toContain('Current password is wrong.')
    expect(client.currentSession()).not.toBeNull()
  })
})
