import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import deviceDetail from '../../../contracts/examples/device_detail.json'
import error404 from '../../../contracts/examples/error_404.json'
import insufficient from '../../../contracts/examples/evaluation_insufficient_data.json'
import uncertain from '../../../contracts/examples/evaluation_uncertain.json'
import { App } from '../App'
import * as client from '../api/client'
import type { DeviceDetail, Evaluation, PassportEvent } from '../api/types'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getDevice: vi.fn(),
  evaluateDevice: vi.fn(),
  addEvent: vi.fn(),
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
    vi.mocked(client.getDevice).mockResolvedValue(withHistory)
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
    expect(screen.getByText('Pro-keep end', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText('Pro-replace end', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText('net +100 kg CO₂e')).toBeTruthy()
    expect(screen.getByText('net +1,200 kg CO₂e')).toBeTruthy()
    expect(screen.getByText('WL-LAB')).toBeTruthy()
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

    expect(await screen.findByText(/Missing inputs/)).toBeTruthy()
    expect(screen.getByText('I_old', { selector: 'li' })).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Net saving/ })).toBeNull()
  })

  it('invites an evaluation when there is none yet', async () => {
    vi.mocked(client.getDevice).mockResolvedValue({ ...detail, latest_evaluation: null })
    renderDevice()

    expect(await screen.findByText(/Not evaluated yet/)).toBeTruthy()
    expect(screen.getAllByText('NOT EVALUATED').length).toBeGreaterThan(0)
  })

  it('shows the API message for an unknown device', async () => {
    vi.mocked(client.getDevice).mockRejectedValue(new client.ApiError(404, error404.error))
    renderDevice('NOPE')

    expect((await screen.findByRole('alert')).textContent).toContain(error404.error)
  })

  it('shows the SAMPLE DATA label', async () => {
    renderDevice()

    await screen.findByRole('list', { name: 'Passport events' })
    expect(screen.getByText('SAMPLE DATA')).toBeTruthy()
  })
})
