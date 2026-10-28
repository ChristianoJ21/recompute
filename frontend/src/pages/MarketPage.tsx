import forecast from '../../../data/market_forecast.json'
import type { ForecastPoint } from '../api/types'
import { ForecastCharts } from '../components/ForecastChart'

/** Public market context (PRD 15.4). Hanif supplies the verified figures; until then the page stays empty. */
export function MarketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Market context</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Published figures about the hardware market, for context. They are not ReCompute results and not demo data:
          each point names its source and page and comes from a verified row of the team's evidence sheet. Forecasts are
          marked as forecasts.
        </p>
      </div>
      <ForecastCharts points={forecast as ForecastPoint[]} />
    </div>
  )
}
