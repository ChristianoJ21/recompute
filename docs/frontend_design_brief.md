# ReCompute: frontend design brief

> For: a design assistant (e.g. Claude Design) redesigning the ReCompute web app.
> From: Panji (team lead, backend). The app already works; this brief asks for a **better-looking, clearer design of the same app**, not new features.
> Every number shown in the app is **SAMPLE DATA** (toy values), never a real measurement.

---

## 1. What ReCompute is (read this first)

ReCompute is a student demo for the GYEBC 2026 competition (theme: AI hardware and e-waste). It shows how a data centre can keep AI servers in use longer instead of scrapping them early:

1. **Every device has a digital passport**: a history of what happened to it (scans, repairs, upgrades, data wipes, moves, telemetry readings). The history is append-only and hash-chained, so **any later change is detected** (shown as "Passport intact ✔" or "Passport changed at event #N ✘").
2. **A decision rule recommends the device's next life**: KEEP, UPGRADE (one component), REDEPLOY (to a lighter workload), RECYCLE, or says UNCERTAIN / INSUFFICIENT DATA when it cannot decide honestly. It compares the emissions saved by a newer device with the emissions of manufacturing it.
3. **Released hardware is shown on a public page** with its passport, so a buyer can trust what they get. Buyers contact the data centre by e-mail; **there is no shop, no checkout, no buyer account**.

Where it is seen: judges at an exhibition (14 Nov 2026) on a laptop, and on their **phones by scanning a QR label** stuck on a device. The phone view matters as much as the desktop view.

## 2. What to improve

The current design is clean but plain (white cards, green accent, Tailwind defaults). Please make it:

- **Understandable in 10 seconds** for a judge who has never heard of ReCompute (the story: passport → decision → second life).
- **Trustworthy and calm**: an infrastructure tool with a sustainability purpose. Avoid eco clichés (leaves, globes, recycling-bin icons everywhere).
- **Phone-first**: 390 px wide is the main case for the passport page (QR scans); desktop for the dashboard.
- **Easy to scan**: the most important fact on each page is visible without scrolling (outcome, intact badge, price).
- Consistent: one design system (colour tokens, type scale, spacing, components) used on every page.

## 3. Users and what they need

| User | Device | Needs |
|---|---|---|
| Judge / visitor | phone (QR) or laptop | Grasp the idea fast; see one passport; see why a recommendation was made |
| Buyer | phone or laptop | See released hardware, its price, its passport and wipe record; know whom to e-mail |
| Technician (logged in) | phone at the rack, laptop at the desk | Log an action on a device in a few taps; run the decision rule; list or unlist a device for sale; see fleet stats; add a colleague's login |

There are two areas: **public** (no login) and **technician** (username + password; no public sign-up).

## 4. Pages

Header on every page: logo "ReCompute", **SAMPLE DATA** label (always visible), navigation: *Available hardware*, *Market*, *Fleet* (technicians only), and *Technician login* or *[name] · Log out*. Footer: "Every number in this demo is sample data… Nothing here is a measurement."

