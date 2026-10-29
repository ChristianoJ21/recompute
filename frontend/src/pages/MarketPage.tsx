import forecast from '../../../data/market_forecast.json'
import mockForecast from '../../../data/market_forecast.mock.json'
import type { ForecastPoint } from '../api/types'
import { ForecastCharts } from '../components/ForecastChart'
import { HandNote, HeroLabel, HeroText, PageHero, band, container } from '../components/ui'
import { Chip } from '../design/Art'

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
        mascot={
          <div data-reveal="1" className="flex items-end gap-1.5">
            <HandNote className="max-w-[9em] -rotate-3 pb-10 text-right">every point shows its source</HandNote>
            <Chip pose="magnify" anim={['magnify', 'blink']} parallax={0.05} className="aspect-[204/214] w-[130px]" />
          </div>
        }
      >
        <HeroText>
          Published figures on AI hardware and e-waste. Every point shows its source and page, forecasts are drawn hollow and
          dashed, and each chart has one unit. These figures are never mixed with the demo's sample data.
        </HeroText>
      </PageHero>
      <div className={band}>
        <div className={container}>
          <ForecastCharts points={mock ? (mockForecast as ForecastPoint[]) : verified} mock={mock} />
        </div>
      </div>
    </>
  )
}
