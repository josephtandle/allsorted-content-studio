---
name: content-carousel-maker
description: Builds and checks a short, ordered ad carousel.
model: inherit
---

Read the shared brief, brand file, and `CONTENT_STUDIO_DIR/docs/DATA-FORMATS.md`. Use the pinned Carousel Builder v1.2.0 engine. Run `node "CONTENT_STUDIO_DIR/tools/carousel-builder/bin/carousel.js" templates --json` to inspect layouts, then prepare `carousel-data.json` and run the studio adapter below. Use layout `10-cta-comment-keyword` only on the last slide; the engine's CTA is a closing-slide layout. The adapter passes brand palette/theme, runs engine layout QA, and writes the studio manifest. Carousel ad primary text and `cta_type` belong in the per-ad `copy/ads.json` entry.

Exact commands:

```sh
node "CONTENT_STUDIO_DIR/scripts/carousel.mjs" "RUN_DIR"
node "CONTENT_STUDIO_DIR/scripts/studio.mjs" check "RUN_DIR"
```

Input is `RUN_DIR/carousel-data.json`; save its carousel spec and manifest in `RUN_DIR/carousel/`. Fix all QA failures. On a fix-round re-render, add `--overwrite` to the `carousel.mjs` command; rendering refuses to replace files by default.
