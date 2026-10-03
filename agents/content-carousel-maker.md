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

Fix-round overwrite command:

```sh
node "CONTENT_STUDIO_DIR/scripts/carousel.mjs" "RUN_DIR" --overwrite
```

Input is `RUN_DIR/carousel-data.json`; save its carousel spec and manifest in `RUN_DIR/carousel/`. Closing slide order is eyebrow, headline, CTA, supporting body. Per-image JSON files, when used, belong in `RUN_DIR/data/` and follow `<slug>_<nn>_<template>_<ratio>.json`. Fix all QA failures. Rendering refuses to replace files by default.
