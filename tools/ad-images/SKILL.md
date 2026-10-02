---
name: ad-images
description: Make, vary, and check Meta ad images and carousels with editable HTML templates. Use when the student says “make ad creatives”, “make a carousel”, “ad variations”, or “check my ad”.
---

# Ad Images

I help you turn one clear offer into a small set of ad creatives you can review, edit, and export. The built-in workflow works offline after setup. It does not publish ads or promise results.

## Triggers

Use this skill when the student asks to make ad creatives, make a carousel, create ad variations, or check an ad. Start with the brief below unless the project already has a current `brief.md` and `brand.json`.

## 1. Brief and project files

Ask for these one at a time if they are not already clear:

1. What are you offering?
2. Who is it for? Describe the audience without guessing sensitive personal traits.
3. What is the one problem this ad should focus on?
4. What is the honest promise or useful outcome? Do not promise guaranteed, certain, or time-bound results.
5. What landing-page URL should the ad use?
6. What are the brand basics: colors, fonts, and logo file if there is one?

Use the current project folder. Create `brief.md` and `brand.json` there. Do not put private customer data, health or financial details, or credentials in either file. Use a relative logo path. A minimal `brand.json` looks like:

```json
{
  "brandName": "Your business",
  "colors": { "background": "#F7F2E8", "ink": "#173B35", "accent": "#E47C52" },
  "fonts": { "display": "Georgia", "body": "Arial" },
  "logo": "inputs/logo.png"
}
```

If there is no logo, use `null`. Keep the audience description broad. Do not write copy that says or implies the viewer has a protected or sensitive personal attribute, such as “Are you depressed?”, “As a diabetic”, or “Are you in debt?”.

## 2. Write and score hooks

Write 10 distinct paid-ad hooks based on the brief. Keep claims grounded in the offer and any evidence the student supplied. Score each from 0 to 10 on:

| Axis | What a high score means |
|---|---|
| Concreteness | The reader can picture the situation or next step |
| Mechanism Strength | It says how the offer helps, not only that it helps |
| Voice Fidelity | It sounds like the business, based on examples provided |
| Audience Self-Recognition | The intended audience recognizes a real situation without personal-attribute targeting |
| Thumb Stop | The first line earns attention without shock or deception |

Show all scores, the total out of 50, and the top 3. These are editorial judgments, not performance predictions. If HookLab is installed, offer to use it for an alternate hook pass; do not assume its private files or paths exist. The core workflow must still work without it.

## 3. Build the creatives offline

The core uses agent-written HTML and CSS, the bundled templates, and `scripts/render.mjs`. It needs Node.js 18 or later and a supported Chromium browser, with no npm install.

Available original editable templates in `templates/`:

- `hook-card.html`
- `problem-solution.html`
- `three-tips.html`
- `offer-card.html`
- `proof-card.html`
- `question-card.html`

Use only proof supplied by the student. The proof template has no default statistic or testimonial. Never invent numbers, reviews, client outcomes, or endorsements. Replace its proof area with an approved fact, a real permissioned quote, or remove it.

Supported sizes:

- `square`: 1080 × 1080, 1:1. Use this for Instagram carousel cards.
- `feed`: 1080 × 1350, 4:5.
- `story`: 1080 × 1920, 9:16. Keep every text box inside the central safe area, below the top 14% and above the bottom 20%.

For a carousel, make 2 to 10 square slides. Give each slide one job and keep the visual system consistent. Do not shrink copy until it becomes hard to read. Use `creatives/batch.json` as the batch input: an object with `offer`, `format`, `ratio`, and 5 or 6 `variations`, each containing `hookNumber`, `template`, `hook`, `body`, `cta`, and optional `colors`. Run one command:

```text
node "{{SKILL_DIR}}/scripts/batch.mjs" creatives/batch.json
```

The batch script creates five or six PNGs, named `<slug>_<nn>_<template-or-carousel>_<ratio>.png` as defined in `DIRECTOR.md`, and updates `creatives/manifest.json` with every file, hook, pixel size, and status. Keep offer slugs short, lowercase, and filesystem-safe.

To render one creative directly:

```text
node "{{SKILL_DIR}}/scripts/render.mjs" --template "{{SKILL_DIR}}/templates/hook-card.html" --data creatives/sunrise-yoga_01_hook-card_feed.json --out creatives/sunrise-yoga_01_hook-card_feed.png --width 1080 --height 1350
```

