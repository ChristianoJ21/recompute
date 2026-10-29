import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  it('draws the published charts from data/market_forecast.json, one source each, with no mock data', () => {
    render(
      <MemoryRouter initialEntries={['/market']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Market context' })).toBeTruthy()
    for (const title of [
      'Global e-waste: generated vs documented as formally collected and recycled',
      'Documented formal collection and recycling rate',
      'U.S. installed server base (model estimate)',
      'Assumed average U.S. server lifetime (model assumption)',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    }
    // Four charts; the blurred hero photo is decoration (alt=""), credited by a link.
    expect(screen.getAllByRole('img').filter((el) => el.tagName.toLowerCase() !== 'img')).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Tyler Daviaux / Unsplash' })).toBeTruthy()
    expect(screen.getAllByText(/^Source: Baldé et al\., 2024, pp\. [\d, ]+\./)).toHaveLength(2)
    expect(screen.getAllByText(/^Source: Shehabi et al\., 2024, p\. 30\./)).toHaveLength(2)
    expect(screen.queryByText(/MOCK DATA/)).toBeNull()
    expect(screen.queryByText(/Waiting for verified figures/)).toBeNull()
  })
})

describe('forecast charts', () => {
  it('draws one chart per series with source and page on every point', async () => {
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
    const toTable = screen.getAllByRole('button', { name: 'Table' })[0]
    expect(toTable.getAttribute('aria-pressed')).toBe('false')
    await userEvent.click(toTable)
    expect(toTable.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getAllByRole('img')).toHaveLength(1)
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('Test source, p. 12')).toHaveLength(3)
    expect(within(table).getByText('Forecast or scenario')).toBeTruthy()
    expect(within(table).getAllByText('Published figure')).toHaveLength(2)
  })

  it('puts series that share a chart title in one panel, named in a legend and on the lines', async () => {
    render(
      <ForecastCharts
        points={[
          point(2010, 34, 'actual', { chart: 'Shared chart', series: 'Generated' }),
          point(2030, 82, 'forecast', { chart: 'Shared chart', series: 'Generated', note: 'Business-as-usual scenario' }),
          point(2010, 8, 'actual', { chart: 'Shared chart', series: 'Recycled' }),
        ]}
      />,
    )

    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Shared chart' })).toBeTruthy()
    const legend = screen.getByRole('list', { name: 'Series' })
    expect(within(legend).getByText('Generated')).toBeTruthy()
    expect(within(legend).getByText('Recycled')).toBeTruthy()
    const plot = screen.getByRole('img')
    expect(within(plot).getByText('Generated')).toBeTruthy()
    expect(within(plot).getByText('Recycled')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Table' }))
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Series' })).toBeTruthy()
    expect(within(table).getAllByText('Generated')).toHaveLength(2)
    expect(within(table).getByText('Business-as-usual scenario')).toBeTruthy()
  })

  it('shows a point in a tooltip on hover and on keyboard focus, with its note and source', async () => {
    const user = userEvent.setup()
    render(
      <ForecastCharts
        points={[
          point(2020, 1.6, 'actual', { chart: 'Servers', series: 'AI, high' }),
          point(2028, 12, 'forecast', { chart: 'Servers', series: 'AI, high', note: 'High end of the range' }),
          point(2020, 1.6, 'actual', { chart: 'Servers', series: 'AI, low' }),
        ]}
      />,
    )
    const target = screen.getByLabelText(/^AI, high, 2028: 12 units/)

    await user.hover(target)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toContain('AI, high')
    expect(tooltip.textContent).toContain('High end of the range')
    expect(tooltip.textContent).toContain('Source: Test source, p. 12')
    await user.unhover(target)
    expect(screen.queryByRole('tooltip')).toBeNull()

    target.focus()
    expect(await screen.findByRole('tooltip')).toBeTruthy()
  })

  it('shows no series legend when a chart has one line: the title names it', () => {
    render(<ForecastCharts points={[point(2020, 5, 'actual'), point(2023, 5.7, 'actual')]} />)

    expect(screen.queryByRole('list', { name: 'Series' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Test series' })).toBeTruthy()
  })

  it('leaves out any point that is not traced to an evidence row', () => {
    render(<ForecastCharts points={[point(2024, 10, 'actual', { evidence_row: '' })]} />)

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText(/Waiting for verified figures/)).toBeTruthy()
  })
})

describe('mock market data (dev server only)', () => {
  it('draws mock points without evidence rows, under a MOCK DATA banner', () => {
    render(<ForecastCharts mock points={[point(2024, 10, 'actual', { evidence_row: 'MOCK' }), point(2025, 12, 'forecast', { evidence_row: 'MOCK' })]} />)

    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByText(/MOCK DATA/)).toBeTruthy()
  })

  it('stays off in tests and production builds, so the market page shows no numbers there', () => {
    expect(import.meta.env.VITE_MARKET_MOCK).toBeUndefined()
  })
})
