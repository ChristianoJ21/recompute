import forecast from '../../../data/market_forecast.json'
import mockForecast from '../../../data/market_forecast.mock.json'
import type { ForecastPoint } from '../api/types'
import { ForecastCharts } from '../components/ForecastChart'
import { HeroLabel, PageHero, band, container } from '../components/ui'
import { PHOTOS } from '../lib/photos'

// Only `npm run dev` sets this (frontend/.env.development); builds, hosting and tests never show mock numbers.
const MOCK_ALLOWED = import.meta.env.VITE_MARKET_MOCK === '1'

/** Public market context (PRD 15.4): published figures from verified evidence-sheet rows only. */
export function MarketPage() {
  const verified = forecast as ForecastPoint[]
  const mock = MOCK_ALLOWED && verified.length === 0
  return (
    <>
      <PageHero
        eyebrow={<HeroLabel>MARKET</HeroLabel>}
        title="Market context"
        photo={PHOTOS.market}
        aside={
          <p className="max-w-[60ch] text-[clamp(16px,1.35vw,19px)] text-pretty text-night-fg2">
            Published figures on AI hardware and e-waste. Every point shows its source and page, forecasts are drawn hollow
            and dashed, and each chart has one unit. These figures are never mixed with the demo's sample data.
          </p>
        }
      />
      <div className={band}>
        <div className={container}>
          <ForecastCharts points={mock ? (mockForecast as ForecastPoint[]) : verified} mock={mock} />
        </div>
      </div>
    </>
  )
}