Read `docs/DATA-FORMATS.md` for the exact complete `image-data.json` and batch formats. Every creative must render a distinct CTA button that does not overlap body text. Escape HTML values. Use system fonts and CSS variables so output works offline. Keep the HTML editable and retain the supplied template's layout-box metadata.

If no Chromium browser is found, install Chrome, Chromium, or Edge and retry. Do not install project dependencies. Students can also make a photo in your image generation tool or your image generation tool and put it in `inputs/`; the HTML templates can use a local image path when appropriate. your agent workspace does not make the photo itself.

## 4. Check the output

Run:

```text
node "{{SKILL_DIR}}/scripts/qa.mjs" creatives/manifest.json
```

The checker verifies PNG dimensions, file size, minimum text size, and 9:16 safe zones using template layout boxes. Fix every reported technical error, then open the images and review the actual creative. Use this plain-English policy checklist before handoff:

- Does the ad imply or call out a viewer's sensitive or protected personal attribute?
- Does it promise a guaranteed or time-bound result that the business cannot substantiate?
- Could the offer fall under a special ad category, such as housing, employment, credit, or social issues? If unsure, check Meta's current rules before publishing.
- Was generative AI used? Meta may show an “AI info” label. Do not remove or strip provenance metadata.
- Are image rights, logo use, testimonials, and proof approved?

This is a review aid, not legal advice or a guarantee of Meta approval.

## 5. Prepare the Meta Ads handoff

Create `creatives/carousel-spec.json` matching the Meta Ads agent's carousel input. Include 2 to 10 cards, square PNG paths, headlines, a primary message, and a valid landing URL. Put explicit blanks in `pageId` and `link` if the student has not supplied those values. Never invent an account ID. The student must replace blanks before running the agent. Example shape:

```json
{
  "name": "Offer carousel v1",
  "pageId": "FILL_IN_META_PAGE_ID",
  "message": "Primary text shown above the carousel.",
  "link": "FILL_IN_LANDING_PAGE_URL",
  "callToAction": "LEARN_MORE",
  "optimizeOrder": false,
  "endCard": true,
  "cards": [
    { "image": "./sunrise-yoga_01_carousel_square.png", "headline": "First slide" },
    { "image": "./sunrise-yoga_02_carousel_square.png", "headline": "Next step" }
  ]
}
```

The carousel agent expects `pageId` to contain digits and `link` to be an HTTP(S) URL. After filling those fields and checking the local image paths, have the student run `creatives carousel <spec.json> --dry-run` first. Do not run a live upload or publish action from this skill.

## Optional power-ups

These are not required for the core workflow. Never generate a paid image or video without showing the current estimate and getting an explicit yes for that generation.

### fal.ai image MCP

Only continue if the student has chosen to set fal up. fal's official MCP uses a key. The safe setup keeps the value in an environment variable, never pasted into chat. From a normal terminal:

```text
claude mcp add-json fal-ai '{"type":"http","url":"https://mcp.fal.ai/mcp","headers":{"Authorization":"Bearer ${MY_FAL_KEY}"}}' --scope user
```

Set `MY_FAL_KEY` in the student's OS environment using fal's own dashboard guidance. Do not ask the student to paste it into your writing agent, a project file, or a screenshot. Confirm `/mcp` shows fal connected. Before each generation, ask fal for current pricing, choose the cheapest suitable model by default, show the number of outputs and estimated total, then wait for an explicit yes. If price or model suitability is unclear, do not run it. Model prices and commercial-use terms can change; check the selected model's current license before using it in an ad.

### HeyGen official MCP

The official server uses OAuth:

```text
claude mcp add --transport http -s user heygen https://mcp.heygen.com/mcp/v1/
```

Then run `/mcp` and finish the browser sign-in. Check available credits and show the estimate before every video. HeyGen's free plan is limited (research checked 2026-10-02: 3 videos per month, up to 1 minute each, watermarked); check current limits in the account. Use only your own face or someone who gave clear permission. Never create a video without an explicit yes for that render.

### Photos

For the least setup, make an image in your image generation tool or your image generation tool, then put it in `inputs/`. Ask for one photo at a time and check the current tool's usage limits and commercial terms. Never remove provenance metadata.
