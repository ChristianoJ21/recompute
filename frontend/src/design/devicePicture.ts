import type { ArtName } from './Art'

/** Which clay illustrations stand for a device: the chassis, and one of its parts beside it. */
export interface DevicePicture {
  art: ArtName
  variant?: 'gpu' | 'storage' | 'switch'
  part: ArtName
}

/** Component type (as the passport lists it) to the part drawing. Any drive is drawn as one SSD. */
const PART_ART: Record<string, ArtName> = {
  gpu: 'gpu',
  memory: 'ram',
  cpu: 'cpu',
  storage: 'ssd',
  ssd: 'ssd',
  hdd: 'ssd',
  nic: 'cables',
  psu: 'battery',
}

/** Picks the chassis by `device_type` and the part drawing by the first component the passport lists. */
export function pickDevicePicture(deviceType: string, components: readonly { type: string }[]): DevicePicture {
  const type = deviceType.toLowerCase()
  const first = components[0]?.type.toLowerCase()
  const part = (first && PART_ART[first]) || 'motherboard'
  if (type === 'workstation') return { art: 'workstation', part }
  if (type === 'storage_server') return { art: 'rack', variant: 'storage', part }
  if (type === 'network_switch') return { art: 'rack', variant: 'switch', part }
  return { art: 'rack', variant: 'gpu', part }
}
