# Accepted portfolio update — 2026-10-25

The owner accepted the existing local site as the final source of truth and
explicitly authorized cleanup, a content PR, merge after successful CI and Pages
publication. This update adds the previously approved 33 projects to the 76-work
catalog: **109 projects and 263 media entries**. No further visual changes are
part of publication.

## Accepted content

- The six existing category sections and descending date order inside each
  section are retained. The owner-supplied dates, including the future date of
  work-109, are not inferred or rewritten.
- The 33 approved titles are retained, with the final eight logo names taken
  directly from their visible wordmarks: Ирис и уголь, Пышь, Усарь, Витраль,
  Опорум, Глинь, Кикра, После.
- Project descriptions are removed from cards, native material disclosures,
  dialogs, search and display-only data. The no-JavaScript material links remain.
- Girl3 is the cover and the gallery order remains Girl3, Girl2, Girl1.
- The two new AI animation works belong to motion design. No AI category or
  software badges are restored.
- The approved dark design, close-icon rotation, centered dialog animation,
  homepage automatic carousel, project galleries, privacy policy, SEO and
  DedTimon browser titles are retained.

## Conservative cleanup

Earlier local cleanup removed 257 obsolete files with recorded provenance:
full-resolution lossless replacements, unreferenced generated previews and exact
duplicates. The final publication audit removed only two additional unused Girl1
cover previews (640 and 1024 pixels); its original and 320-pixel thumbnail remain.
Total cleanup across this content update: **259 files / 107,346,140 bytes**,
including **2 files / 159,428 bytes** in the final publication pass.

Four tracked old AI paths are separately verified relocations: the video is
byte-identical and the three full-size image conversions are pixel-identical.
They are not lost media or additional cleanup-count entries. The Git diff has
202 deleted tracked paths; some earlier cleanup files had never been committed.

All 29 ambiguous original/legacy assets are retained. Development dependencies
and historical validation artifacts are kept because they remain necessary for
checks and evidence reuse. They are excluded from Git/Pages by existing policy.
No .git cleanup or history rewrite is performed.

Final media inventory: **767 files / 1,342,535,219 bytes**. There are no exact-byte
media duplicates. Runtime source hashes match the owner-approved checkpoint;
only unused media deletion and test-expectation maintenance were needed during
publication preparation.

## Validation and reuse

Previous local evidence is retained under excluded test-results/content-11
through content-14: real image/video checks, seven widths from 320 to 1920,
keyboard/focus, reduced motion, no-JavaScript access and the final title changes.
These reports keep their original source hashes; they are not relabelled as new
runs. Removed preview files were not referenced by the current source, gallery,
manifest, favicon/SEO, Pages configuration or project tests.

The static/browser contracts were updated to the accepted 109/263 catalog,
absence of descriptions and frozen content fingerprints. Multi-image tests now
select an explicit existing multi-image project rather than relying on the
first card. Long-description fixtures become long-title/scrolled-viewer cases.
No test gate, workflow, dependency or runtime behavior is weakened.

- Updated static contract: 5,474 checks passed.
- Only affected browser cases run locally; unchanged browser/media evidence is
  reused. The mandatory complete workflow runs once on the PR's exact head.
- Merge requires a successful exact-head Site quality workflow.
- Public-source/resource and functional smoke checks follow Pages deployment;
  their results and exact revision are recorded in the PR and excluded local
  publish-15 evidence. No pre-deployment result is claimed as production proof.

Publication evidence: test-results/publish-15 (local, excluded from Git/Pages).
Historical content11 cleanup record SHA-256:
ea57fc35363d117b95dabf6a23d7e44673094a9281751d4b69018413aad10783.

Browser coverage uses Chromium and viewport emulation; it is not a claim of
physical-device, Safari or Firefox testing.
