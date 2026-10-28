import forecast from '../../../data/market_forecast.json'
import type { ForecastPoint } from '../api/types'
import { ForecastCharts } from '../components/ForecastChart'
import { PageIntro, container } from '../components/ui'

/** Public market context (PRD 15.4). Hanif supplies the verified figures; until then the page stays empty. */
export function MarketPage() {
  return (
    <div className={`${container} flex flex-col gap-6 pt-[clamp(24px,4vw,40px)] pb-16`}>
      <div className="max-w-[720px]">
        <PageIntro eyebrow="/ Market" title="Market context">
          <p className="text-[15px] text-pretty text-ink-2">
            Published figures on AI hardware and e-waste. Every point shows its source and page, forecasts are drawn
            hollow and dashed, and each chart has one unit. These figures are never mixed with the demo's sample data.
          </p>
        </PageIntro>
      </div>
      <ForecastCharts points={forecast as ForecastPoint[]} />
    </div>
  )
}
