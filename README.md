<div align="center">

# Solgun Kitabe

**Çöken Varân İmparatorluğu'nun Yasak Arşivi**
*An interactive digital codex — handwritten in vanilla web, no framework, no build step.*

[![HTML5](https://img.shields.io/badge/HTML5-semantic-E34F26?logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-3D%20transforms-1572B6?logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2017+-F7DF1E?logo=javascript&logoColor=black)](#)
[![No Build Step](https://img.shields.io/badge/build-none-success)](#)
[![Dependencies](https://img.shields.io/badge/dependencies-0-green)](#)
[![A11y](https://img.shields.io/badge/a11y-reduced--motion%20%7C%20ARIA-blueviolet)](#)
[![Status](https://img.shields.io/badge/status-shipped-black)](#)

</div>

---

## Overview

**Solgun Kitabe** ("The Pale Inscription") is a single-page reader that renders a fictional Ottoman‑gothic codex as a paginated, page‑turning book in the browser. The work is a craft piece: the entire experience — a 57‑entry illustrated arcanum spanning realms, bestiary, orders, relics, chronicles and fragments — is delivered as a static site with **no dependencies, no bundler, and no runtime framework**.

The interesting engineering is hidden under the calligraphy. A custom layout engine measures content against a hidden DOM probe and paginates each entry on the fly; a 3D CSS page‑flip is progressively enhanced down to a cross‑fade on low‑power devices; state, themes, and bookmarks persist locally; the whole codex can be exported to a typographically‑correct PDF through the browser's own print pipeline — no `jsPDF`, no `html2canvas`, no server.

> This repository is part of my engineering portfolio. It is a deliberate counter‑weight to my cloud and SaaS work — proof that a polished, accessible, performant product can ship from four files and a few thousand lines of disciplined hand‑written code.

## Highlights

- **Zero‑dependency runtime.** Four script files, three stylesheets, one HTML entry point. Total LOC ≈ 5,000 across content, engine, and styles.
- **Custom pagination engine.** Exponential search + binary narrowing against a hidden measure element produces orphan‑free spreads at any viewport / type‑scale combination.
- **Real book physics.** 3D `rotateY` page‑turn with curl shadow on capable devices; equivalent fade transition on `lite` mode and under `prefers-reduced-motion`.
- **Three atmospheric themes** (`hisâr` · `külgün` · `karaöz`) driven entirely by CSS custom properties — no rerender, no flash.
- **Five typography scales** that rebuild pagination around the current chapter so the reader never loses their place.
- **Adaptive performance mode.** Auto‑detected from `hardwareConcurrency`, `deviceMemory`, pointer type, and motion preference — applied before first paint to avoid jank.
- **Browser‑native PDF export.** A separate print DOM is materialised with `@page` rules, drop‑caps, and `page-break-*` controls; the user gets a print dialog that resolves to a publication‑ready file.
- **Stateful reading.** Last folio, bookmarks (*kan‑iz*), theme, and type‑scale persist under a namespaced `localStorage` key (`solgun-kitabe:v1:*`).
- **Accessibility first.** ARIA dialogs for drawers, full keyboard map, focus management, swipe support, and a strict `prefers-reduced-motion` path.

## Architecture

```
                       ┌──────────────────────────────┐
                       │         index.html           │
                       │  semantic shell + chrome UI  │
                       └──────────────┬───────────────┘
                                      │
        ┌─────────────────────────────┼───────────────────────────────┐
        ▼                             ▼                               ▼
 ┌──────────────┐            ┌────────────────┐            ┌──────────────────┐
 │  content/*   │            │   scripts/*    │            │     styles/*     │
 │  (data tier) │            │ (engine + app) │            │  (theme tokens)  │
 ├──────────────┤            ├────────────────┤            ├──────────────────┤
 │ codex-data   │  KODEKS.*  │ storage.js     │  data-*    │ themes.css       │
 │ realms       │ ─────────▶ │ book.js        │ ─────────▶ │ main.css         │
 │ bestiary     │            │ pdf-export.js  │            │ animations.css   │
 │ orders       │            │ app.js         │            │                  │
 │ relics       │            └────────┬───────┘            └──────────────────┘
 │ chronicles   │                     │
 │ fragments    │                     ▼
 │ finalize     │            ┌────────────────┐
 └──────────────┘            │  BookEngine    │
                             │  pagination    │
                             │  spread render │
                             │  3D turn anim  │
                             └────────────────┘
```

Three loosely‑coupled tiers communicate through a single global namespace (`window.KODEKS`):

1. **Content tier.** Each category lives in its own script and pushes plain‑object entries (`id`, `title`, `category`, `themes`, `content[]`) onto `KODEKS.entries`. `finalize.js` runs a stable sort by category order so file load order is irrelevant.
2. **Engine tier.** `BookEngine` (in `book.js`) builds the page list from content, measures and paginates each entry against a hidden probe element, pairs pages into spreads, and renders the active spread into a two‑page DOM with `requestAnimationFrame`‑driven turn animations.
3. **Application tier.** `app.js` wires DOM events, keyboard, touch, theme/type/perf controls, drawers (TOC + bookmarks), and orchestrates engine rebuilds on resize and on type‑scale change while preserving the current chapter.

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Markup | HTML5 | Single semantic shell; everything else is mounted at runtime |
| Styling | CSS3 + custom properties | Token‑driven theming, `prefers-reduced-motion`, `contain`, `aspect-ratio` |
| Motion | CSS 3D transforms | `transform-style: preserve-3d`, perspective stage, hardware‑accelerated turn |
| Logic | Vanilla ES2017+ | Classes, async/await, `IntersectionObserver`‑free; uses `requestIdleCallback` where available |
| Typography | Google Fonts | Cinzel, Cormorant Garamond, EB Garamond, UnifrakturMaguntia (CDN, preconnected) |
| Persistence | `localStorage` | Namespaced, JSON‑safe wrapper in `storage.js` |
| Export | Native `window.print()` | Print‑only DOM, `@page A4`, drop‑caps, dotted‑leader TOC |
| Tooling | None | No bundler, transpiler, or test runner — the source ships as‑is |

## Folder Structure

```
solgun-kitabe/
├── index.html                  # Semantic shell, chrome UI, script load order
├── assets/                     # Reserved for cover art / illustrations
├── styles/
│   ├── themes.css              # Design tokens + the three atmospheres
│   ├── main.css                # Layout, chrome, book stage, page typography
│   └── animations.css          # Turn, ambient drift, sigil pulse, reduced-motion
├── scripts/
│   ├── storage.js              # localStorage wrapper (KODEKS.Storage)
│   ├── book.js                 # BookEngine: pagination + spread rendering
│   ├── pdf-export.js           # Print-mount builder + @page CSS
│   └── app.js                  # Top-level controller, UI wiring, keyboard, swipe
├── content/
│   ├── codex-data.js           # Book meta + 6 category definitions
│   ├── realms.js               # 8 entries — Diyârlar
│   ├── bestiary.js             # 17 entries — Mahlûkât
│   ├── orders.js               # 8 entries — Tarîkât
│   ├── relics.js               # 12 entries — Emânetler
│   ├── chronicles.js           # 5 entries — Vakâyiname
│   ├── fragments.js            # 7 entries — Vesîkalar
│   └── finalize.js             # Stable category-order sort over all entries
└── README.md
```

## Local Development

There is no install step. Any static file server works.

```bash
# Option 1 — Python (preinstalled on most systems)
python3 -m http.server 8000

# Option 2 — Node
npx serve .

# Option 3 — VS Code Live Server, Caddy, nginx, GitHub Pages, S3 + CloudFront, etc.
```

Then open <http://localhost:8000>. Opening `index.html` directly via `file://` also works, but Chrome will skip the font preload step under that scheme — prefer a local server.

### Authoring new entries

Drop a new object into the relevant `content/*.js` file. The engine picks it up automatically — no rebuild, no manifest, no index file to update.

```js
window.KODEKS.entries.push({
  id: "kulkemik",
  title: "Külkemik",
  subtitle: "Vebâ-küllerinden sıkışıp dikilen iskelet",
  category: "mahluk",                   // must match a category id in codex-data.js
  themes: ["Kül", "Vebâ", "Hâtıra"],
  content: [
    "Plain string becomes a justified prose paragraph with a drop-cap on the first.",
    { style: "quote", text: "Italicised quote with a left border." },
    { style: "hr" }                     // section divider — ✠ ✠ ✠
  ]
});
```

## Keyboard, Touch & Themes

| Action | Key | Notes |
|---|---|---|
| Page forward | `→`  ·  `PageDown`  ·  `Space`  ·  swipe ← | |
| Page back | `←`  ·  `PageUp`  ·  swipe → | |
| Jump to start / end | `Home` / `End` | |
| Open Table of Contents | `F` | Filterable + searchable drawer |
| Toggle bookmark on current spread | `K` | Persisted in `localStorage` |
| Open bookmarks drawer | `İ` / `I` | |
| Cycle theme | `T` | `hisâr` → `külgün` → `karaöz` |
| Cycle type scale | `Y` | Five steps, engine rebuilds around current chapter |
| Toggle performance mode | `P` | `rich` (3D + ambient) ↔ `lite` (cross-fade) |
| Fullscreen | `E` | |
| Export to PDF | `D` | Builds print DOM, opens print dialog |
| Close drawer / exit fullscreen | `Escape` | |

## Accessibility & Performance

The codex is built to be readable on a budget laptop and pleasant on a workstation.

- **Pre‑paint perf detection.** A small inline script in `<head>` derives `lite` vs. `rich` from `hardwareConcurrency`, `deviceMemory`, coarse pointer and `prefers-reduced-motion`, then writes it onto the `<html>` element as a data attribute so animations can be gated in CSS without a reflow.
- **Reduced motion is a first‑class path.** Every infinite animation is opt‑in via `[data-perf="rich"]`, and the engine substitutes an instant render for the 3D turn when `prefers-reduced-motion: reduce` is set.
- **Hidden tab pause.** Ambient drift and sigil rotation are paused via `animation-play-state` when `document.hidden`.
- **ARIA where it matters.** Drawers are real `role="dialog"` modals; entries are buttons; the toast is `role="status" aria-live="polite"`; loader and decorative SVGs are `aria-hidden`.
- **Layout stability.** `contain: layout style` on chrome, fixed `aspect-ratio` on the book, `requestIdleCallback`‑debounced rebuilds on resize.
- **Type scale rebuilds preserve position.** Changing font size re‑paginates the entire codex, then snaps back to the spread containing the active chapter.

## PDF Export

`scripts/pdf-export.js` is intentionally library‑free. It materialises a `.print-mount` DOM containing a cover, a dotted‑leader table of contents, every chapter with its opening folio, and a colophon — all under a print‑scoped stylesheet:

- `@page { size: A4; margin: 22mm 18mm; }`
- All non‑print chrome is hidden via `visibility: hidden`.
- Drop‑cap on the first letter of each opening paragraph via `::first-letter`.
- `orphans: 3; widows: 3;` plus explicit `page-break-*` controls on chapter and TOC sections.
- Chapter HTML is emitted in three‑entry chunks inside `requestIdleCallback` so the main thread stays responsive during preparation.

The user gets a native print dialog; "Save as PDF" produces a print‑shop‑ready document without any external dependency.

## State & Storage

All persistence flows through a single namespaced wrapper:

```text
solgun-kitabe:v1:progress    →  last spread index
solgun-kitabe:v1:bookmarks   →  [{ spread, label, ts }]
solgun-kitabe:v1:theme       →  "hisar" | "kulgun" | "karaoz"
solgun-kitabe:v1:typeStep    →  0..4
solgun-kitabe:v1:perfMode    →  "rich" | "lite"
solgun-kitabe:v1:firstSeen   →  boolean
```

Every read/write is wrapped in try/catch — private‑mode browsers and quota errors degrade silently to in‑memory defaults.

## Deployment

The project is a pure static site, which means it ships anywhere that can serve files:

- **GitHub Pages** — push to `main`, enable Pages on the repository root.
- **Cloudflare Pages / Netlify / Vercel** — connect the repo, no build command, output directory `/`.
- **S3 + CloudFront** — `aws s3 sync . s3://<bucket> --exclude ".git/*"` then invalidate the distribution.
- **Any nginx / Caddy / Apache** — serve the directory; no rewrites required.

Cache rules can be aggressive: every asset is content‑addressable (no hashed bundles, but no app‑code churn either). For production, gzip/brotli the CSS and JS — they compress 4–5×.

## Security Considerations

- **No third‑party JavaScript at runtime.** Fonts are the only external request, served from `fonts.googleapis.com` via `preconnect`. Drop them into `/assets` to ship fully offline if needed.
- **No user input is executed.** The TOC search reads from a static index; entry content is always run through an `escapeHtml` pass before being inserted into the DOM.
- **No cookies, no telemetry, no analytics.** State is local‑only.
- **CSP‑friendly.** The project works under a strict `default-src 'self'; style-src 'self' fonts.googleapis.com; font-src fonts.gstatic.com` policy with a single inline script in `<head>` (the perf‑detector) that can be moved to an external file if hash‑based CSP is preferred.

## Roadmap

- [ ] Image plates for each chapter opening (illuminated illustrations into `/assets`).
- [ ] Service worker for full offline operation, including fonts.
- [ ] Audio reading mode using the Web Speech API.
- [ ] Optional EPUB export alongside PDF.
- [ ] Locale toggle (English mirror) once the source text is finalised.
- [ ] CI workflow for HTML / CSS / JS linting and Lighthouse budgets.

## Contributing

This is a personal portfolio project, but issues and suggestions are welcome. If you spot a typographical bug, an accessibility regression, or a layout artefact at an unusual viewport, please open an issue with the device, browser, and a screenshot. Pull requests that respect the no‑dependency, no‑build constraint will be reviewed.

## License

The source code in this repository is released for portfolio review and personal use. The fictional setting, prose, and accompanying artwork are © Emre Doğan and are **not** redistributable without permission. For commercial or derivative use, please get in touch.

---

<div align="center">

**Built and maintained by [Emre Doğan](https://github.com/emredogan-cloud)**
Cloud architecture · SaaS engineering · Mobile · AI‑powered systems

</div>
