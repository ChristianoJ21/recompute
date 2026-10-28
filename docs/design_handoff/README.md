# Handoff: ReCompute frontend redesign

## Overview
Redesign of the ReCompute web app (GYEBC 2026 student demo): device passports, a decision rule (KEEP / UPGRADE / REDEPLOY / RECYCLE / UNCERTAIN / INSUFFICIENT DATA / NOT EVALUATED) and a public listing of released hardware. Same features as the current app. New: technical "engineering drawing" look, light + dark theme, a ☰ menu, a `/settings` page, and motion. `original_brief.md` is the source brief; **all its hard rules (§6) still apply**.

## About the design files
The `.dc.html` files are **design references built in HTML**, not production code. Recreate them in the existing stack: **React 19 + Vite + TypeScript + Tailwind CSS v4**. Keep the existing routes, data fetching and accessible names. Open `ReCompute Redesign.dc.html` in a browser (serve the folder over a local static server; files load siblings) to see every screen at 390 px and 1280 px, the tokens, the component sheet and notes.

## Fidelity
**High-fidelity.** Colours, type, spacing, borders, shadows and motion are final. Match them exactly using Tailwind tokens (below).

## Global layout
- Content max-width **1160px**, centred. Side padding `clamp(16px, 4cqi, 40px)` (≈16px at 390, 40px at 1280). Use `@container` on the page root or equivalent breakpoints.
- Page background: `--page` + blueprint grid: `linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)`, `background-size: 24px 24px`.
- Panels: `bg-surface`, `1px solid --line`, **radius 0**, `box-shadow: var(--shadow)`.
- Controls radius **2px**. Tap targets **≥44px** high.
- Section header pattern: mono index (`01`, 12px, accent, 600) + title (20px/700, -0.01em) with `border-bottom: 1px solid --ink`, padding-bottom 10px.
- Mono label pattern: mono 11–12px, 600, uppercase, letter-spacing .08em, `--ink-2`.
- Corner marks on key figures (passport identity card, Why panel, FIG. 1): four 12×12px L-shapes, 2px `--accent` borders at each corner, offset −1px.

## Header (every page) — `RC Header.dc.html`
1. **Utility bar** (min-height 44px, bg `--bar`, text `--bar-fg2`, mono 12px): left **SAMPLE DATA** chip (bg `#F2D27A`, text `#2E2100`, 11px/800, letter-spacing .1em, 4px 8px, radius 2, with a 10px hatched square icon). Right: visitor → link "Technician login →" (white, 600); technician → green 6px square + "Technician One (sample)" / "Log out" (underlined).
2. **Main bar** (min-height 60px, bg surface, bottom border line): logo (34×14 SVG: two outlined squares + one filled accent square joined by lines; wordmark "ReCompute" 18px/700, -0.02em). Inline nav (only when header width ≥720px): *Available hardware*, *Market*, *Fleet* (tech only); 14px/600, min-height 52px, active = ink + `inset 0 -2px 0 --accent`, inactive = ink-2.
3. **☰ Menu button** at far right (44×44, 1px `--line-strong`, bg surface, three 18×2px ink bars, gap 4px). Open state: bg ink, white ✕. `aria-label="Menu"`, `aria-expanded`, Escape closes.
4. **Menu panel** (absolute, below the bar, right-aligned to the content edge, width `min(340px, 100% − 32px)`, bg surface, `1px solid --ink`, `box-shadow: 4px 4px 0 --ink`):
   - `PAGES` label; rows (min-height 48px, 15px/600) with the route in mono 12px at the right; active row = raised bg + `inset 3px 0 0 --accent`. Visitor: Available hardware, Market. Technician adds Fleet, Add technician.
   - `ACCOUNT` label. Technician: profile row (40×40 accent square with mono "T1", name 15/700, `t.one · Technician` mono 12) then *Settings* ("Profile, password, appearance") and *Log out*. Visitor: *Technician login* ("Staff only. There is no sign-up.") and *Settings* ("Appearance").
   - Footer strip (raised bg, mono 12): "Appearance" … current theme.

Footer (`RC Footer.dc.html`): surface bg, top border; "Every number in this demo is sample data (toy values). Nothing here is a measurement." + mono "ReCompute · student demo · GYEBC 2026".

## Screens
All copy is in the HTML files; use it verbatim.

