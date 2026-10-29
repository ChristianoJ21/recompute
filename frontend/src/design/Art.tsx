import type { CSSProperties } from 'react'

/** Every asset in recompute-art.js. */
export type ArtName =
  | 'laptop'
  | 'workstation'
  | 'monitor'
  | 'phone'
  | 'keyboard'
  | 'rack'
  | 'ram'
  | 'ssd'
  | 'cpu'
  | 'battery'
  | 'motherboard'
  | 'fan'
  | 'cables'
  | 'gpu'
  | 'bin-back'
  | 'bin-front'
  | 'van'
  | 'conveyor'
  | 'box'
  | 'shield'
  | 'bench'
  | 'magnifier'
  | 'passport'
  | 'qr'
  | 'chain'
  | 'dust'
  | 'sparkle'
  | 'arrow'
  | 'arrow-up'
  | 'arrow-loop'
  | 'circle'
  | 'squiggle'
  | 'underline'
  | 'chip'

export type ChipPose = 'wave' | 'point' | 'carry' | 'magnify' | 'celebrate' | 'sleep' | 'work' | 'head'

/** Idle loops of recompute-motion.js (data-anim). */
export type ChipAnim = 'wave' | 'blink' | 'antenna' | 'bob' | 'point' | 'magnify' | 'work' | 'hop' | 'zzz' | 'fans' | 'links'

interface ArtProps {
  name: ArtName
  /** Chip only. */
  pose?: ChipPose
  /** Bins: which outcome the bin is for. */
  tone?: 'redeploy' | 'upgrade' | 'recycle' | 'keep'
  /** Rack: gpu, storage or switch. Box: open. */
  variant?: 'gpu' | 'storage' | 'switch' | 'open'
  /** QR: a different pattern per seed. */
  seed?: number
  anim?: ChipAnim[]
  /** The pupils follow the cursor. */
  eyes?: boolean
  /** Slow idle float, in px. */
  float?: number
  /** Parallax factor on scroll. */
  parallax?: number
  /** Wiggles when its card (data-wiggle-host) is hovered. */
  wiggle?: boolean
  className?: string
  style?: CSSProperties
  /** Extra data-* attributes for the scenes, without the "data-" prefix: { 'hero-part': 1, bin: 'upgrade' }. */
  data?: Record<string, string | number | undefined>
}

/**
 * One illustration. This renders only an empty element with data attributes: recompute-art.js fills it with the SVG
 * and recompute-motion.js animates it (both start from main.tsx, so in tests the element stays empty). Decorative,
 * so it is hidden from assistive technology; put the meaning in the text around it.
 */
export function Art({ name, pose, tone, variant, seed, anim, eyes, float, parallax, wiggle, className, style, data }: ArtProps) {
  const extra = Object.fromEntries(Object.entries(data ?? {}).map(([key, value]) => [`data-${key}`, value]))
  return (
    <div
      aria-hidden="true"
      data-art={name}
      data-pose={pose}
      data-tone={tone}
      data-variant={variant}
      data-seed={seed}
      data-anim={anim?.join(' ')}
      data-eyes={eyes ? '1' : undefined}
      data-float={float}
      data-parallax={parallax}
      data-wiggle={wiggle ? '1' : undefined}
      className={className}
      style={style}
      {...extra}
    />
  )
}

type ChipProps = Omit<ArtProps, 'name' | 'variant' | 'tone' | 'seed'>

/** Chip, the robot mascot: a laptop-headed helper with a pose per job. */
export function Chip({ pose = 'wave', ...rest }: ChipProps) {
  return <Art name="chip" pose={pose} {...rest} />
}

/** Width / height of Chip's viewBox per pose, for aspect-ratio. */
export const CHIP_RATIO: Record<ChipPose, string> = {
  wave: '204 / 214',
  point: '204 / 214',
  carry: '204 / 214',
  magnify: '204 / 214',
  celebrate: '204 / 214',
  sleep: '204 / 214',
  work: '280 / 214',
  head: '124 / 126',
}