### 4.1 `/` Available hardware (public home)
- Title + one-paragraph intro, then **"How ReCompute works"** in three steps (passport / decision rule / released hardware).
- **Listing cards**, one per device for sale. Each shows: model, device ID, outcome badge, **price** ("IDR 45,000,000", labelled *sample asking price*), passport-intact badge, type, install date, components, reliability check (passed/failed), data-wipe date, latest telemetry (2–4 readings + time), note, **"Open the passport →"** and **"Ask about this device"** (opens the visitor's e-mail app; no form).
- **Contact box** for the (fictional) data centre: organisation, e-mail, hours, note.
- States: loading, empty ("No hardware is listed right now"), error with *Try again*.

### 4.2 `/device/:id` Passport page (public read; QR codes open this page)
Order of sections, top to bottom:
1. Device ID (monospace), outcome badge, model + location.
2. Visitors: **For sale** box (price, note, "ask through the contact box") if listed.
3. **Why this recommendation**: outcome, one-sentence reason, a **net-saving bar** (a range from min to max kg CO₂e with zero marked), the two scenario cards *Pro-keep end* / *Pro-replace end*, target (component or workload), missing inputs list for INSUFFICIENT DATA. Technicians get an **Evaluate** button here.
4. Technicians only: **Log an action** (choose Scan / Repair / Upgrade / Wipe / Move / Note, optional details, *Add to passport*) and **Sale listing** (asking price + currency + note → *List for sale*; when listed → *Unlist*; disabled with a hint until a *Data wipe* event exists).
5. **Passport history**: newest first, 5 shown + *Show all N events*; each event: plain label (Data wipe, Telemetry reading, Listed for sale…), date/time, who, note, details, short hash. Integrity badge in the section header.
6. **Technical details** (collapsed): rule inputs (ranges), device record, QR label image.

### 4.3 `/market` Market context (public)
Charts of published market figures (each point shows source + page; forecasts drawn hollow/dashed; one chart per unit). **Right now there is no data**, so the page shows an empty state: "Waiting for verified figures… No placeholder numbers are shown." Design both the empty state and a chart state, but **do not put invented numbers in the final screens** (use obviously fake labels like "Series A, 20XX" in the chart mockup).

### 4.4 `/login` Technician login
Username, password, *Log in*. Short line: reading passports needs no login; there is no sign-up (an admin or colleague creates accounts). Error message for a wrong login.

### 4.5 `/fleet` Fleet dashboard (technicians)
- Title + *+ Add technician* link.
- **Stat tiles**: Devices, Not evaluated, Listed for sale, Passports intact ("6 of 6"), Passports changed (red + ✘ when > 0).
- **Count per outcome**: six tiles with badge + one-line meaning.
- **Device list**: ID, location, model, outcome badge → links to the passport.

### 4.6 `/technicians/new` Add a technician (technicians)
Username, full name, password (min. 10 characters), *Add technician*, success / error message.

### 4.7 Also
Not-found page; a banner when a login ends by itself ("Your login has ended… Log in again", *Dismiss*).

## 5. Components to design

| Component | States / notes |
|---|---|
| **Outcome badge** | KEEP · UPGRADE · REDEPLOY · RECYCLE · UNCERTAIN · INSUFFICIENT DATA · NOT EVALUATED. Each has a one-line meaning (below). Must be readable without colour (text always shown). |
| **Integrity badge** | Checking… · Passport intact ✔ · Passport changed at event #N ✘ · Integrity check unavailable |
| **SAMPLE DATA label** | always in the header; amber/neutral, not alarming |
| **Price** | "IDR 45,000,000" + "Sample asking price" (currency code, never a symbol) |
| **Net-saving bar** | horizontal range bar with zero line; positive = replacing pays back |
| **Event item** | 9 kinds: Telemetry reading (muted), Scan, Repair, Upgrade, Data wipe, Move, Note, Listed for sale, Removed from sale |
| **Stat tile**, **card/section**, **buttons** (primary, secondary), **form fields**, **error notice**, **success note**, **empty state**, **loading** |
| **Chart** | single-series line; actual = filled dots, forecast = hollow dots + dashed line; tooltip with value, year, source + page; table view |

Outcome meanings (keep this wording or improve it without changing the sense):
- KEEP: Replacing would not pay back its manufacturing emissions
- UPGRADE: Replace one component instead of the whole device
- REDEPLOY: Move it to a lighter workload
- RECYCLE: Formal recycling, with its passport
- UNCERTAIN: The answer changes within the input ranges; a human decides
- INSUFFICIENT DATA: Inputs are missing, and the engine never guesses them
- NOT EVALUATED: The decision rule has not run on this device yet

Current colours (free to change): accent green (emerald-700 #047857); KEEP green, UPGRADE sky blue, REDEPLOY violet, RECYCLE slate, UNCERTAIN amber, INSUFFICIENT DATA grey; red only for "passport changed" and errors.

## 6. Hard rules (do not break)

1. **SAMPLE DATA** label visible on every page; prices always called *sample asking price*.
2. **No buy button, cart, checkout, payment, order or buyer account.** Buyers only e-mail the data centre.
3. **No form that collects visitor data.** The contact details are fictional (`hardware@example.com`, "Sample Data Centre (fictional)"); never show a real person or company.
4. Integrity wording: "**detects changes**" / "Passport intact" / "changed at event #N". Never "cannot be changed", "tamper-proof" or "blockchain".
5. Status is never colour alone: always icon + words (✔ / ✘, badge text).
6. Market charts: published figures only, each point with source + page; forecasts labelled; never mixed with the demo's sample numbers; one unit per chart; **no invented numbers**.
7. Keep the routes (`/`, `/device/:id`, `/market`, `/login`, `/fleet`, `/technicians/new`); printed QR codes point to `/device/:id`.
8. WCAG AA contrast, visible keyboard focus, tap targets ≥ 44 px on phones, no horizontal scrolling at 390 px.
9. Must work **offline** at the exhibition: no web fonts or images loaded from the internet at runtime (use system fonts or fonts bundled with the app).

## 7. Technical handoff (so the design can be built quickly)

- Stack: **React 19 + Vite + TypeScript + Tailwind CSS v4**. Please express the design as **design tokens** (colours, type scale, radius, shadow, spacing) plus Tailwind-friendly component specs, or as HTML/Tailwind mockups.
- Light theme is required; a dark theme is optional (if you design one, give full token values for it too).
- The developer keeps these **accessible names** (automated tests use them), so please keep the same visible text or tell us the new text: lists *Listed hardware*, *How ReCompute works*, *Passport events*, *Fleet stats*, *Devices per outcome*, *Devices*; sections *For sale*, *Sale listing*, *Contact the data centre*, *Technical details*; buttons *Evaluate*, *Add to passport*, *List for sale*, *Unlist*, *Log in*, *Log out*, *Add technician*, *Ask about this device*, *Try again*; link *Technician login*.
- No new heavy UI libraries unless they solve a real problem; icons as inline SVG.

## 8. Sample content for mockups (all sample data)

Listing (from `GET /listings`):
```json
{
  "device_id": "GPU-SRV-001",
  "model": "AccelServer-v1 (sample)",
  "device_type": "gpu_server",
  "install_date": "2022-03-01",
  "components": [{"type": "gpu", "model": "Accel-v1"}, {"type": "memory", "model": "HBM-v1"}],
  "reliability_ok": true,
  "latest_outcome": "REDEPLOY",
  "passport_intact": true,
  "wiped_at": "2026-10-28T13:39:23Z",
  "listed_at": "2026-10-28T13:39:23Z",
  "price": {"amount": 45000000, "currency": "IDR"},
  "note": "Released after REDEPLOY review (sample)",
  "latest_telemetry": {"kind": "telemetry", "created_at": "2026-10-28T13:40:02Z",
                       "payload": {"utilization_pct": 55, "power_w": 583, "inlet_temp_c": 23.1}},
  "sample_data": true
}
```
Second listing: GPU-SRV-003, outcome UPGRADE, IDR 38,000,000, note "Memory upgrade path documented in the passport (sample)".

Contact: Sample Data Centre (fictional) · hardware@example.com · Mon–Fri 09:00–17:00 WIB · "Demo only: no real sales. Prices are sample values."

Fleet: 6 devices, one per outcome (GPU-SRV-001 REDEPLOY, -002 KEEP, -003 UPGRADE, -004 RECYCLE (failed reliability check), -005 INSUFFICIENT DATA, -006 UNCERTAIN), all at "Hall A / …", technician "Technician One (sample)".

Why panel example (UNCERTAIN): reason "The recommendation changes within the input ranges, so a person should decide"; net saving from −500 to +150 kg CO₂e; pro-keep end → KEEP (net −500), pro-replace end → REDEPLOY (net +150).

## 9. What to deliver

1. A short design direction (mood, why it fits the story).
2. Design tokens (light theme; optional dark).
3. Screens at **390 px and 1280 px** for: Available hardware, Passport (visitor and technician), Fleet dashboard, Login, Market (empty and chart), Add technician.
4. Component sheet with all states from section 5 (including loading, empty and error).
5. Notes on anything in this brief you would change, with the reason; we decide.
