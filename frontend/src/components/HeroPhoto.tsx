import type { Photo } from '../lib/photos'

function Credit({ photo, linked = true }: { photo: Photo; linked?: boolean }) {
  const name = `${photo.credit} / Unsplash`
  return linked ? (
    <a href={photo.source} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-accent">
      {name}
    </a>
  ) : (
    <span>{name}</span>
  )
}

/** A stock photo as the blurred background of a band, under the band colour and the grid, credited in a corner. */
export function BandPhoto({ photo, linked = true }: { photo: Photo; linked?: boolean }) {
  return (
    <>
      <img
        src={photo.src}
        alt=""
        width={photo.width}
        height={photo.height}
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-[8px]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-night/75" />
      <p className="absolute right-4 bottom-3 z-10 font-mono text-[11px] text-night-fg3">
        Background photo: <Credit photo={photo} linked={linked} />
      </p>
    </>
  )
}

/** A photo of the device's type on a listing card: green duotone (no neon), captioned as illustrative, never the device itself. */
export function CardPhoto({ photo }: { photo: Photo }) {
  return (
    <figure className="relative h-[clamp(140px,14vw,190px)] overflow-hidden border-b border-line">
      <img
        src={photo.src}
        alt={`Illustrative photo: ${photo.alt}`}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover grayscale"
      />
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-accent/35 mix-blend-color" />
      <figcaption className="absolute top-3 right-3 rounded-full bg-surface/90 px-2.5 py-1 font-mono text-[11px] text-ink-2">
        Illustrative photo: <Credit photo={photo} />
      </figcaption>
    </figure>
  )
}
