import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import deviceDetail from '../../../contracts/examples/device_detail.json'
import error404 from '../../../contracts/examples/error_404.json'
import chainOk from '../../../contracts/examples/events_verify.json'
import insufficient from '../../../contracts/examples/evaluation_insufficient_data.json'
import uncertain from '../../../contracts/examples/evaluation_uncertain.json'
import { App } from '../App'
import * as client from '../api/client'
import type { ChainCheck, DeviceDetail, Evaluation, PassportEvent } from '../api/types'
import { signIn } from '../test/session'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getDevice: vi.fn(),
  evaluateDevice: vi.fn(),
  addEvent: vi.fn(),
  verifyEvents: vi.fn(),
  listDevice: vi.fn(),
  unlistDevice: vi.fn(),
  getContact: vi.fn(async () => (await import('../../../contracts/examples/contact.json')).default),
}))

const detail = deviceDetail as DeviceDetail
const baseEvent = detail.events[0]

const event = (id: number, kind: PassportEvent['kind'], note: string): PassportEvent => ({
  ...baseEvent,
  id,
  kind,
  payload: { note },
  created_at: `2026-11-0${id}T10:00:00Z`,
})

// Oldest first on purpose: the page must still show the newest event first.
const withHistory: DeviceDetail = {
  ...detail,
  events: [event(1, 'telemetry', 'first reading'), event(2, 'scan', 'label scanned'), event(3, 'wipe', 'disk wiped')],
}

const renderDevice = (id = 'GPU-SRV-001') =>
  render(
    <MemoryRouter initialEntries={[`/device/${id}`]}>
      <App />
    </MemoryRouter>,
  )

