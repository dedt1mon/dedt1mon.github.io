# Validation — candidate pending final CI and independent gates

Evidence distinguishes source checks, real browser observations, GitHub CI and
existing Pages publication. No candidate deployment/merge is authorized.

Initial static contract run: **3536 PASS** (metadata, navigation, IDs, media,
case-sensitive asset paths, original content manifest, removed contacts).

Initial Chromium run: **33 PASS**, two issues retained in original evidence:
the reduced-motion rule applied a tiny transition to the skip link, and the
local preview server returned an empty body for unknown public paths instead
of the existing 404 page. Both received narrow fixes. Successful gallery/video,
search, privacy and no-JS checks are preserved; only affected cases are rerun.

Affected browser follow-up: **28 PASS**, **0 FAIL**. Combined with seven
unchanged successful scenarios, all **35 distinct browser cases PASS**.
Unchanged JavaScript/gallery evidence is reused instead of replayed locally.
Latest local homepage observation: **429076 transferred bytes**, **CLS 0**,
no autoplay. This is local lab evidence, not field Core Web Vitals or a public
network guarantee. Full logs and screenshots are artifacts, not model context.

Final exact-head CI and QA/Security/Verifier results are linked in the PR review
evidence. New public Pages deployment requires the owner's merge approval.

## Owner visual correction — original identity restored

The first redesign's visual acceptance was superseded by the owner's correction.
Its historical technical evidence above remains unchanged. Visual source:
original main 54bda2957d08d036293698651ded51199e650685; technical base: eb2ecb89.
See visual-restoration.md and contract v2 for the new visual acceptance criteria.

Restoration checks: 4024 static assertions PASS; 39 real Chromium cases PASS.
After final heading/spacing refinements, only 29 affected cases were rerun and
passed; ten unchanged gallery/video/search/privacy/media/performance/404/runtime
cases were retained with their original source hashes. Added cases cover depth
carousel keyboard controls, mobile controls, category-panel focus/Escape,
no-JS home links, eight original services and bounded/reduced motion.
Twenty preservation checks prove unchanged project contracts/metadata, original
media, safe gallery implementation, dependencies, preview server and workflow.

Original-main and corrected screenshots at 1440 and 375 are retained in the
local site-identity-02 comparison evidence. Original nested-scroll sections were
captured through native scrollIntoView, not by treating blank clipped full-page
capture regions as design. Current descriptions stay accessible without JS and all 76
projects / 211 media entries remain. No data from the earlier reports is
relabeled as a new execution or a new SHA.

Final exact-head CI and independent visual QA/Security/Verifier report hashes
are recorded in the same PR #1. New public deployment is still deferred until
owner approval. Performance samples are lab resource transfers, not total page
weight or field Core Web Vitals.


Independent visual QA found two composition mismatches: mobile title/date
alignment and an oversized gallery dialog. Both were corrected, together with
compact native description disclosures. The original findings are preserved.
Eleven affected portfolio/accessibility/no-JS cases passed, followed by four
gallery/video/geometry/runtime cases after the gallery correction. No unchanged
full local suite was repeated. Final suite contains 41 distinct browser cases;
the exact-head CI and final review bindings are recorded in PR #1.


## Owner original-motion correction — iteration 3

The owner rejected the prior visual result; previous automated visual PASS did
not mean owner approval. Reference remains original main 54bda295. An effective
cascade audit distinguishes actual original motion from unused/overridden rules.

Preserved evidence: the first motion group had five successful cases and one
harness timing failure; the next run reached a malformed synthetic Touch fixture.
A real Chromium touch dispatch replaced that fixture; both normal-motion cases
passed. Neither failure is reported as a product PASS. The affected responsive
run passed35/36; it found mispositioned carousel controls, fixed by placing them
inside their real wrapper and retesting that case. Independent visual inspection
also found a direct-child selector that matched zero nested fallback blocks.
The corrected test first requires76 blocks, then zero visible blocks with JS.
No-JS still opens76 descriptions/tool lists and211 media links.

After the composition/selectors correction,29 affected cases passed; final exact
service/grid easing received two focused motion/runtime PASS checks. Static
contracts passed3912 assertions. Sixteen preservation comparisons proved all
project metadata, SEO, source media, safe parsing/URL/modal/navigation functions,
server, dependencies and CI policy unchanged. Removed duplicate visual elements
reduce static assertion count; no checker assertion was deleted to hide a failure.

No unchanged full local suite was replayed. Final CI must run all43 cases for the
new exact SHA. Old source-bound reports stay immutable. Normal-motion desktop/
mobile recordings and original/current screenshot pairs, independent findings,
review hashes and CI are linked from PR #1 and site-identity-03 evidence.

