import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import contact from '../../../contracts/examples/contact.json'
import deviceDetail from '../../../contracts/examples/device_detail.json'
import enquiryCreated from '../../../contracts/examples/enquiry_created.json'
import chainOk from '../../../contracts/examples/events_verify.json'
import favouriteSaved from '../../../contracts/examples/favourite_saved.json'
import listings from '../../../contracts/examples/listings.json'
import { App } from '../App'
import * as client from '../api/client'
import type { ChainCheck, Contact, DeviceDetail, Enquiry, Favourite, Listing } from '../api/types'
import { CUSTOMER_SESSION, signInCustomer } from '../test/session'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getListings: vi.fn(),
  getContact: vi.fn(),
  getDevice: vi.fn(),
  verifyEvents: vi.fn(),
  signUp: vi.fn(),
  customerLogin: vi.fn(),
  getFavourites: vi.fn(),
  saveFavourite: vi.fn(),
  removeFavourite: vi.fn(),
  sendEnquiry: vi.fn(),
  getMyEnquiries: vi.fn(),
}))

const LISTING = listings[0] as Listing
const FAVOURITE = favouriteSaved as Favourite
const ENQUIRY = enquiryCreated as Enquiry
const base = deviceDetail as DeviceDetail
const LISTED: DeviceDetail = {
  ...base,
  events: [
    { ...base.events[0], id: 999, kind: 'list', payload: { price: { amount: 45000000, currency: 'IDR' }, note: 'Released (sample)' } },
    ...base.events,
  ],
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

/** The mocked API stores the login the way the real client does. */
const logsIn = async () => {
  signInCustomer()
  return CUSTOMER_SESSION
}

beforeEach(() => {
  vi.mocked(client.getListings).mockReset().mockResolvedValue([LISTING])
  vi.mocked(client.getContact).mockReset().mockResolvedValue(contact as Contact)
  vi.mocked(client.getDevice).mockReset().mockResolvedValue(LISTED)
  vi.mocked(client.verifyEvents).mockReset().mockResolvedValue(chainOk as ChainCheck)
  vi.mocked(client.getFavourites).mockReset().mockResolvedValue([])
  vi.mocked(client.saveFavourite).mockReset().mockResolvedValue(FAVOURITE)
  vi.mocked(client.removeFavourite).mockReset().mockResolvedValue({ device_id: FAVOURITE.device_id, removed: true })
  vi.mocked(client.sendEnquiry).mockReset().mockResolvedValue(ENQUIRY)
  vi.mocked(client.getMyEnquiries).mockReset().mockResolvedValue([])
  vi.mocked(client.signUp).mockReset()
  vi.mocked(client.customerLogin).mockReset()
})

describe('customer sign-up and login', () => {
  it('creates an account and opens My account', async () => {
    vi.mocked(client.signUp).mockImplementation(logsIn)
    const user = userEvent.setup()
    renderAt('/signup')

    await user.type(screen.getByLabelText('Full name'), 'Ana (sample)')
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText(/^Password/), 'a long enough password')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(client.signUp).toHaveBeenCalledWith({ name: 'Ana (sample)', email: 'ana@example.com', password: 'a long enough password' })
    expect(await screen.findByRole('heading', { level: 1, name: 'My account' })).toBeTruthy()
  })

  it('checks the password length before calling the API', async () => {
    const user = userEvent.setup()
    renderAt('/signup')

    await user.type(screen.getByLabelText('Full name'), 'Ana (sample)')
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText(/^Password/), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/at least 10 characters/)
    expect(client.signUp).not.toHaveBeenCalled()
  })

  it('logs a customer in, and offers sign-up and the staff login', async () => {
    vi.mocked(client.customerLogin).mockImplementation(logsIn)
    const user = userEvent.setup()
    renderAt('/account/login')

    expect(screen.getByRole('link', { name: /Create an account/ }).getAttribute('href')).toBe('/signup')
    expect(screen.getByRole('link', { name: /Technician login/ }).getAttribute('href')).toBe('/login')
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText(/^Password/), 'a long enough password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(client.customerLogin).toHaveBeenCalledWith('ana@example.com', 'a long enough password')
    expect(await screen.findByRole('heading', { level: 1, name: 'My account' })).toBeTruthy()
  })

  it('says when the e-mail or password is wrong', async () => {
    vi.mocked(client.customerLogin).mockRejectedValue(new client.ApiError(401, 'Wrong e-mail or password.'))
    const user = userEvent.setup()
    renderAt('/account/login')

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText(/^Password/), 'wrong password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Wrong e-mail or password')
  })
})