### `/` Available hardware — `Screen Home.dc.html`
- Hero: mono eyebrow "/ Available hardware" (accent); H1 "Second-life AI servers, each with a passport you can check." (`clamp(32px, 4.4cqi, 54px)`, 700, -0.03em, line-height 1.05, max 20ch); intro paragraph (16–18px, ink-2, max 62ch).
- `01 How ReCompute works` → **FIG. 1 schematic** (`RC Schematic.dc.html`): title strip "FIG. 1 · PASSPORT → DECISION → SECOND LIFE" + pulsing "LIVE · SAMPLE DATA". Three columns (≥860px) or stacked (<860px), gap 72/56px, joined by animated dashed accent connectors with arrowheads labelled "events" and "outcome". Each step: numbered circle (28px, 1.5px accent), mono label, a 120px dashed "inset figure", title 17/700, body 15px ink-2.
  - Fig 1: hash chain of 44×44 blocks (`#n` + 4-char hash); a new block slides in every 2.4s; the newest block is accent-filled.
  - Fig 2: device ID + outcome badge + range bar with zero line; cycles KEEP (−620…−180) → REDEPLOY (+120…+410) → UNCERTAIN (−500…+150), bar animates `left/width` 0.9s `cubic-bezier(.2,.7,.2,1)`.
  - Fig 3: 88px QR label with an accent scan line sweeping (2.4s ease-in-out loop) + `/device/GPU-SRV-001` + Passport intact badge.
  - Title block row: DRAWING RC-001 · REVISION 3 · SCALE Not to scale · VALUES All sample data.
  - Must keep the accessible name `How ReCompute works` on the list.
- `02 Listed hardware` (count at right, mono). Grid `repeat(auto-fit, minmax(min(100%, 440px), 1fr))`, gap 16. **Listing card**: header strip (raised bg) with mono ID 13/700 + small outcome badge; model 19/700; price block — label "Sample asking price" (mono label) and price 30px/700 tabular-nums, integrity badge beside it; key/value table (mono 12 keys: type, installed, components, reliability ✔ Check passed, data wipe, telemetry `util 55 % · power 583 W · inlet 23.1 °C` + read time); note; two buttons: primary "Open the passport →", secondary "Ask about this device" (envelope icon, `mailto:`). Hover: card `translateY(-3px)` + deeper shadow, 200ms.
- `03 Contact the data centre`: panel with intro + dl (organisation, e-mail link, hours, note).
- States (see component sheet): loading skeleton, empty "No hardware is listed right now", error notice with *Try again*.

### `/device/:id` Passport — `Screen Passport.dc.html` (`tech` toggles technician view)
Order (mobile = top to bottom):
1. Mono breadcrumb (`← Available hardware / device / GPU-SRV-001`; technician: `← Fleet`).
2. Row (wraps): **Identity card** (flex 2 1 520px, corner marks): mono label "Device passport", ID mono `clamp(28px, 3.2cqi, 38px)`/700, model · location, lg outcome badge + lg integrity badge, a dashed-top "MRZ" strip (mono 11px, letter-spacing .12em, ink-3, e.g. `GPU-SRV-001<<GPU_SERVER<<INSTALLED<2022-03-01<<14<EVENTS<<HEAD<7c1e…a90b`). **For sale** box if listed (flex 1 1 300px, `1px solid ink`, `4px 4px 0 ink` shadow, ink header strip "FOR SALE" + listed date): price 32px, note, contact line, secondary "Ask about this device".
3. **Why this recommendation** (corner marks). Technician: "last run …" + primary **Evaluate** (play icon). Badge + reason (17–19px/500). **Net-saving bar**: 96px tall; hatched negative zone and plain positive zone (12px tall, bordered); accent range bar 20px tall with accent glow; 2px ink zero line labelled "0"; dashed extension lines at both ends and a dimension line with arrowheads and centred label "−500 … +150 kg CO₂e"; captions "← Keeping pays back" / "Replacing pays back →". Domain = [min(lo,0), max(hi,0)] padded 18% each side. Two scenario cells (Pro-keep end / Pro-replace end: badge + "net ±N kg CO₂e" + description). `target` row. (INSUFFICIENT DATA: add a "Missing inputs" list in the same dl style.)
4. Technician only, 2-column grid (`minmax(min(100%, 420px), 1fr)`): **Log an action** — 3×2 segmented radio grid (Scan, Repair, Upgrade, Wipe, Move, Note; selected = ink bg/white), Details textarea (optional), primary *Add to passport*. **Sale listing** — amber notice "Listing needs a Data wipe event in the passport first. Log a Wipe on the left." while disabled; price (mono) + currency select (IDR) + note; *List for sale* (disabled: sunken bg, ink-3 text). When listed, show *Unlist*.
5. **Passport history** (list name `Passport events`): header with "N events · newest first" and integrity badge. Timeline: 20px rail (1px line + 10×10 square node; node style per kind below), content: label 15/700, mono time, who, note, mono details chip, mono `#n · hash xxxx…xxxx` + "✔ links to #n−1" (ok colour). Footer: secondary "Show all N events".
6. **Technical details** (collapsible; button with "+"/"−"; `aria-expanded`): rule inputs table (mono values), device record (`pre` block, ink bg), QR label image placeholder 160×160.