Known boundary: original continuous animation is intentionally restored with
reduced-motion, hover/focus/visibility pauses and one functional footer pause.
Cursor particles are mouse-only and idle-free. New public deployment remains
unapproved; Chromium/emulated viewports do not establish Safari/Firefox or real
device results, and lab measurements are not field Core Web Vitals.


Final mobile identity delta initially passed16 behavioral checks, but independent
pixel/geometry comparison found inherited selector specificity and card-width
mismatches. The first positive width test exposed three home failures (nine other
cases passed). Exact original geometry was then measured once at all seven widths.
The final focused test proves14 home/services layouts: actual card widths, first
row counts, mobile alignment and no overflow. It PASSes. Home at375 is313px;
services303px. Home columns at768/1024/1440 are1/2/3; services2/2/3.

The final suite now contains44 browser cases. CI621f1cb was successful but predates
this independently found size correction; final acceptance requires the successor
CI recorded in PR #1. No local full suite was repeated. The last navigation delta
is only767→768 and is covered by the mobile checks and source review. Failed
harness setup/capture attempts and earlier valid scoped results remain preserved.

Independent Security found SEC-MOTION-01 on ed6c95d: pausing CSS entrance
animations could leave a newly opened category panel invisible but focusable.
The affected delta now disables motion into the final visible static state;
temporary page-visibility pause remains separate. The category heading highlight
also respects the user pause. Three affected browser cases PASS, including
paused panels/search/gallery/mobile navigation, autoplay/swipe and console errors.
The new case checks 375/1440 widths; the suite contains 45 browser cases.
The original Security finding stays immutable; its focused independent retest
and final source/CI binding are recorded in PR #1 and the evidence index.
Normal-motion visual captures are reused only for their unchanged behavior.

Final Verifier found the remaining original-motion mismatch in hidden carousel
cards: inherited far-position transforms changed their entry trajectory. The
original centered/unscaled hidden state, 6px blur and shadow are now restored;
visible current/side geometry and safe controls are unchanged. Three affected
cases PASS, including real intermediate trajectory at 375/1440, keyboard and
mobile controls. The suite contains 46 browser cases. CI4d5f8ea (3912 static +45
browser PASS) remains historical; the successor exact-head CI is recorded in
PR #1. Earlier motion recordings do not prove this final trajectory correction;
its own source-bound test does. No unchanged full local suite was repeated.

CI3b923ef passed3912 static assertions and44 browser cases, but two fixed-delay
motion observations sampled animations before the browser completed their last
rendered frame. The test harness now waits for the actual exact final properties
with a1500ms bound, while retaining/asserting original600ms transition duration,
finite28/60-second particle lifetime, intermediate movement and idle cleanup.
No application code changed. The first harness correction passed particle cleanup
but observed hidden opacity/blur too early; the second waits for all three hidden
properties and passed the trajectory case. Both attempts are preserved. Unchanged
particle evidence is reused; only the failed trajectory case was rerun locally.
The final successor CI and source-scope review binding are recorded in PR #1.

## Owner Dark/Light correction — iteration 4

Scope: removed the visible copyright line and all manual animation pause/resume
UI/state; original motion remains with automatic prefers-reduced-motion. Added
an accessible compact header theme control and dedicated light palette. The only
stored value is the allowlisted local theme preference; privacy copy explains it.

Project source boundary is explicitly recorded in project-contract.md/theme.md.
All website sources, helper scripts, configuration, documentation and captures
remain in this website workspace. Astra receives only service records/reports
and evidence hashes/references. No Astra Core changes or new worktrees were used.

Affected validation PASS:3951 static assertions and90 Chromium browser cases,
zero failures/console errors. Includes42 responsive combinations (both themes ×
seven widths × three pages), both-theme accessibility/keyboard/focus, gallery,
actual video playback/cleanup, menus, hover/motion, automatic reduced-motion,
system preference changes, explicit selection/reload/new-tab persistence,
invalid values, storage denial and CSS-only no-JS light/dark. Sixteen representative
375/1440 screenshots of home/services/portfolio/gallery were visually inspected.
No artwork is inverted/filtered by the light palette. No new dependencies.

Independent Security source delta PASS with no findings: enum-only storage,
no new network/tracking/credential use, no HTML/URL construction from preferences;
preview allowlist adds only theme.js, keeping method/path/realpath restrictions.
Prior media parsing and modal safety evidence stays source-bound and reusable.
Final exact-head CI and independent review bindings are recorded in existing
PR #1; earlier reports are not relabeled as new executions. No unchanged full
local suite was repeated. No merge/publication authorized.

