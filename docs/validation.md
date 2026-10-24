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
