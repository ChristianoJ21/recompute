import { sparkPath } from '../lib/telemetry'

interface SparklineProps {
  values: number[]
  /** A CSS colour (token var) for the line and its soft fill. */
  colour: string
  height?: number
  className?: string
}

/** Small trend line of sample telemetry; decorative, the number next to it carries the value. */
export function Sparkline({ values, colour, height = 40, className = '' }: SparklineProps) {
  const path = sparkPath(values, 120, height)
  if (!path) return <span aria-hidden className={`block ${className}`} style={{ height }} />
  return (
    <svg viewBox={`0 0 120 ${height}`} preserveAspectRatio="none" aria-hidden className={`block w-full ${className}`} style={{ height }}>
      <path d={path.area} fill={colour} fillOpacity={0.14} className="transition-[d] duration-700" />
      <path d={path.line} fill="none" stroke={colour} strokeWidth={2} vectorEffect="non-scaling-stroke" className="transition-[d] duration-700" />
    </svg>
  )
}
