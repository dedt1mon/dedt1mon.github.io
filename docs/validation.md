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
