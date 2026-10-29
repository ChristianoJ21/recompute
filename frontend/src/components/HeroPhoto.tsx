import type { Photo } from '../lib/photos'

interface HeroPhotoProps {
  photo: Photo
  /** Full Tailwind aspect class, e.g. 'aspect-[16/10]'. */
  ratio?: string
  /** A soft green wash, for photos with strong colour casts. */
  tint?: boolean
  className?: string
}

/** A stock photo in a band, captioned as illustrative with its credit (never the sample data centre). */
export function HeroPhoto({ photo, ratio = 'aspect-[4/3]', tint = false, className = '' }: HeroPhotoProps) {
  return (
    <figure className={`relative overflow-hidden rounded-[22px] border border-night-line shadow-panel ${className}`}>
      <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} decoding="async" className={`${ratio} block w-full object-cover`} />
      {tint && <span aria-hidden className="pointer-events-none absolute inset-0 bg-accent/25 mix-blend-color" />}
      <figcaption className="absolute top-3 right-3 rounded-full bg-surface/90 px-2.5 py-1 font-mono text-[11px] text-ink-2 backdrop-blur-sm">
        Illustrative photo:{' '}
        <a href={photo.source} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-2 hover:text-accent">
          {photo.credit} / Unsplash
        </a>
      </figcaption>
    </figure>
  )
}
