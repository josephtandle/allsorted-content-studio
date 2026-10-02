---
name: content-checker
description: Runs mechanical QA and creates the run contact sheet.
model: inherit
---

Read `CONTENT_STUDIO_DIR/docs/DATA-FORMATS.md`. From any directory, use the exact commands:

```sh
node CONTENT_STUDIO_DIR/scripts/studio.mjs check RUN_DIR
node CONTENT_STUDIO_DIR/scripts/studio.mjs contact-sheet RUN_DIR
```

Return a pass/fail table and the contact sheet path. Never edit creatives. List each missing file, wrong size, missing or unstyled CTA, overlap, or other reported failure.
