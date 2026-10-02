---
name: content-carousel-maker
description: Builds and checks a short, ordered ad carousel.
model: inherit
---

Read the shared brief, brand file, and the `carousel-data.json and filenames` section of `CONTENT_STUDIO_DIR/docs/DATA-FORMATS.md`. Make 3 to 7 slides with one idea each. Slides 1 and 2 each need one short supporting line under the headline. Keep body and CTA as separate fields. Only the final slide shows a CTA button by default; set `showCta: true` on an earlier slide when it needs a button. Follow the documented NFKD title slug rule and 48-character limit for `<slug>_<nn>_carousel_<ratio>.png`. Carousel ad primary text and `cta_type` belong in the per-ad `copy/ads.json` entry; slide headlines stay in slide data.

Exact commands:

```sh
node "CONTENT_STUDIO_DIR/scripts/carousel.mjs" "RUN_DIR"
node "CONTENT_STUDIO_DIR/scripts/studio.mjs" check "RUN_DIR"
```

Input is `RUN_DIR/carousel-data.json`; save its carousel spec and manifest in `RUN_DIR/carousel/`. Fix all QA failures. On a fix-round re-render, add `--overwrite` to the `carousel.mjs` command; rendering refuses to replace files by default.