Event node styles (fill / border / label colour): Telemetry reading surface / line-strong / ink-2 (muted) · Scan, Repair, Upgrade, Move ink / ink / ink · Data wipe ok / ok / ink · Note surface / ink / ink · Listed for sale accent / accent / ink · Removed from sale surface / accent / ink.

### `/fleet` — `Screen Fleet.dc.html`
Eyebrow "/ Fleet", H1 "Fleet dashboard" (28–40px), "Hall A · 6 devices", secondary "+ Add technician". **Fleet stats**: 5 tiles in a 1px-gap grid (`minmax(min(100%,160px),1fr)`): mono label, value 30px/700 tabular, sub line. Passports intact shows ✔ + ok colour. Passports changed > 0 → danger-bg tile, `inset 3px 0 0 danger`, ✘ icon, danger text. `01 Devices per outcome`: six cells (small badge, mono count 22px, meaning). `02 Devices`: rows (min-height 56px, wrap): mono ID (120px), model + location, small badge, accent "→"; whole row links to the passport.

### `/login` — `Screen Login.dc.html`
Max-width 440 centred. "/ Login", H1 "Technician login" 30px, line "Reading passports needs no login. There is no sign-up: an admin or a colleague creates your account." Form panel: Username (mono input), Password, full-width primary *Log in* (48px). Error: danger notice "**Wrong username or password.** Check both and try again." + danger input borders. Link "← Back to available hardware".

### `/technicians/new` — `Screen Add Technician.dc.html`
Max-width 520. "← Fleet", H1 "Add a technician", fields Username (mono), Full name, Password (hint "At least 10 characters."), primary *Add technician*. Success note (ok-bg): "**Technician added.** t.two can log in now." Field error style in the component sheet.

### `/market` — `Screen Market.dc.html` (`chart` toggles)
Header + intro. **Empty**: dashed panel, faint dashed-line icon, "Waiting for verified figures", "…No placeholder numbers are shown." **Chart**: panel per series with title + mono unit, Chart/Table segmented toggle (`aria-pressed`), legend (filled dot = published actual; hollow dot + dashed line = forecast), 240px plot (ink left/bottom axis, 25% grid lines), accent line 2px (dashed 5/4 for forecast), dots 11px (2px accent border; filled vs surface), tooltip (ink bg, mono 12: value, year, "Source: …, p. n"), year labels row, sources line. Table view: Year / Value / Type / Source. **Never ship invented numbers**; mockup uses "[value]", "20X1" labels only.

### `/settings` (NEW) — `Screen Settings.dc.html`
Eyebrow "/ Settings", H1 "Settings", intro. Left section nav (chips "01 Profile", "02 Credentials", "03 Appearance"; sticky on desktop, wraps on phones). Panels:
- **Profile** (technician): 56px accent "T1" square, name, `t.one · added by an admin`; Full name input; read-only Username (mono, sunken, "Only an admin can change it.") and Role; primary *Save profile*.
- **Credentials** (technician): "Password last changed …", Current password, New password ("At least 10 characters."), Confirm new password; primary *Change password*.
- **Appearance** (everyone): radiogroup of 3 cards (Light / Dark / Match device) each with an 80px mini preview, a radio dot and a one-line description; selected = accent border + 1px accent ring. Note "Saved on this device. Applies to every page, including passports opened from a QR label."
- Visitors see only Appearance.

### Also
Not-found page (component sheet): mono "404", "No page or device at this address", "If you scanned a QR label, check the device ID printed under the code.", "← Available hardware". Session-ended banner: ink bar "Your login has ended. Log in again" (amber link) + *Dismiss*.

