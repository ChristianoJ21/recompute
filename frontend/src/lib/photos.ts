/** A self-hosted stock photo (public/images, credits in public/images/CREDITS.md). */
export interface Photo {
  src: string
  alt: string
  /** Photographer, as named on Unsplash. */
  credit: string
  /** The photo's Unsplash page. */
  source: string
  width: number
  height: number
}

/** A10 phase 2 (Panji, 30 Oct): one real photo per main page, each download approved by Panji. Illustrative only. */
export const PHOTOS = {
  home: {
    src: '/images/home-server-room.jpg',
    alt: 'Server racks in a bright data-centre hall',
    credit: 'imgix',
    source: 'https://unsplash.com/photos/klWUhr-wPJ8',
    width: 1600,
    height: 954,
  },
  hardware: {
    src: '/images/hardware-server.jpg',
    alt: 'Open server rack with bundled network cables',
    credit: 'imgix',
    source: 'https://unsplash.com/photos/pgdaAwf6IJg',
    width: 1600,
    height: 1070,
  },
  market: {
    src: '/images/market-circuit-board.jpg',
    alt: 'Close-up of a green circuit board',
    credit: 'Tyler Daviaux',
    source: 'https://unsplash.com/photos/zS95n6sWuTA',
    width: 1600,
    height: 1141,
  },
  login: {
    src: '/images/login-cabling.jpg',
    alt: 'Server cabinets with network cabling and status lights',
    credit: 'Taylor Vick',
    source: 'https://unsplash.com/photos/M5tzZtFCOfs',
    width: 1600,
    height: 898,
  },
} satisfies Record<string, Photo>