Limits: Chromium/emulated viewports, not Safari/Firefox or physical devices.
When browser storage is denied, switching works for the current page but the
browser cannot retain the choice across reload; the system preference is used.

Final Verifier found VER-THEME-01: the inherited cyan focus ring had insufficient
contrast against Light surfaces despite being present. A dedicated focus token
now preserves the original Dark ring and supplies deep teal for both explicit
Light and CSS-only system Light. Two affected browser cases PASS: actual focused
controls/links on header/body/card surfaces across all three pages at375/1440,
both themes, with exact visible3px outline and measured contrast>=3:1.
Only CSS focus color and this positive test changed; all90 earlier cases/captures
retain their original source bindings. No new Security/QA review or full local
suite was repeated. Prior finding and b7b26f3 CI remain immutable; successor
exact-head CI and final Verifier closure are recorded in PR #1.


## Owner narrow final corrections — iteration 5

The exact footer link and dialog heading «Политика конфиденциальности» are
restored on all four pages. The existing factual privacy text remains; only the
obsolete sentence about saving a theme choice was removed.

The site is dark-only. Removed theme.js, its header control, Light selectors,
system color preference handling, preference storage and unused theme tokens.
The existing dark palette/focus colors, artwork, original animations and
prefers-reduced-motion remain. Prior iteration 4 describes historical behavior.

Category positioning was measured against original main
54bda2957d08d036293698651ded51199e650685. The button is 60px at desktop / 50px
at mobile, with right/bottom offsets 30px (>768), 20px (481–768), 15px (<=480).
The panel shares the same right edge, has a 10px anchor gap, and original widths
280/250/220px. The Arial 28/24px glyph and weight300 restore the original center;
current accessible dark contrast and working navigation/search are preserved.

Affected checks: **32 static + 33 Chromium browser cases PASS**, zero failures
or console errors. Browser coverage includes 21 page/width layouts, original
button/glyph/panel measurements at 320/375/430/768/1024/1440/1920, resize/open/
scroll, category keyboard navigation/focus, privacy dialogs, system-Light still
rendering Dark (including no-JS), reduced motion and skip link. Screenshots of
375/1440 category panels and privacy plus seven-width page captures are retained.
Root visually inspected the final mobile privacy and mobile/desktop categories.

The local run was explicitly targeted: no unchanged gallery/video/SEO suite was
replayed. Source-scope proof against c1c28bc8d8ce864933b034ab80215e531f5a62b3
confirms scripts.js, all media, content manifest, lockfile, robots, sitemap and
workflow unchanged. HTML changes are exactly the theme removals and privacy edit;
76 works/211 media and existing metadata remain. Previous QA/Security/Verifier
records keep their original source bindings. This is scoped evidence reuse,
not a claim that old checks ran again. Preview permissions only narrow by
removing theme.js from its public allowlist; no dependency or CI policy changes.

Local evidence index: test-results/narrow-05 (ignored, not published). Static
scope uses --scope privacy-dark; default CI still executes every retained full
static/media assertion. The existing PR workflow will run once for the new head;
its exact-head result and artifact digest are recorded in PR #1/service evidence.
No merge or publication. Limit: emulated Chromium viewports; physical devices,
Safari and Firefox are not newly tested.


## Privacy, individual project copy and centered close — iteration 6

Scope is limited to the owner's three corrections. The privacy policy now has
six readable sections on every page: own data/form behavior, local search,
cookies/storage/analytics, local media/fonts, hosting, external services and the
existing Telegram contact. Source audit found no forms, submissions, telemetry,
storage use, embeds or third-party runtime resources. GitHub Pages IP logging
is documented by the host; the policy links its official documentation and
privacy statement. No legal identity, retention period or compliance claim was
invented. Verified source:
https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection

All 76 project descriptions were rewritten individually from existing copy and
visible assets. Reviewed all 165 images and three samples of each of 46 videos;
sampling is not claimed as watching every video frame. Draft provenance contains
original/new text, factual basis, media references and invariant hashes. Titles,
categories, dates, technologies and all 211 media records/files are unchanged.
Descriptions appear immediately below the viewer title and in native no-JS
project details; runtime rendering still uses textContent.

Baseline 9c4317c: six real animation timelines reproduced a 16.29–17.91px center
shift on close. The exit CSS added translateY(20px), and the modal unlocked the
page/restored focus while the panel was visibly fading. Closing now preserves
centered scale(.9), original 400ms easing, synchronized backdrop fade and the
scroll/focus lock until final hide. Media pauses at close intent and is released
after fade. Repeated close is idempotent; reopen cancels pending cleanup without
recapturing the lock. Reduced motion/pagehide finish safely and immediately.

