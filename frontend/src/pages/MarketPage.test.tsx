import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import type { ForecastPoint } from '../api/types'
import { ForecastCharts } from '../components/ForecastChart'

// Made-up points that only exercise the drawing code; never shown in the app.
const point = (
  year: number,
  value: number,
  kind: ForecastPoint['kind'],
  extra: Partial<ForecastPoint> = {},
): ForecastPoint => ({
  series: 'Test series',
  year,
  value,
  unit: 'units',
  kind,
  source: 'Test source',
  page: '12',
  evidence_row: 'E99',
  ...extra,
})

describe('market page', () => {
  it('shows an empty state and no numbers while there are no verified figures', () => {
    render(
      <MemoryRouter initialEntries={['/market']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Market context' })).toBeTruthy()
    expect(screen.getByText(/Waiting for verified figures/)).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('forecast charts', () => {
  it('draws one chart per series with source and page on every point', () => {
    render(
      <ForecastCharts
        points={[
          point(2024, 10, 'actual'),
          point(2025, 12, 'actual'),
          point(2026, 15, 'forecast'),
          point(2024, 3, 'actual', { series: 'Other series', unit: 'kt' }),
        ]}
      />,
    )

    expect(screen.getAllByRole('img')).toHaveLength(2)
    const table = screen.getAllByRole('table')[0]
    expect(within(table).getAllByText('Test source, p. 12')).toHaveLength(3)
    expect(within(table).getByText('forecast')).toBeTruthy()
  })

  it('leaves out any point that is not traced to an evidence row', () => {
    render(<ForecastCharts points={[point(2024, 10, 'actual', { evidence_row: '' })]} />)

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText(/Waiting for verified figures/)).toBeTruthy()
  })
})
