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
