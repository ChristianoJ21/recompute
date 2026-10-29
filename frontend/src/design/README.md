# Clay design layer

The illustration set, motion engine and paper texture from the Claude Design redesign ("ReCompute homepage design", 30 Oct 2026).
Imported once from `src/main.tsx` (`import './design'`), never from `App`: the engine needs a real layout engine, so tests render
without it and the art elements stay empty there.

| File | What it is |
|---|---|
| `recompute-art.js` | The clay SVG library (`window.RCArt`). An element `<div data-art="NAME" data-pose\|data-variant\|data-tone\|data-seed>` is filled with the SVG. |
| `recompute-motion.js` | The motion engine (`window.RCMotion`). Transform and opacity only, spring easing, pauses off-screen, honours reduced motion. |
| `Art.tsx` | React wrapper: `<Art name="rack" variant="gpu" anim={['fans']} />` and `<Chip pose="wave" />`. Renders only the data attributes. |
| `devicePicture.ts` | Which chassis and part a device gets from its `device_type` and first component. |
| `grain.png` | The paper grain, tiled on `body` in the light theme (see `index.css`). |

**Assets** (`ArtName` in `Art.tsx`): laptop, workstation, monitor, phone, keyboard, rack (`gpu`, `storage`, `switch`), ram, ssd, cpu,
battery, motherboard, fan, cables, gpu, bin-back and bin-front (`tone`), van, conveyor, box (`open`), shield, bench, magnifier,
passport, qr, chain, dust, sparkle, arrows, circle, squiggle, underline, and **Chip** with the poses wave, point, carry, magnify,
celebrate, sleep, work and head.

**Motion attributes**: `data-reveal` (fade and rise in when visible), `data-stagger` (children reveal 80 ms apart), `data-float`,
`data-count`, `data-parallax`, `data-draw` (draws the `.rc-draw` paths and fades the `.rc-fill` ones; `data-bar` grows a bar),
`data-eyes` (pupils follow the cursor), `data-wiggle` inside a `data-wiggle-host`, `data-anim="wave blink antenna bob point magnify work
hop zzz fans links"` (idle loops) and `data-scene="hero|journey"` (the exploded-view hero and the pinned "how it works" conveyor).

## Changes to the Claude Design originals

Three small patches in `recompute-motion.js`, so a React app can leave pages without leaking (the original assumed one static page):
the hero and journey scenes return their `root`, and `prune()` (called from the scan loop) cancels the loops and drops the scenes of
elements React has removed. Re-apply them if the file is replaced by a newer export.

## Decisions that differ from the design file

- Text green is `#35704B`, not `#3E7A55` (4.3:1 on the soft panels, below the 4.5:1 the palette test requires); `#3E7A55` stays for fills.
- The design only defines Redeploy, Upgrade and Keep. Recycle (cardboard), Uncertain (gold) and Insufficient data (grey-green) follow the bin colours of the art. All six are checked in `src/test/palette.test.ts`.
- Fonts are bundled with `@fontsource` (Baloo 2, Figtree, Gochi Hand; Latin only) instead of Google Fonts, so the exhibition build still works offline.
- The home page's released-device cards open each device's passport (the design toasted "next in the redesign").

## From the design handoff, not built yet

- Passport page: editing the rule inputs and recomputing live (the inputs are shown read-only).
- A motion setting (System, Full, Reduced, Off) in Settings; the engine currently follows the device's reduced-motion setting.
- Chip celebrating holding a box on a successful login or sign-up (those redirect at once). He celebrates after Add technician and Add to passport.
