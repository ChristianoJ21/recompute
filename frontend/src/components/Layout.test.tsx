import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import * as client from '../api/client'
import { TECH_SESSION, signIn } from '../test/session'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getListings: vi.fn(),
  getContact: vi.fn(),
  getDevice: vi.fn(),
  verifyEvents: vi.fn(),
}))

const renderAt = (path = '/market') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

const menuButton = () => screen.getByRole('button', { name: 'Menu' })
const menu = () => screen.getByRole('navigation', { name: 'Menu' })

describe('header menu', () => {
  beforeEach(() => {
    vi.mocked(client.getListings).mockReset().mockResolvedValue([])
    vi.mocked(client.getContact).mockReset().mockReturnValue(new Promise(() => {}))
    vi.mocked(client.getDevice).mockReset().mockReturnValue(new Promise(() => {}))
    vi.mocked(client.verifyEvents).mockReset().mockReturnValue(new Promise(() => {}))
  })

  it('links Home, Available hardware and Market in the main navigation', () => {
    renderAt()

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/')
    expect(within(nav).getByRole('link', { name: 'Available hardware' }).getAttribute('href')).toBe('/hardware')
    expect(within(nav).getByRole('link', { name: 'Market' }).getAttribute('aria-current')).toBe('page')
    expect(within(nav).queryByRole('link', { name: 'Fleet' })).toBeNull()
  })

  it('switches between light and dark with the theme button', async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('closes the menu with its own close button', async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(menuButton())
    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(menuButton())
  })

  it('opens and closes with the Menu button, and Escape closes it', async () => {
    const user = userEvent.setup()
    renderAt()

    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
    await user.click(menuButton())
    expect(menuButton().getAttribute('aria-expanded')).toBe('true')
    expect(within(menu()).getByRole('link', { name: /Available hardware/ })).toBeTruthy()

    await user.keyboard('{Escape}')
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('navigation', { name: 'Menu' })).toBeNull()
    expect(document.activeElement).toBe(menuButton())
  })

  it('closes when a page is chosen and when clicking outside it', async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(menuButton())
    await user.click(within(menu()).getByRole('link', { name: /Available hardware/ }))
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Available hardware')

    await user.click(menuButton())
    await user.click(screen.getByRole('contentinfo'))
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
  })

  it('offers a visitor the technician login and appearance settings', async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(menuButton())
    expect(within(menu()).getByRole('link', { name: /Technician login/ }).getAttribute('href')).toBe('/login')
    expect(within(menu()).getByRole('link', { name: /Settings/ }).getAttribute('href')).toBe('/settings')
    expect(within(menu()).queryByRole('link', { name: /Fleet/ })).toBeNull()
    expect(within(menu()).getByText('Light')).toBeTruthy()
  })

  it('offers a technician the fleet pages, settings and log out', async () => {
    const user = userEvent.setup()
    signIn()
    renderAt()

    await user.click(menuButton())
    expect(within(menu()).getByRole('link', { name: /Fleet/ })).toBeTruthy()
    expect(within(menu()).getByRole('link', { name: /Add technician/ })).toBeTruthy()
    expect(within(menu()).getByText(TECH_SESSION.technician.name)).toBeTruthy()
    await user.click(within(menu()).getByRole('button', { name: /Log out/ }))
    expect(client.currentSession()).toBeNull()
  })

  it('shows the SAMPLE DATA label and the sample-data footer on every page', () => {
    renderAt('/settings')

    expect(screen.getByText('SAMPLE DATA')).toBeTruthy()
    expect(within(screen.getByRole('contentinfo')).getByText(/Nothing here is a measurement/)).toBeTruthy()
  })

  it('shows a not-found page for an unknown address', () => {
    renderAt('/nowhere')

    expect(screen.getByRole('heading', { name: 'No page or device at this address' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '← Available hardware' }).getAttribute('href')).toBe('/hardware')
  })
})