describe('my account', () => {
  it('shows the customer login to a visitor', () => {
    renderAt('/account')

    expect(screen.getByRole('heading', { level: 1, name: 'Customer login' })).toBeTruthy()
  })

  it('lists the saved devices and the questions sent, and removes a saved device', async () => {
    signInCustomer()
    vi.mocked(client.getFavourites).mockResolvedValue([FAVOURITE])
    vi.mocked(client.getMyEnquiries).mockResolvedValue([ENQUIRY])
    const user = userEvent.setup()
    renderAt('/account')

    const saved = await screen.findByRole('list', { name: 'Saved devices' })
    expect(within(saved).getByRole('link', { name: /GPU-SRV-001/ }).getAttribute('href')).toBe('/device/GPU-SRV-001')
    expect(within(saved).getByText('IDR 45,000,000')).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Your questions' })).getByText(ENQUIRY.message)).toBeTruthy()
    await user.click(within(saved).getByRole('button', { name: 'Remove GPU-SRV-001 from saved devices' }))

    expect(client.removeFavourite).toHaveBeenCalledWith('GPU-SRV-001')
    expect(await screen.findByText(/No saved devices yet/)).toBeTruthy()
  })

  it('logs out from My account', async () => {
    signInCustomer()
    const user = userEvent.setup()
    renderAt('/account')

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(client.currentCustomer()).toBeNull()
  })
})

describe('saving devices and asking about them', () => {
  it('lets a customer save a listed device from its card, and unsave it', async () => {
    signInCustomer()
    const user = userEvent.setup()
    renderAt('/hardware')

    const save = await screen.findByRole('button', { name: 'Save GPU-SRV-001' })
    expect(save.getAttribute('aria-pressed')).toBe('false')
    await user.click(save)
    expect(client.saveFavourite).toHaveBeenCalledWith('GPU-SRV-001')
    expect(screen.getByRole('button', { name: 'Save GPU-SRV-001' }).getAttribute('aria-pressed')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Save GPU-SRV-001' }))

    expect(client.removeFavourite).toHaveBeenCalledWith('GPU-SRV-001')
  })

  it('shows no save button to a visitor and loads no saved list', async () => {
    renderAt('/hardware')

    await screen.findByRole('list', { name: 'Listed hardware' })
    expect(screen.queryByRole('button', { name: /^Save / })).toBeNull()
    expect(client.getFavourites).not.toHaveBeenCalled()
  })

  it('lets a customer save the device and send a question from its passport', async () => {
    signInCustomer()
    const user = userEvent.setup()
    renderAt('/device/GPU-SRV-001')

    expect(await screen.findByRole('button', { name: 'Save GPU-SRV-001' })).toBeTruthy()
    await user.click(screen.getByText('Ask a question'))
    await user.type(screen.getByLabelText('Your question'), 'Is the power supply included?')
    await user.click(screen.getByRole('button', { name: 'Send question' }))

    expect(client.sendEnquiry).toHaveBeenCalledWith({ device_id: 'GPU-SRV-001', message: 'Is the power supply included?' })
    expect(await screen.findByText(/Question sent/)).toBeTruthy()
  })

  it('keeps the e-mail link for a visitor, without the in-app question form', async () => {
    renderAt('/device/GPU-SRV-001')

    expect(await screen.findByRole('link', { name: /Ask about this device/ })).toBeTruthy()
    expect(screen.queryByLabelText('Your question')).toBeNull()
  })
})
