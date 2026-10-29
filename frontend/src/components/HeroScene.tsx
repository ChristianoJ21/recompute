import { Art, Chip } from '../design/Art'

const sticker =
  'absolute z-[4] -translate-x-1/2 rounded-lg border-[1.5px] border-cta-ink bg-[#FFFCF5] px-[9px] py-1.5 text-[clamp(9px,1.2vw,12px)] leading-none font-extrabold tracking-[.12em] text-cta-ink'

const BINS = ['redeploy', 'upgrade', 'recycle'] as const
const BIN_LEFT = [2, 35, 68]

/**
 * The hero illustration: a retired GPU server comes apart and its parts drop into three bins (the GPU to Redeploy, RAM and SSD
 * to Upgrade, the battery to Recycle) while Chip waves. recompute-motion.js plays it (data-scene="hero"); without it, or for a
 * visitor who asked for less motion, everything simply sits in its final place.
 */
export function HeroScene({ wide }: { wide: boolean }) {
  return (
    <div data-scene="hero" data-hero-start="load" className="relative aspect-[560/500] w-full max-w-[600px] justify-self-center">
      <div
        role="img"
        aria-label="A retired GPU server comes apart; its GPU goes to the Redeploy bin, RAM and SSD to Upgrade, the battery to Recycle. Chip the robot waves."
        className="absolute inset-0"
      >
        <div
          data-parallax="0.03"
          className="absolute bg-sunken"
          style={{ left: '-2%', right: '-2%', top: '46%', bottom: '1%', borderRadius: '52% 46% 44% 52% / 58% 54% 44% 40%' }}
        />
        <div
          data-hero-device="1"
          data-float="6"
          data-parallax="-0.04"
          className="absolute z-[2]"
          style={{ left: '4%', top: '8%', width: '60%', aspectRatio: '290 / 114' }}
        >
          <Art name="rack" variant="gpu" anim={['fans']} style={{ width: '100%', height: '100%' }} />
        </div>
        <Chip
          pose="wave"
          anim={['wave', 'blink', 'antenna']}
          eyes
          className="absolute z-[3]"
          style={{ left: '70%', top: 0, width: '27%', aspectRatio: '204 / 214' }}
        />
        <span className="rc-hand absolute -rotate-[5deg] text-[clamp(17px,2vw,22px)] leading-none whitespace-nowrap" style={{ left: '68%', top: '33%' }}>
          hi, I'm Chip!
        </span>
        <span
          className="rc-hand absolute flex -rotate-3 items-start gap-1 text-[clamp(17px,2vw,22px)] leading-none"
          style={{ left: '6%', top: '37%' }}
        >
          <Art name="arrow-up" style={{ width: 22, height: 32, marginTop: -14 }} />
          one server, three futures
        </span>

        {BINS.map((tone, i) => (
          <Art
            key={`back-${tone}`}
            name="bin-back"
            tone={tone}
            data={{ 'hero-bin': tone }}
            className="absolute z-[1]"
            style={{ left: `${BIN_LEFT[i]}%`, top: '60%', width: '30%', aspectRatio: '170 / 160' }}
          />
        ))}

        <Art
          name="gpu"
          data={{ 'hero-part': 1, bin: 'redeploy', ex: -0.28, ey: -0.1, rot: -16 }}
          className="absolute z-[2]"
          style={{ left: '4%', top: '61%', width: '25%', aspectRatio: '230 / 96' }}
        />
        <Art
          name="ram"
          data={{ 'hero-part': 1, bin: 'upgrade', ex: 0.05, ey: -0.6, rot: 20 }}
          className="absolute z-[2]"
          style={{ left: '37%', top: '64%', width: '19%', aspectRatio: '210 / 72' }}
        />
        {wide && (
          <Art
            name="ssd"
            data={{ 'hero-part': 1, bin: 'upgrade', ex: 0.32, ey: -0.62, rot: -14 }}
            className="absolute z-[2]"
            style={{ left: '47%', top: '59%', width: '14%', aspectRatio: '180 / 125' }}
          />
        )}
        <Art
          name="battery"
          data={{ 'hero-part': 1, bin: 'recycle', ex: 0.62, ey: 0.25, rot: 18 }}
          className="absolute z-[2]"
          style={{ left: '72%', top: '61%', width: '21%', aspectRatio: '190 / 96' }}
        />

        {BINS.map((tone, i) => (
          <Art
            key={`front-${tone}`}
            name="bin-front"
            tone={tone}
            data={{ 'hero-bin': tone }}
            className="absolute z-[3]"
            style={{ left: `${BIN_LEFT[i]}%`, top: '60%', width: '30%', aspectRatio: '170 / 160' }}
          />
        ))}

        {[
          ['REDEPLOY', 17, -3],
          ['UPGRADE', 50, 2],
          ['RECYCLE', 83, -2],
        ].map(([label, left, tilt]) => (
          <span key={label} data-hero-label="1" className={sticker} style={{ left: `${left}%`, top: '80%', rotate: `${tilt}deg` }}>
            {label}
          </span>
        ))}
      </div>
      <button
        type="button"
        data-hero-replay="1"
        className="rc-hand absolute right-0 -bottom-[7%] z-[5] border-0 bg-transparent px-1 py-1.5 text-lg leading-none transition-[rotate,scale] duration-200 ease-spring hover:-rotate-[4deg] active:scale-90"
      >
        ↺ take it apart again
      </button>
    </div>
  )
}