## Components
- **Outcome badge** (`RC Badge.dc.html`): mono, 700, letter-spacing .04em, radius 2, 7px square marker in fg colour. Sizes sm 11px/4px 7px, md 12px/6px 9px, lg 13px/8px 11px. INSUFFICIENT DATA and NOT EVALUATED use dashed borders (NOT EVALUATED transparent bg). Text always shown.
- **Integrity badge** (`RC Integrity.dc.html`): mono 12/13px, 600, radius 2, 14px icon. States: Checking… (spinner), Passport intact (ok ✔), Passport changed at event #N (danger ✘), Integrity check unavailable (dashed square).
- **Buttons**: primary = ink bg, surface text, 1px ink, min-height 44, padding 0 18px, 14px/600. Hover: `translate(-2px,-2px)` + `3px 3px 0 --accent`, 150ms; active resets. Secondary = surface bg, 1px line-strong; hover border ink + raised bg. Disabled = sunken bg, ink-3 text, line border. Focus everywhere: `outline: 3px solid --accent; outline-offset: 2px`.
- **Inputs**: min-height 44, 0 12px, 1px line-strong, radius 2, 16px. Error: danger border + "✘ message" 13px danger.
- **Notices**: error (danger-bg / danger-line / danger-ink), success (ok-bg / ok-line / ok-ink), warning (note-bg / note-line / note-ink). 16px square icon left.

## Interactions & motion
- Hover lifts as above (cards 200ms, buttons 150ms).
- Net-saving bar: on mount, bar starts at width 0 on the zero line, then animates `left/width` over 1s `cubic-bezier(.2,.7,.2,1)` (350ms delay). Dimension lines and label fade in (400ms, ~0.8s delay).
- Passport verification on load: integrity badge shows **Checking…**; events tick to verified oldest → newest every 260ms (node gets `0 0 0 4px --ok-bg` halo; "✔ links to #n−1" fades/slides in 300ms); then the badge switches to **Passport intact**. In production, drive this from the real chain check (one step per verified event, or one quick sweep after the API answers). Never fake success; on failure show "Passport changed at event #N".
- FIG. 1: 2.4s tick; connectors' dashes scroll (0.8s linear loop); LIVE square pulses (1.6s).
- **`prefers-reduced-motion: reduce`** → disable all animation/transition; show final states immediately.
- Menu: toggle on ☰, close on Escape (also on route change / outside click in production).
- Theme: `localStorage["rc-theme"] = light | dark | system`; apply `data-theme` on `<html>` before first paint (inline script) to avoid a flash; `system` follows `prefers-color-scheme`.

## State
- `theme` (persisted, global). `menuOpen` (header). Passport: `selectedAction`, `details`, `verifyStep`, `barReady`, `techDetailsOpen`, `showAllEvents`. Sale listing: `price`, `currency`, `note`, disabled until the passport has a `wipe` event. Market: per-chart `view: 'chart' | 'table'`.
- Data from existing endpoints (`GET /listings`, device, events, fleet stats). No new data required except profile fields and change-password for `/settings`.

## Design tokens
Every colour is a light/dark pair (source of truth: `rc-theme.js`; HTML uses `var(--rc-<name>)`, Tailwind names below drop the prefix).