**180 targeted static checks and 43 unique affected Chromium cases PASS**;
zero console errors or horizontal overflow. Covers all 76 descriptions (modal,
manifest, native view), 211-media identity, privacy on all four pages at seven
widths, actual request/storage behavior, heading/close separation, contact focus,
X/Escape/backdrop closing, portrait/landscape/video/long/scrolled content,
reopen/close races and reduced motion. Widths:
320 / 375 / 430 / 768 / 1024 / 1440 / 1920.
37 final frame traces show maximum center drift 0.0000611px and zero premature
unlock frames. Representative privacy/project/close images at 375/1440 were
visually inspected. QA source-bound report: test-results/content-06/qa-review.json
(ignored local evidence), SHA256
ff8dfd0707e12c97d8c7826ac2973adae16fbe35c0f1a8a757a590e2a49872c6.

First browser run stopped the affected viewer cases on a harness-only strict
selector: every card legitimately has a cover link and a title link. Explicitly
selecting the first opener fixed the harness; only the 34 blocked cases ran
again. Earlier privacy/no-JS PASS evidence was preserved. Five missing privacy
widths were added in a separate targeted run; no product source changed between
these runs. Historical failure records remain intact, not relabeled as PASS.

Scoped reuse against 9c4317c preserves unchanged media, head/SEO metadata,
original motion, homepage/category navigation, media URL validation, dependencies,
preview permissions and CI. No unchanged full local suite or additional model
review was run. The existing required workflow runs once after push; exact-head
CI and artifact hashes are recorded in PR #1/service completion evidence.

Limitations: Chromium with emulated viewports; no new physical-device,
Safari/Firefox or deployed-site checks. No merge or publication.

## Catalog cleanup and chronology within sections — iteration 7

Owner clarification preserves the existing category sections and scrolling anchor
navigation; a mixed global feed was explicitly declined. Projects are ordered by
real date, newest first, inside each section. All 76 dates are valid DD.MM.YYYY;
no date was invented, and equal-date projects retain their former relative order.
Search only hides cards, so filtering, clearing and opening/closing a viewer keep
the same section order. Static markup gives the same order without JavaScript.

Removed 82 software list entries across 76 projects, the native software paragraphs,
modal heading/list, data-tech fields, search plumbing and unused software CSS.
The count is unique source entries, not repeated DOM renderings. Two further
Geometry Nodes mentions (title and prose of work-49) were removed by naming that
work «Процедурный город». No decorative replacement badges were introduced.

The AI category and its anchor are gone. work-74 «Анимация AI-персонажа» is in
Моушн-дизайн; work-75 «AI-изображение для логотипа» and work-76 are in Логотипы.
work-76 is consistently titled «СкрруджМакДак AI иллюстрация» in manifest,
card, viewer, native text, accessible labels and media alt text.

Inventory remains 76 projects / 211 media: 18 logos, 12 motion, 8 characters,
3 presentations, 3 websites and 32 scenes. Media paths/types/previews/covers,
files and dates are unchanged. Only descriptions 49/76 changed for the explicitly
requested software removal/name correction. Historical source remains in Git.

Validation: 169 targeted static assertions and 12 unique Chromium browser cases
PASS. Seven viewports: 320 / 375 / 430 / 768 / 1024 / 1440 / 1920. Checked six
section anchors, correct dates/order, removed category/software UI, search/clear,
all 76 viewers, focus return, no-JS native access to all 211 media, responsive
layout and zero console errors/overflow. Settled screenshots of works49/76 at
375/1440 were visually inspected after real media decode.

First browser attempt retained 10 PASS and two harness failures: an alt selector
picked the intentionally decorative backdrop, and no-JS native-details clicking
intersected the unchanged grid entrance animation. The selector now excludes
aria-hidden images; semantic no-JS fixtures wait for fonts and use reduced motion.
Only the two blocked cases were rerun, both PASS; source behavior was unchanged.
Full initial records remain immutable. Existing semantic no-JS CI fixtures use
the same readiness setup; animation assertions remain in their dedicated cases.

Scope proof against 604d1f7f1c2ef600f17a4f972491ab2f7ea41a5b preserves home/services/
404 pages, privacy, SEO heads, centered Modal close logic, original motion and
category navigation, assets/fonts, dependency locks, preview permissions and CI.
Their prior evidence is reused with the original revision, not relabeled as a
new execution. No full local suite or unchanged animation/privacy review replay.
The existing PR workflow runs once for the final pushed commit; exact-head result
and artifact hash are recorded in PR #1 and the local completion index.

Local evidence: test-results/catalog-07 (ignored). Limits: Chromium emulated
viewports; no new physical-device/Safari/Firefox or deployed-site checks. No merge
or publication is authorized or performed.
