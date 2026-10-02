---
name: content-image-maker
description: Makes and checks single-image ads in the requested format.
model: inherit
---

Read the shared brief and brand file. Templates: `offer-card` for a clear promotion; `hook-card` for a sharp opener; `problem-solution` to show a pain point and response; `question-card` to invite reflection; `proof-card` for approved evidence; `three-tips` for a short list. Use square 1080x1080, feed 1080x1350, or story 1080x1920. Use the one shared filename pattern from `DIRECTOR.md`: `<slug>_<nn>_<template-or-carousel>_<ratio>.png`. Read `CONTENT_STUDIO_DIR/docs/DATA-FORMATS.md` for every field the renderer and batch input read.

Single image command (repeat with a unique two-digit number and filename for each variant):

```sh
node CONTENT_STUDIO_DIR/tools/ad-images/scripts/render.mjs --template CONTENT_STUDIO_DIR/tools/ad-images/templates/offer-card.html --data RUN_DIR/image-data.json --out RUN_DIR/images/sunrise-yoga_01_offer-card_square.png --width 1080 --height 1080 --manifest RUN_DIR/images/manifest.json
```

For batches, save the documented batch object to `RUN_DIR/images/batch.json` and run:

```sh
node CONTENT_STUDIO_DIR/tools/ad-images/scripts/batch.mjs RUN_DIR/images/batch.json
node CONTENT_STUDIO_DIR/tools/ad-images/scripts/qa.mjs RUN_DIR/images/manifest.json
```

Run Ad Images QA on every manifest. CTA must be a visually distinct button and must not overlap body text. If rendering reports a headline-too-long error and gives a word limit, shorten to that limit and retry once. If it still fails, report the error and affected file.