| token | light | dark |
|---|---|---|
| ink | #0E1116 | #E8EAED |
| ink-2 | #4A4F57 | #A9AEB6 |
| ink-3 | #6A6F77 | #8A9099 |
| line-strong | #A9A9A0 | #4A5059 |
| line-mid | #C8C8C0 | #3A3F47 |
| line | #D6D6CF | #2C3038 |
| sunken | #EBEBE6 | #1F232A |
| page | #F4F4F1 | #0B0D10 |
| raised | #FAFAF8 | #1A1D23 |
| surface | #FFFFFF | #14171C |
| grid | #E6E6DF | #151920 |
| accent | #2443C9 | #8EA2FF |
| accent-hover | #16298A | #B5C2FF |
| ok / ok-bg / ok-line / ok-ink | #1D6B3B / #E4F2E8 / #A9D3B7 / #14492A | #6FD08F / #10291A / #2B5A3C / #A6E3BA |
| upgrade / -bg / -line | #0B5F86 / #E2F0F8 / #A6CFE6 | #79C4EC / #0D2533 / #24506A |
| redeploy / -bg / -line | #5B3597 / #EEE8F8 / #CBBBEA | #C2A6F2 / #221A33 / #4A3A70 |
| recycle / -bg / -line | #3F4855 / #E8EBEF / #BCC3CD | #B8C1CD / #1E2329 / #434B57 |
| uncertain / -bg / -line | #8A4600 / #FCE9D6 / #EBBE8E | #F3B072 / #2E1D0C / #6A4520 |
| insufficient / -bg / -line | #4A4A4A / #EEEEEE / #A0A0A0 | #C2C2C2 / #222222 / #5A5A5A |
| not-evaluated | #5A5F67 | #A9AEB6 |
| danger / -bg / -line / -ink | #B3261E / #FBE9E7 / #EBA8A1 / #7A1A14 | #FF8A80 / #3A1412 / #7A2E28 / #FFB4AB |
| note-bg / -line / -ink / -icon | #FBF6E6 / #E3CC85 / #3D2C00 / #5E4300 | #2A2210 / #5E4A12 / #F2D27A / #F2D27A |
| bar / bar-line / bar-fg / bar-fg2 / bar-fg3 | #0E1116 / #0E1116 / #FFFFFF / #C9CCD1 / #8C929B | #000000 / #2C3038 / #FFFFFF / #C9CCD1 / #8C929B |
| sample chip (both themes) | bg #F2D27A, text #2E2100 | same |

KEEP uses the ok trio. Sample chip and SAMPLE DATA are theme-independent.

- **Shadow** light `0 1px 2px rgba(14,17,22,.06), 0 10px 28px -14px rgba(14,17,22,.22)`; dark `0 0 0 1px rgba(255,255,255,.02), 0 14px 32px -12px rgba(0,0,0,.75)`. Offset shadow `4px 4px 0 var(--ink)` (For sale, menu). Hover offset `3px 3px 0 var(--accent)`.
- **Radius**: 0 panels · 2px controls/badges · full only for chart dots and radio.
- **Spacing**: 4, 8, 12, 16, 24, 32, 48, 64.
- **Type** (system fonts only; offline): sans `system-ui, -apple-system, "Segoe UI", sans-serif`; mono `ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace`. Display clamp(32–54)/700/-0.03em/1.05 · H1 28–40/700/-0.03em · H2 18–20/700/-0.01em · body 16/1.5 · small 13–14 · ID mono 28–38/700/-0.02em · label mono 11–12/600/.08em uppercase.

Tailwind v4 sketch:
```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
@theme {
  --font-sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace;
  --color-ink: #0E1116; /* …all light values from the table… */
  --radius-ctl: 2px;
  --shadow-panel: 0 1px 2px rgba(14,17,22,.06), 0 10px 28px -14px rgba(14,17,22,.22);
}
[data-theme="dark"] { --color-ink: #E8EAED; /* …all dark values… */ color-scheme: dark; }
:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
```

## Accessible names to keep (tests)
Lists: *Listed hardware*, *How ReCompute works*, *Passport events*, *Fleet stats*, *Devices per outcome*, *Devices*. Sections: *For sale*, *Sale listing*, *Contact the data centre*, *Technical details*. Buttons: *Evaluate*, *Add to passport*, *List for sale*, *Unlist*, *Log in*, *Log out*, *Add technician*, *Ask about this device*, *Try again*; link *Technician login*. New: button *Menu*.
Changed visible text (decide/update tests): Home H1 is now the sentence above ("Available hardware" is the eyebrow); history heading reads "Passport history" while the list keeps the name "Passport events"; times shown in **WIB** (API UTC +7, "28 Oct 2026, 20:39 WIB").

## Assets
No images or web fonts. All icons are inline SVG (check, cross, spinner, envelope, play, hatched sample square, logo). QR label is a placeholder; render the real QR (e.g. existing generator) pointing to `/device/:id`.

## Files
- `ReCompute Redesign.dc.html` — overview canvas: dark-mode section, direction, tokens, component sheet, all screens at 390/1280, notes.
- `Screen *.dc.html` — one per route (props: Passport `tech`, Market `chart`, Login `error`, Add Technician `success`, Settings `tech`; all accept `theme`).
- `RC Header / RC Footer / RC Badge / RC Integrity / RC Schematic .dc.html` — shared components.
- `rc-theme.js` — token table + theme get/set/apply.
- `support.js` — runtime needed only to open the HTML references.
- `original_brief.md` — the brief (hard rules §6).
