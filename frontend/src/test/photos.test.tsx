/// <reference types="node" />
import { existsSync, statSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BandPhoto, CardPhoto } from '../components/HeroPhoto'
import { PHOTOS, photoFor } from '../lib/photos'

// A10 phase 2 (Panji, 30 Oct): real photos, each download approved by Panji (name, source, size), self-hosted.
describe('stock photos', () => {
  it('self-hosts every photo, with alt text and an Unsplash credit', () => {
    for (const [key, photo] of Object.entries(PHOTOS)) {
      expect(photo.src, key).toMatch(/^\/images\/[\w-]+\.jpg$/)
      expect(existsSync(`public${photo.src}`), key).toBe(true)
      expect(statSync(`public${photo.src}`).size, key).toBeLessThan(450_000)
      expect(photo.alt.length, key).toBeGreaterThan(10)
      expect(photo.source, key).toMatch(/^https:\/\/unsplash\.com\/photos\/[\w-]+$/)
      expect(photo.credit.trim(), key).not.toBe('')
    }
  })

  it('captions a photo as illustrative, crediting the photographer and Unsplash', () => {
    render(<CardPhoto photo={PHOTOS.market} />)

    expect(screen.getByRole('img', { name: `Illustrative photo: ${PHOTOS.market.alt}` }).getAttribute('src')).toBe(PHOTOS.market.src)
    expect(screen.getByText(/illustrative photo/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tyler Daviaux / Unsplash' }).getAttribute('href')).toBe(PHOTOS.market.source)
  })

  it('blurs a band photo behind the band colour and the grid, as decoration with a visible credit', () => {
    const { container } = render(<BandPhoto photo={PHOTOS.home} />)

    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe(PHOTOS.home.src)
    expect(img?.getAttribute('alt')).toBe('')
    expect(img?.className).toMatch(/blur-/)
    expect(screen.getByRole('link', { name: 'imgix / Unsplash' }).getAttribute('href')).toBe(PHOTOS.home.source)
  })

  it('gives each listed device type a matching photo (racks for servers), any other type the rack photo', () => {
    expect(photoFor('gpu_server')).toBe(PHOTOS.hardware)
    expect(photoFor('storage_server')).toBe(PHOTOS.home)
    expect(photoFor('network_switch')).toBe(PHOTOS.switch)
    expect(photoFor('workstation')).toBe(PHOTOS.workstation)
    expect(photoFor('robot_arm')).toBe(PHOTOS.hardware)
  })

  it('puts a photo on the home, hardware, market and technician login pages', () => {
    const pages = import.meta.glob('../pages/*Page.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(pages['../pages/HomePage.tsx']).toContain('photo={PHOTOS.home}')
    expect(pages['../pages/HardwarePage.tsx']).toContain('photo={PHOTOS.hardware}')
    expect(pages['../pages/MarketPage.tsx']).toContain('photo={PHOTOS.market}')
    expect(pages['../pages/LoginPage.tsx']).toContain('photo={PHOTOS.login}')
  })
})
