import { afterEach, describe, expect, it, vi } from 'vitest'
import { allowMotion } from '../test/motion'
import { markIntroSeen, shouldPlayIntro } from './intro'

describe('home intro: when it plays', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('plays on the first home visit of a browser session, then not again', () => {
    allowMotion()

    expect(shouldPlayIntro()).toBe(true)
    markIntroSeen()
    expect(shouldPlayIntro()).toBe(false)
  })

  it('never plays for a visitor who asked for less motion', () => {
    expect(shouldPlayIntro()).toBe(false)
  })

  it('stays off when the browser blocks storage, since it could not remember being seen', () => {
    allowMotion()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    expect(shouldPlayIntro()).toBe(false)
  })
})
