# Website refresh — contract v3

Owner goal: substantially improve the existing personal site, preserve its
purpose/content/history and free GitHub Pages hosting at `dedt1mon.github.io`.
Source repository: `dedt1mon/dedt1mon.github.io`, baseline remote `54bda2957d08d036293698651ded51199e650685`.
Five pre-existing local changes were preserved in a separate development commit
before implementation. The remote one-line portfolio correction was merged.

| Requirement | Acceptance / evidence |
| --- | --- |
| R01 Existing project | Existing repo/history; development branch and PR, no direct main push |
| R02 Content fidelity | 76 substantive projects, 211 real media entries, original assets retained; 3 empty placeholders removed |
| R03 Identity | Original logo, dark/cyan palette, readable typography; no stock imagery or invented personal facts |
| R04 Copy | Clear Russian text, descriptions and tools accessible in native disclosures without JavaScript, meaningful service descriptions |
| R05 Contacts | Removed obsolete social/marketplace contacts and icons; retained original YouTube, Telegram and WhatsApp destinations |
| R06 Responsive | 320/375/430/768/1024/1440/1920px, three pages, no horizontal overflow or clipped controls |
| R07 Accessibility | Semantic headings, visible keyboard focus, skip link, menu, dialog trap/return, Escape, 44px primary controls, reduced motion |
| R08 Progressive enhancement | Content/nav/direct original media readable without JS; search/gallery enhance static HTML |
| R09 SEO | Unique titles/descriptions, canonical, Person+WebSite JSON-LD, OG/cards, favicon, robots and sitemap; content pages indexable |
| R10 Performance | Responsive WebP previews, explicit image sizes, lazy below-fold images, deferred JS, no video autoplay; original cursor effect bounded, mouse-only and reduced-motion aware |
| R11 Real verification | Chromium responsive/interaction/media/accessibility evidence, actual video playback, no runtime errors, exact-head CI |
| R12 Independent acceptance | QA then Security then Verifier, current revision + shared compact evidence; findings fixed before acceptance |
| R13 Deployment boundary | Existing HTTPS Pages checked; new version deployment deferred until owner merge approval |
| R14 Indexing handoff | Exact Search Console URL-prefix verification/sitemap/URL Inspection instructions; no ranking guarantee |

## Team and Task Graph

1. Astra / Requirements + UX: audit and versioned contract (R01–R14).
2. Frontend Engineer: responsive CSS and progressive JavaScript (R03/R06–R08/R10).
3. Astra / Content + Integration: preserve portfolio, improve copy, images/SEO,
   repair media links, integrate tests and workflow (R02/R04/R05/R09–R11).
   Work on 2 and 3 is independent until HTML/JS/CSS contract integration.
4. Targeted static/browser acceptance → PR → exact-head Site quality CI.
5. Independent QA → Security → Verifier using source/diff/criteria/evidence,
   without developer reasoning as proof.
6. Deployment review and owner handoff. Owner-approved merge/publication is a
   separate action. No paid/cloud AI calls or credential scope changes.

Orchestration is performed through Work/Codex and versioned files/evidence.
This does not claim autonomous dispatch by the Astra service or reuse the
pilot-specific V1.0 control/recovery environment as a production runtime.

## Evidence policy

Re-run only affected checks when code/config/environment changes. Record source
hashes, actual Git revision, Node/OS/architecture and browser/tool versions.
Share summaries and artifact references; preserve failed attempts. Do not count
the live old site as a deployment of this candidate. Do not claim lab metrics
are measured field Core Web Vitals or that search engines must index/rank it.


## Owner visual correction — version 2

The owner rejected the first visual redesign. Original main
`54bda2957d08d036293698651ded51199e650685` is the visual source of truth;
`eb2ecb89d2d17e1b224675142d1a5a8d2f7f2f8b` remains the technical baseline.
R03 now requires recognizable original composition, SavaPro display typography,
bright cyan glow, centered greeting, five-image depth carousel, tilted homepage
service cards, glass portfolio cards, floating category control and icon contacts.
All other technical/content requirements remain. No revert, history rewrite,
new PR, merge or publication. See visual-restoration.md for evidence scope.


Owner amendment (original motion): use the effective pre-PR main design as the
visual contract, including its timings, easing and composition. Remove invented
presentation identified in visual-restoration.md. Continuous original motion
requires reduced-motion support and an accessible pause; these supersede the
previous bounded-animation and manual-only carousel assumptions. No-JS content
availability is mandatory; extra visible disclosures are not mandatory when the
working enhanced gallery already provides those paths.

## Owner amendment — Dark/Light and project isolation (iteration 4)

This latest owner instruction supersedes the preceding footer pause requirement.
Remove copyright text and the entire manual motion button/state. Preserve original
motion and automatic browser prefers-reduced-motion handling, hover/focus and
visibility behavior. Do not replace the removed elements with decorative UI.

Add a compact accessible Dark/Light control; dedicated light colors/surfaces and
contrast retain the same composition. Persist only the enum preference locally;
use the system theme when no valid explicit choice exists. Storage denial must
not break navigation or theme switching. No new runtime dependency.

