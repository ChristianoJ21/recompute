import { describe, expect, it } from 'vitest'
import { buildDevice, emptyDeviceForm, type DeviceForm } from './deviceForm'

const filled = (changes: Partial<DeviceForm> = {}): DeviceForm => ({
  ...emptyDeviceForm(),
  id: 'WS-009',
  model: 'DeskNode-T (sample)',
  deviceType: 'workstation',
  installDate: '2023-05-02',
  location: 'Lab C / design team',
  ...changes,
})

describe('buildDevice (Add device form → POST /devices body)', () => {
  it('builds a SAMPLE DATA device; blank rule inputs are sent as missing, a single value as a point range', () => {
    const form = filled({
      components: [
        { type: 'cpu', model: 'Core-v2' },
        { type: 'ssd', model: '' },
      ],
      inputs: { ...emptyDeviceForm().inputs, I_old: { low: '5', high: '6' }, T: { low: '4', high: '' } },
    })

    expect(buildDevice(form)).toEqual({
      problems: {},
      device: {
        id: 'WS-009',
        model: 'DeskNode-T (sample)',
        device_type: 'workstation',
        install_date: '2023-05-02',
        location: 'Lab C / design team',
        components: [{ type: 'cpu', model: 'Core-v2' }],
        reliability_ok: true,
        inputs: { I_old: { low: 5, high: 6 }, I_new: null, W: null, T: { low: 4, high: 4 }, E_new: null },
        upgrade_options: [],
        sample_data: true,
      },
    })
  })

  it('names every problem and builds nothing', () => {
    const form = filled({
      id: 'has space',
      model: ' ',
      installDate: '',
      inputs: { ...emptyDeviceForm().inputs, W: { low: '9', high: '3' }, E_new: { low: '', high: '700' }, I_new: { low: '-1', high: '' } },
    })

    const { device, problems } = buildDevice(form)

    expect(device).toBeNull()
    expect(problems).toEqual({
      id: 'Use 1–64 letters, digits, dot, dash or underscore.',
      model: 'Enter the model.',
      installDate: 'Enter the install date.',
      W: 'Low must not be above high.',
      E_new: 'Enter the low value (or leave both empty).',
      I_new: 'Use numbers of 0 or more.',
    })
  })
})
