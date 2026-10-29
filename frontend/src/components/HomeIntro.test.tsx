import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeIntro, INTRO_MS } from './HomeIntro'

const stage = () => document.querySelector('[data-intro-stage]') as HTMLElement

describe('HomeIntro', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is decorative: only the Skip button is announced, and it shows no numbers or images', () => {
    render(<HomeIntro onDone={vi.fn()} />)

    expect(stage().getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('button', { name: 'Skip intro' })).toBeTruthy()
    expect(stage().textContent).toContain('ReCompute')
    expect(stage().textContent).not.toMatch(/\d/)
    expect(document.querySelector('img, video, image')).toBeNull()
  })

  it('Skip intro ends it at once, and only once', async () => {
    const onDone = vi.fn()
    render(<HomeIntro onDone={onDone} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Skip intro' }))

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['a key', () => fireEvent.keyDown(window, { key: 'Tab' })],
    ['a tap', () => fireEvent.pointerDown(window)],
    ['a scroll', () => fireEvent.wheel(window)],
  ])('%s ends it', (_, interact) => {
    const onDone = vi.fn()
    render(<HomeIntro onDone={onDone} />)

    interact()

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('ends by itself when the sequence is over', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<HomeIntro onDone={onDone} />)

    act(() => vi.advanceTimersByTime(INTRO_MS - 1))
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