PROJECT_SOURCE_PATH: C:\Users\Ded_Timon\Desktop\5 VS Code\Мой сайт
PROJECT_REPOSITORY: https://github.com/dedt1mon/dedt1mon.github.io
PROJECT_WORKTREE_ROOT: C:\Users\Ded_Timon\Desktop\5 VS Code\_Astra Worktrees\dedt1mon.github.io

All source, helpers, website configuration, docs and build/test source stay in this
project. Astra stores only administrative records and validation evidence; Astra
Core and its Git history are not changed. No new worktree is needed for this task.
For future projects, resolve the source/repository/worktree paths before work;
Astra Platform is never the implicit project source directory.

Acceptance: both themes at all seven R06 widths; local persistence, system changes,
no-JS fallback, blocked storage, keyboard/focus, gallery/video, reduced-motion,
console/overflow and original content/SEO preservation. See theme.md. Same PR #1;
no merge or publication without owner approval.


## Owner amendment — narrow final corrections (iteration 5)

This amendment supersedes iteration 4 only where it requires a Light theme.
The visible privacy link and dialog title are exactly «Политика конфиденциальности»;
do not rename them without an owner request. Its short factual text remains,
with the obsolete theme-storage sentence removed.

Dark is the only palette. Remove the toggle, theme bootstrap, localStorage
preference, system color-scheme following, light CSS and unused theme tokens.
Preserve the existing dark colors, focus visibility, original effects and
prefers-reduced-motion. No replacement controls or redesign.

Restore the original main 54bda295 category anchor: right/bottom 30px above 768px,
20px at 481–768px, 15px at 320–480px. Button 60px desktop / 50px mobile; panel shares
its right edge with a 10px gap and widths 280/250/220px. Keep working navigation,
search, keyboard support, safe viewport bounds and existing dark contrast.

Affected acceptance: privacy title/link, no theme code/storage/system switching,
category alignment/interaction at 320/375/430/768/1024/1440/1920, console, focus,
reduced motion and responsive layout. Reuse unchanged source-bound media/SEO/
security evidence; update existing PR #1 only. No merge or publication.


## Owner amendment — privacy, project copy and centered close (iteration 6)

Only these three areas change. The privacy title remains exactly «Политика
конфиденциальности». Its six sections describe actual site behavior: no own
personal-data collection/forms/accounts, local search, no storage/analytics,
same-origin media/fonts, GitHub Pages security IP logging, external links and
the existing Telegram contact. No invented legal identity, jurisdiction,
retention deadline, compliance guarantee or third-party integration.

All 76 descriptions are individually grounded in prior copy and visible media;
no invented clients/results/tools/dates/awards. Preserve all 211 media and every
non-description manifest field. The short description is visible immediately
below the title in the existing viewer and also in native no-JS details.

Close preserves the original 400ms easing/scale vocabulary, but exits around
the panel center without a vertical offset. Keep body scroll lock, background
inertness and modal focus until the panel/backdrop fade completes; then clean
media and return focus. Repeated close is idempotent; interrupted close/reopen
must not double-lock or clear the new project. Reduced motion remains immediate.

Affected evidence only: factual policy, 76 descriptions and media invariants,
viewer close frame sampling at all seven R06 widths, image/video/long/scrolled
content, real keyboard/focus, rapid reopen, reduced motion, console and overflow.
Reuse unchanged original motion/navigation/SEO/assets and delivery policy.
Existing PR #1 only; no merge or publication.


## Owner amendment — portfolio catalog cleanup (iteration 7)

Owner clarified the chronology requirement: keep the existing category sections
and anchor navigation; sort only within each section, newest to oldest. Do not
introduce a global mixed feed or convert anchors into filters. Search must keep
the relative date order of matching projects. Equal dates retain prior order;
missing dates would follow dated entries without invention. All 76 current dates
exist, parse as real DD.MM.YYYY dates and agree with their ISO time metadata.

Remove software lists, tags, labels and the corresponding display/search logic,
including display-only tech data. Preserve original versions in Git history.
The two Geometry Nodes title/prose references are part of the tool disclosure:
work-49 becomes «Процедурный город» and retains the rest of its description.
No replacement badges or other copy/design changes.

Remove the dedicated AI section and its anchor. Move work-74 into motion-title;
work-75 and work-76 into logos-title. Rename work-76 exactly to
«СкрруджМакДак AI иллюстрация», including title, description opening, alt/aria,
native view and manifest metadata. Keep all media paths and IDs intact.

Acceptance: six sections, all 76 works and 211 media; 18 logos, 12 motion,
8 characters, 3 presentations, 3 websites, 32 scenes. Software absent from
published UI/native view/viewer/search. Correct transfer, exact naming and stable
descending per-section chronology through search, category navigation and modal
open/close on mobile/desktop. Privacy, centered close, other motion, styles and
SEO reuse their unchanged source-bound evidence. Existing PR #1 only; no merge
or publication.