describe('device page', () => {
  beforeEach(() => {
    signIn()
    vi.mocked(client.getDevice).mockReset().mockResolvedValue(withHistory)
    vi.mocked(client.addEvent).mockReset()
    vi.mocked(client.verifyEvents).mockReset().mockResolvedValue(chainOk as ChainCheck)
  })

  it('shows the passport history newest first', async () => {
    renderDevice()

    const history = await screen.findByRole('list', { name: 'Passport events' })
    const items = within(history).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('disk wiped'),
      expect.stringContaining('label scanned'),
      expect.stringContaining('first reading'),
    ])
    expect(client.getDevice).toHaveBeenCalledWith('GPU-SRV-001')
  })

  it('explains the latest evaluation: reason, net range with zero, both scenarios', async () => {
    renderDevice()

    expect(await screen.findByText(detail.latest_evaluation!.reason)).toBeTruthy()
    expect(screen.getByRole('img', { name: /from \+100 kg CO₂e to \+1,200 kg CO₂e; zero is marked/ })).toBeTruthy()
    expect(screen.getByText('Pro-keep end')).toBeTruthy()
    expect(screen.getByText('Pro-replace end')).toBeTruthy()
    expect(screen.getByText('net +100 kg CO₂e')).toBeTruthy()
    expect(screen.getByText('net +1,200 kg CO₂e')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Why this recommendation' })).getByText('WL-LAB')).toBeTruthy()
  })

  it('runs the engine when Evaluate is pressed and shows the new result', async () => {
    vi.mocked(client.evaluateDevice).mockResolvedValue({ ...(uncertain as Evaluation), device_id: 'GPU-SRV-001' })
    renderDevice()

    await userEvent.click(await screen.findByRole('button', { name: 'Evaluate' }))

    expect(client.evaluateDevice).toHaveBeenCalledWith('GPU-SRV-001')
    expect(await screen.findByText(uncertain.reason)).toBeTruthy()
    expect(screen.getByRole('img', { name: /from −500 kg CO₂e to \+150 kg CO₂e/ })).toBeTruthy()
  })

  it('lists the missing inputs and draws no bar for INSUFFICIENT_DATA', async () => {
    vi.mocked(client.getDevice).mockResolvedValue({ ...detail, latest_evaluation: insufficient as Evaluation })
    renderDevice()

    expect(await screen.findByText(/missing inputs/i)).toBeTruthy()
    expect(screen.getByText('I_old', { selector: 'li' })).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Net saving/ })).toBeNull()
  })

  it('invites an evaluation when there is none yet', async () => {
    vi.mocked(client.getDevice).mockResolvedValue({ ...detail, latest_evaluation: null })
    renderDevice()

    expect(await screen.findByText(/Not evaluated yet/)).toBeTruthy()
    expect(screen.getAllByText('NOT EVALUATED').length).toBeGreaterThan(0)
  })

  it('tells a visitor who scanned an unknown ID to check it, instead of showing the API message', async () => {
    vi.mocked(client.getDevice).mockRejectedValue(new client.ApiError(404, error404.error))
    renderDevice('NOPE')

    expect(await screen.findByRole('heading', { name: 'No page or device at this address' })).toBeTruthy()
    expect(screen.queryByText(error404.error)).toBeNull()
  })

  it('shows the API message and Try again for other errors', async () => {
    vi.mocked(client.getDevice).mockRejectedValueOnce(new client.ApiError(0, 'Cannot reach the ReCompute server.'))
    renderDevice()

    expect((await screen.findByRole('alert')).textContent).toContain('Cannot reach')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Passport events' })).toBeTruthy()
  })

  it('offers the six technician actions, without telemetry', async () => {
    renderDevice()

    const radios = await screen.findAllByRole('radio')
    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual([
      'scan',
      'repair',
      'upgrade',
      'wipe',
      'move',
      'note',
    ])
  })

  it('posts a technician event and refreshes the history', async () => {
    const user = userEvent.setup()
    const wipe = event(4, 'wipe', 'wiped for redeploy')
    vi.mocked(client.addEvent).mockResolvedValue(wipe)
    vi.mocked(client.getDevice)
      .mockResolvedValueOnce(withHistory)
      .mockResolvedValueOnce({ ...withHistory, events: [...withHistory.events, wipe] })
    renderDevice()

    await user.click(await screen.findByRole('radio', { name: 'Wipe' }))
    await user.type(screen.getByLabelText(/Details/), 'wiped for redeploy')
    await user.click(screen.getByRole('button', { name: 'Add to passport' }))

    // No actor in the body: the server takes it from the login token.
    expect(client.addEvent).toHaveBeenCalledWith('GPU-SRV-001', { kind: 'wipe', payload: { note: 'wiped for redeploy' } })
    expect(screen.queryByLabelText(/Your name/)).toBeNull()
    expect(await screen.findByText(/as event #4/)).toBeTruthy()
    const items = within(screen.getByRole('list', { name: 'Passport events' })).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0].textContent).toContain('wiped for redeploy')
    expect(client.getDevice).toHaveBeenCalledTimes(2)
  })

  it('shows the API error when the event is refused', async () => {
    const user = userEvent.setup()
    vi.mocked(client.addEvent).mockRejectedValue(new client.ApiError(409, 'Send this event again.'))
    renderDevice()

    await user.click(await screen.findByRole('button', { name: 'Add to passport' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Send this event again.')
    expect(client.getDevice).toHaveBeenCalledTimes(1)
  })

  it('shows the QR code served by the API', async () => {
    renderDevice()

    const qr = await screen.findByRole('img', { name: /QR code/ })
    expect(qr.getAttribute('src')).toBe('/api/devices/GPU-SRV-001/qr')
  })

  it('shows the SAMPLE DATA label', async () => {
    renderDevice()

    await screen.findByRole('list', { name: 'Passport events' })
    expect(screen.getByText('SAMPLE DATA')).toBeTruthy()
  })

  it('draws the device and its parts as a decorative line drawing', async () => {
    const { container } = renderDevice()

    await screen.findByRole('list', { name: 'Passport events' })
    const art = container.querySelector('[data-art="gpu_server"]')
    expect(art?.getAttribute('aria-hidden')).toBe('true')
    expect(art?.querySelectorAll('[data-part]')).toHaveLength(2)
  })
})

describe('passport integrity badge', () => {
  beforeEach(() => {
    vi.mocked(client.getDevice).mockReset().mockResolvedValue(withHistory)
    vi.mocked(client.verifyEvents).mockReset()
  })

  it('says the passport is intact when the hash chain verifies', async () => {
    vi.mocked(client.verifyEvents).mockResolvedValue(chainOk as ChainCheck)

    renderDevice()

    // Shown on the identity card and in the history header.
    expect(await screen.findAllByText(/passport intact/i)).toHaveLength(2)
    expect(client.verifyEvents).toHaveBeenCalledWith('GPU-SRV-001')
  })

  it('names the first changed event when the chain is broken', async () => {
    vi.mocked(client.verifyEvents).mockResolvedValue({
      ...(chainOk as ChainCheck),
      valid: false,
      first_bad_event_id: 2,
      reason: 'contents changed after the event was written',
    })

    renderDevice()

    expect((await screen.findAllByText(/changed at event #2/i)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/passport intact/i)).toBeNull()
  })

  it('still shows the passport when the check cannot run', async () => {
    vi.mocked(client.verifyEvents).mockRejectedValue(new Error('offline'))

    renderDevice()

    expect((await screen.findAllByText(/integrity check unavailable/i)).length).toBeGreaterThan(0)
    expect(screen.getByRole('list', { name: 'Passport events' })).toBeTruthy()
  })
})

describe('logged-out visitor', () => {
  beforeEach(() => {
    vi.mocked(client.getDevice).mockReset().mockResolvedValue(withHistory)
    vi.mocked(client.verifyEvents).mockReset().mockResolvedValue(chainOk as ChainCheck)
  })

  it('reads the passport but sees no action form, Evaluate or listing buttons', async () => {
    renderDevice()

    expect(await screen.findByRole('list', { name: 'Passport events' })).toBeTruthy()
    expect(screen.getByText(detail.latest_evaluation!.reason)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Evaluate' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add to passport' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Log an action' })).toBeNull()
    expect(screen.queryByRole('button', { name: /List for sale|Remove from sale/ })).toBeNull()
    expect(screen.getByRole('link', { name: '← Available hardware' }).getAttribute('href')).toBe('/hardware')
  })

  it('sees the sample price when the device is listed', async () => {
    vi.mocked(client.getDevice).mockResolvedValue({ ...withHistory, events: [...withHistory.events, listEvent(4)] })
    renderDevice()

    const panel = await screen.findByRole('region', { name: 'For sale' })
    expect(within(panel).getByText(/IDR\s45,000,000/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Remove from sale' })).toBeNull()
  })
})

const PRICE = { amount: 45000000, currency: 'IDR' }

function listEvent(id: number): PassportEvent {
  return { ...event(id, 'list', 'Released after review (sample)'), payload: { price: PRICE, note: 'Released after review (sample)' } }
}

describe('sale listing', () => {
  beforeEach(() => {
    signIn()
    vi.mocked(client.getDevice).mockReset().mockResolvedValue(withHistory)
    vi.mocked(client.verifyEvents).mockReset().mockResolvedValue(chainOk as ChainCheck)
    vi.mocked(client.listDevice).mockReset()
    vi.mocked(client.unlistDevice).mockReset()
  })

  it('lists a wiped device for sale with a price and refreshes the passport', async () => {
    const user = userEvent.setup()
    vi.mocked(client.listDevice).mockResolvedValue(listEvent(4))
    vi.mocked(client.getDevice)
      .mockResolvedValueOnce(withHistory)
      .mockResolvedValueOnce({ ...withHistory, events: [...withHistory.events, listEvent(4)] })
    renderDevice()

    await user.type(await screen.findByLabelText(/Asking price/), '45000000')
    await user.click(screen.getByRole('button', { name: 'List for sale' }))

    expect(client.listDevice).toHaveBeenCalledWith('GPU-SRV-001', { price: PRICE })
    expect(await screen.findByRole('button', { name: 'Remove from sale' })).toBeTruthy()
    expect(client.getDevice).toHaveBeenCalledTimes(2)
  })

  it('asks for a whole amount above zero before calling the API', async () => {
    const user = userEvent.setup()
    renderDevice()

    await user.type(await screen.findByLabelText(/Asking price/), '0')
    await user.click(screen.getByRole('button', { name: 'List for sale' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/whole amount above 0/)
    expect(client.listDevice).not.toHaveBeenCalled()
  })

  it('explains that a wipe is needed before listing', async () => {
    vi.mocked(client.getDevice).mockResolvedValue({ ...withHistory, events: withHistory.events.slice(0, 2) })
    renderDevice()

    expect(await screen.findByText(/Listing needs a/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'List for sale' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('unlists a listed device', async () => {
    const user = userEvent.setup()
    const listed = { ...withHistory, events: [...withHistory.events, listEvent(4)] }
    vi.mocked(client.getDevice).mockResolvedValueOnce(listed).mockResolvedValueOnce(withHistory)
    vi.mocked(client.unlistDevice).mockResolvedValue({ ...event(5, 'unlist', ''), payload: {} })
    renderDevice()

    const panel = await screen.findByRole('region', { name: 'Sale listing' })
    expect(within(panel).getByText(/IDR\s45,000,000/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Remove from sale' }))

    expect(client.unlistDevice).toHaveBeenCalledWith('GPU-SRV-001')
    expect(await screen.findByRole('button', { name: 'List for sale' })).toBeTruthy()
  })

  it('shows the API message when listing is refused', async () => {
    const user = userEvent.setup()
    vi.mocked(client.listDevice).mockRejectedValue(new client.ApiError(400, "'GPU-SRV-001' is already listed."))
    renderDevice()

    await user.type(await screen.findByLabelText(/Asking price/), '45000000')
    await user.click(screen.getByRole('button', { name: 'List for sale' }))

    expect((await screen.findByRole('alert')).textContent).toContain('already listed')
  })
})

describe('passport page layout', () => {
  beforeEach(() => {
    vi.mocked(client.getDevice).mockReset().mockResolvedValue(withHistory)
    vi.mocked(client.verifyEvents).mockReset().mockResolvedValue(chainOk as ChainCheck)
  })

  it('names events in plain words', async () => {
    renderDevice()

    const history = await screen.findByRole('list', { name: 'Passport events' })
    expect(within(history).getByText('Data wipe')).toBeTruthy()
    expect(within(history).getByText('Telemetry reading')).toBeTruthy()
  })

  it('folds the rule inputs, device record and QR label into one technical-details section', async () => {
    renderDevice()

    await screen.findByRole('list', { name: 'Passport events' })
    const details = screen.getByText('Technical details').closest('details')!
    expect(details.open).toBe(false)
    expect(within(details).getByRole('img', { name: /QR code/ })).toBeTruthy()
  })

  it('shows the newest events first and hides older ones behind a button', async () => {
    const many = Array.from({ length: 8 }, (_, i) => event(i + 1, 'note', `note ${i + 1}`))
    vi.mocked(client.getDevice).mockResolvedValue({ ...withHistory, events: many })
    renderDevice()

    const history = await screen.findByRole('list', { name: 'Passport events' })
    expect(within(history).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Show all 8 events' })).toBeTruthy()
  })

  it('says so when a refused token logs the technician out', async () => {
    signIn()
    vi.mocked(client.evaluateDevice).mockImplementation(async () => {
      client.logout()
      throw new client.ApiError(401, 'Token expired; log in again with POST /auth/login.')
    })
    renderDevice()

    await userEvent.click(await screen.findByRole('button', { name: 'Evaluate' }))

    expect(await screen.findByText(/Your login has ended/)).toBeTruthy()
  })
})
