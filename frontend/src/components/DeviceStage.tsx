import type { ReactNode } from 'react'
import { Art } from '../design/Art'
import { pickDevicePicture } from '../design/devicePicture'

interface DeviceStageProps {
  deviceType: string
  components: readonly { type: string }[]
  /** Stage height in px; the chassis fills about 80% of it. */
  height?: number
  className?: string
  /** Laid over the stage (an outcome sticker in a corner). */
  children?: ReactNode
}

/**
 * The soft stage of a device card: the clay chassis for its type, with one of its parts leaning in the corner. The part
 * wiggles when the card (a data-wiggle-host ancestor) is hovered. Decorative: the spec table carries the meaning.
 */
export function DeviceStage({ deviceType, components, height = 150, className = '', children }: DeviceStageProps) {
  const picture = pickDevicePicture(deviceType, components)
  const rack = picture.art === 'rack'
  const small = picture.part === 'ram' || picture.part === 'cables'
  return (
    <div
      data-device-art={picture.art}
      className={`relative flex items-center justify-center rounded-[18px] bg-sunken ${className}`}
      style={{ height }}
    >
      <Art name={picture.art} variant={picture.variant} anim={['fans']} style={{ width: rack ? '86%' : '44%', height: height * 0.79 }} />
      <Art
        name={picture.part}
        wiggle
        className="absolute right-2.5 bottom-2"
        style={{ width: small ? 96 : 84, height: height * 0.31 }}
      />
      {children}
    </div>
  )
}
