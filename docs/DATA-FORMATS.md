# Studio data formats

Use JSON UTF-8. Paths in commands are relative to the run folder unless absolute. Replace `CONTENT_STUDIO_DIR` and `RUN_DIR` with the installed studio directory and current run directory. The installer replaces the `CONTENT_STUDIO_DIR` placeholder in worker Markdown files with its install path.

## Shared brand.json

`brand/BRAND-BRAIN.md` is canonical. Run `node CONTENT_STUDIO_DIR/scripts/studio.mjs brand-json` to generate the shared brand object:

```json
{
  "brandName": "Sunrise Yoga Studio",
  "offer": "Beginner yoga classes, one 60-minute small-group introduction class",
  "priceOrTerms": "$25 per class, booking required, fictional example offer",
  "destination": "https://example.com/sunrise-yoga",
  "audience": "Adults curious about yoga who want a calm first class",
  "currentSituation": "Interested in trying yoga, but unsure what a first class involves",
  "problem": "Starting something new can feel intimidating",
  "supportedOutcome": "Learn a few gentle movements in a welcoming class",
  "approvedProof": ["One 60-minute beginner class", "Small-group format", "Fictional example offer"],
  "testimonials": [],
  "claimsToAvoid": ["guaranteed health outcomes", "medical treatment claims", "weight-loss promises"],
  "voice": "Warm, calm, practical, welcoming, and specific",
  "colors": { "background": "#FFF8EC", "ink": "#25443B", "accent": "#E98256" },
  "fonts": { "display": "Georgia", "body": "Arial" },
  "imageDirection": "Natural morning light, simple studio details, no body transformation imagery",
  "primaryAction": "View class times and book a beginner class",
  "cta": "See the beginner class schedule"
}
```

## image-data.json, one image

Every template reads `brandName`, `brand`, `hook`, `headline`, `body`, and `cta`. `proof` is read by `proof-card`; `tips` (three strings) or `tip1`, `tip2`, `tip3` are read by `three-tips`; `image` is an optional local image path read by `hook-card`.

```json
{
  "brandName": "Sunrise Yoga Studio",
  "brand": {
    "brandName": "Sunrise Yoga Studio",
    "colors": { "background": "#FFF8EC", "ink": "#25443B", "accent": "#E98256" },
    "fonts": { "display": "Georgia", "body": "Arial" }
  },
  "hook": "A calmer start begins here",
  "headline": "A calmer start begins here",
  "body": "Try one gentle beginner class this week.",
  "cta": "See the beginner class schedule",
  "proof": "A 60-minute beginner class in a small group.",
  "tips": ["Choose a time that fits", "Wear comfortable layers", "Ask questions before class"],
  "image": "INPUTS/example-photo.jpg"
}
```

## Batch image input

`format` is `single` or `carousel`, `ratio` is `square`, `feed`, or `story`. Each variation requires `template`, `hook`, `headline`, `body`, and `cta`; `tips`, `proof`, and `colors` are optional. `brand` follows the shared brand subset above.

```json
{
  "offer": "sunrise-yoga",
  "format": "single",
  "ratio": "square",
  "brand": { "brandName": "Sunrise Yoga Studio", "colors": { "background": "#FFF8EC", "ink": "#25443B", "accent": "#E98256" }, "fonts": { "display": "Georgia", "body": "Arial" } },
  "variations": [
    { "template": "offer-card", "hook": "A calmer start begins here", "headline": "A calmer start begins here", "body": "Try one gentle beginner class this week.", "cta": "See the beginner class schedule" }
  ]
}
```

## carousel-data.json

Each slide may include `showCta: true` to show its CTA button. By default, only the final slide shows a button; earlier slides omit it even when they have CTA copy in their data. The final slide shows its button unless `showCta` is explicitly `false`.

Each slide accepts `eyebrow` (or legacy alias `stepLabel`), `headline` (or `heading`), `body`, `cta`, and optional `imageData` (a data URI used by the interactive builder to place a photo behind the rendered slide). Supply `body` and `cta` as separate flow blocks. Slides 1 and 2 each need one short supporting line under the headline, one idea per slide. Palette and fonts come from `brand.json`; optional `palette` may override the brand with `background`, `ink`, `accent`, and `fonts`.

```json
{
  "title": "sunrise-yoga-beginner-class",
  "preset": "square",
  "slides": [
    { "eyebrow": "WHAT GETS IN THE WAY", "headline": "Starting yoga can feel unfamiliar", "body": "A first class is easier when you know what to expect." },
    { "eyebrow": "A BETTER WAY", "headline": "Begin with a gentle class", "body": "A small-group introduction gives you room to learn." },
    { "eyebrow": "THE OUTCOME", "headline": "Learn a few new movements", "body": "Try one welcoming class at your own pace.", "cta": "See the beginner class schedule" }
  ]
}
```

## handoff.json

The root object has `status`, explicit `blanks`, and `ads`. Each image entry has an `image`; each carousel entry has the Meta Ads carousel `cards` shape and its equivalent `child_attachments` list. Every ad is PAUSED. Page ID, link, and message stay visibly marked until the receiving Meta Ads agent fills them, even if the run copy has primary text. CTA accepts `LEARN_MORE`, `SHOP_NOW`, `SIGN_UP`, `BOOK_NOW`, `GET_OFFER`, `CONTACT_US`, `SUBSCRIBE`, or `DOWNLOAD`. Common copy phrases such as `Book a class`, `Shop now`, and `Contact us` map to their corresponding Meta values. Copywriters provide CTA in `copy/ads.json` (`callToAction`, `ctaValue`, or `cta`) or `copy/ads.md` YAML front matter (`callToAction`, `ctaValue`, or `cta`). Missing/invalid CTA defaults to LEARN_MORE with a warning.

```json
{
  "status": "PAUSED",
  "blanks": { "pageId": "FILL_IN_META_PAGE_ID", "link": "FILL_IN_LANDING_PAGE_URL", "message": "FILL_IN_PRIMARY_MESSAGE" },
  "ads": [
    { "type": "image", "name": "A calmer start begins here", "pageId": "FILL_IN_META_PAGE_ID", "message": "FILL_IN_PRIMARY_MESSAGE", "link": "FILL_IN_LANDING_PAGE_URL", "callToAction": "BOOK_NOW", "status": "PAUSED", "image": "./images/sunrise-yoga_01_offer-card_square.png", "headline": "A calmer start begins here" },
    { "type": "carousel", "name": "Sunrise Yoga beginner class", "pageId": "FILL_IN_META_PAGE_ID", "message": "FILL_IN_PRIMARY_MESSAGE", "link": "FILL_IN_LANDING_PAGE_URL", "callToAction": "BOOK_NOW", "status": "PAUSED", "cards": [{ "image": "./carousel/sunrise-yoga_01_carousel_square.png", "headline": "Start gently" }, { "image": "./carousel/sunrise-yoga_02_carousel_square.png", "headline": "Learn at your pace" }], "child_attachments": [{ "image": "./carousel/sunrise-yoga_01_carousel_square.png", "headline": "Start gently", "link": "" }, { "image": "./carousel/sunrise-yoga_02_carousel_square.png", "headline": "Learn at your pace", "link": "" }] }
  ]
}
```
