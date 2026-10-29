import { sparkPath } from '../lib/telemetry'

interface SparklineProps {
  values: number[]
  /** A CSS colour (token var) for the line and its soft fill. */
  colour: string
  height?: number
  className?: string
  /**
   * Draw the line in when it scrolls into view (recompute-motion.js animates `.rc-draw` and `.rc-fill` inside a
   * `data-draw` ancestor). The line then keeps the viewBox proportions instead of stretching to a fixed height.
   */
  draw?: boolean
}

/** Small trend line of sample telemetry; decorative, the number next to it carries the value. */
export function Sparkline({ values, colour, height = 40, className = '', draw = false }: SparklineProps) {
  const path = sparkPath(values, 120, height)
  if (!path) return <span aria-hidden className={`block ${className}`} style={draw ? { aspectRatio: `120 / ${height}` } : { height }} />
  return (
    <svg
      viewBox={`0 0 120 ${height}`}
      preserveAspectRatio={draw ? 'xMidYMid meet' : 'none'}
      aria-hidden
      className={`block w-full overflow-visible ${className}`}
      style={draw ? undefined : { height }}
    >
      <path d={path.area} fill={colour} fillOpacity={0.16} className={draw ? 'rc-fill' : 'transition-[d] duration-700'} />
      <path
        d={path.line}
        fill="none"
        stroke={colour}
        strokeWidth={draw ? 2.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect={draw ? undefined : 'non-scaling-stroke'}
        className={draw ? 'rc-draw' : 'transition-[d] duration-700'}
      />
    </svg>
  )
}
