# Decisions

1. **Keep static Pages architecture.** Three content pages do not justify a
   framework, backend or runtime dependency. Existing URLs are preserved.
2. **Preserve source and media.** Keep all substantive projects, dates, tools and
   original media. Improve generic/mistyped copy without inventing experience,
   clients, results or delivery promises. Remove only three empty Soon cards.
3. **Add preview derivatives.** Small WebP images serve galleries; full originals
   remain explicitly accessible. Do not preload all video files. Keep existing
   brand font local; system fonts serve body text without external font requests.
4. **Progressive gallery.** Native links/details work without JS; the retained
   modal adds focus isolation, keyboard control and video cleanup. No autoplay,
   pointer trails, forced image-save prevention or new speculative features.
5. **Pages publication boundary.** Retain main-branch Pages publishing and exclude
   dev content via Jekyll configuration. CI has read-only contents permission and
   no deploy job. Owner approval precedes merge and actual post-deploy checks.
6. **SEO truthfulness.** Use only existing public personal facts. Person/WebSite
   structured data supports identity; no ratings, fake reviews or keyword spam.
   The privacy dialog describes actual site behavior, not invented forms/cookies.
