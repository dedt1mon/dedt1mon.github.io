> Historical decision, superseded by owner iteration 5: the website now uses
> only its original dark theme. Light palette, switch, bootstrap and preference
> storage are removed. The record below is retained as history, not current policy.

# Dark / Light — presentation decision and acceptance

Owner scope: original design and motion, two coherent themes, no copyright line
or manual animation button. This is a website-only change; source isolation is
recorded in project-contract.md.

## Decisions

- A tiny first-party theme.js runs before the stylesheet to apply an existing
  choice before rendering. Only dark/light values are accepted. No HTML, URLs or
  scripts are derived from localStorage; no preference is sent over the network.
- The sole stored value is dedtimon-theme. Without an explicit valid choice,
  prefers-color-scheme supplies the theme and live system changes are followed.
  Denied/full storage retains a usable per-page choice. Other-tab changes sync.
- A single 44px icon button in the existing header exposes a constant accessible
  name and aria-pressed state. No-JS users see no inoperative switch and receive
  a CSS-only system palette. Media artwork is never inverted or recolored.
- Light uses mist-white surfaces, deep teal/navy text and accents, controlled
  borders and shadows, and separately legible image-overlay controls. Geometry,
  original effects, optimized media and the dark palette stay intact.
- There is no manual pause/resume state to leave motion accidentally disabled.
  Browser reduced-motion automatically suppresses CSS motion, finalizes finite
  reveals, prevents autoplay/particles and retains visible panels/focus paths.
  Original timing/trajectory, hover/focus/offscreen pauses remain otherwise.
- Preview allowlist adds only theme.js; filesystem/network permissions and private
  path restrictions remain unchanged. No dependencies or CI policy are added.

## Acceptance mapping

| ID | Required evidence |
| --- | --- |
| T01 | Copyright/motion button absent on all pages; no replacement decoration |
| T02 | Original normal motion, automatic reduced motion and visible interaction states |
| T03 | Dark/Light toggle, reload persistence, system following, invalid/blocked storage |
| T04 | Distinct light surfaces, contrast, keyboard/focus and same design geometry |
| T05 | All 76 projects/211 media, SEO, semantic/no-JS paths and removed contacts preserved |
| T06 | Both themes × 320/375/430/768/1024/1440/1920; gallery/video/menu/overflow/console |
| T07 | Source and helpers stay in this website; Astra contains only service records |
| T08 | Existing PR #1 updated, no merge/public deployment |

Actual results and scoped reuse are recorded in validation.md and PR #1.
