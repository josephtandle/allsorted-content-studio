---
name: heygen-ad-videos
description: Create short HeyGen talking-head or avatar video ads for Meta. Use when a student says “make a video ad”, “HeyGen”, “talking head ad”, or asks for an avatar ad.
---

# HeyGen Ad Videos

Turn a clear offer into three reviewable short video ads, then render only after the student chooses the version, presenter, voice, and format. The default route is the official HeyGen MCP with OAuth, no API key.

## Consent and ad rules

Use only the student's own face and voice, or HeyGen stock avatars and voices. For another real person's likeness or voice, require that person's clear written permission and follow HeyGen's consent flow. Never impersonate a customer, celebrity, client, or another real person. An AI presenter must not claim to be a customer or imply a personal customer testimonial. Do not invent results, reviews, numbers, guarantees, or endorsements. Avoid copy that names or implies sensitive personal attributes. Keep claims within evidence the student supplied.

## A. Official HeyGen MCP (default)

In a normal terminal, install for the user's your agent workspace account:

```sh
claude mcp add --transport http -s user heygen https://mcp.heygen.com/mcp/v1/
```

Mac and Windows use the same command. If `claude` is not recognized, install/update your agent workspace using its official installer, reopen a terminal, and retry. Then open your agent workspace, enter `/mcp`, choose `heygen`, and complete the browser sign-in to HeyGen. No API key is needed. Confirm with `/mcp` that `heygen` is connected, then ask HeyGen to list avatars. Pick a stock avatar or the student's own consented avatar, then list voices and choose one.

MCP generation uses the student's HeyGen web-plan credits and is intended for trial-scale use, not unattended batches. As researched 2026-10-02, Free is $0 with 3 videos/month, up to 1 minute each, limited trial features, watermark, and 1 custom avatar. Limits and commercial-use rights can change. Before a real ad, check the current HeyGen plan and terms; the free plan is a smoke-test route, not assumed to include commercial rights. Ask HeyGen for current credits and show any available estimate before generation. Get an explicit yes for each paid render.

Create three scripts from the student's brief, or a current `brief.md` in the Ad Content Studio project if present. Each is 15 to 30 seconds and contains: a first-two-seconds hook, one problem, one credible promise without guarantees or personal-attribute wording, and one CTA. Include spoken script, separate on-screen caption lines, and shot/presenter notes. Score each hook from 1 to 10 on: Concreteness, Mechanism Strength, Voice Fidelity, Audience Self-Recognition, and Thumb Stop. Show axis scores, total /50, and say these are editorial judgments, not performance predictions. If HookLab is available, its five checks are the same axes; do not assume its private files exist.

Have the student choose a script and review wording. Use 9:16 for Reels and Stories by default. Use 4:5 or 1:1 for feed only if the selected HeyGen tool supports it; otherwise render portrait and offer a crop only if ffmpeg is available. Submit one selected render at a time, poll the existing render politely instead of creating another, and stop polling gracefully if it is still processing. Use `get_video` to obtain the completed URL, download it into the current project’s `creatives/video/`, and add a manifest record. Ask for approval before any paid render.

Use filenames like `<offer-slug>_<script-01>_<ratio>_v1.mp4`. If `creatives/manifest.json` exists, preserve its keys and add a video entry to `files` with `file`, `hook`, `width`, `height`, `status`, and `format`; otherwise create `{ "offer": "<offer-slug>", "format": "video", "ratio": "portrait", "files": [] }`. Use relative paths.

## B. Optional API route for volume

Use `scripts/heygen.mjs` only when the student explicitly chooses the API route. It needs Node 18+ and no npm dependencies. Set `HEYGEN_API_KEY` in the operating system environment, never paste it into chat or store it in the project. This route bills a separate API wallet from the web plan. Check current billing and `HEYGEN_SPEND_CAP_USD` before rendering. Estimates are planning estimates, not quotes.

```sh
node "{{SKILL_DIR}}/scripts/heygen.mjs" avatars
node "{{SKILL_DIR}}/scripts/heygen.mjs" voices
node "{{SKILL_DIR}}/scripts/heygen.mjs" estimate --script-file script.txt --resolution 1080p
node "{{SKILL_DIR}}/scripts/heygen.mjs" render --script-file script.txt --avatar LOOK_ID --voice VOICE_ID --aspect 9:16 --out creatives/video/offer_script-01_9x16_v1.mp4
node "{{SKILL_DIR}}/scripts/heygen.mjs" resume
```

Before spending, the script prints the estimated USD using `HEYGEN_USD_PER_MINUTE_1080P` (default $2.20, based on local observed runs and explicitly not a guaranteed current rate), estimated duration at 150 words/minute, selected aspect/resolution, and the configured cap. It refuses if estimate exceeds `HEYGEN_SPEND_CAP_USD` (default 5) until the cap is deliberately changed in `config.json`, and then requires typing exactly `RENDER <n> VIDEOS` in an interactive terminal. Render one short canary first; wait for completion and inspect it before starting a batch. A local `jobs.json` records the submitted job ID before polling. On restart, `resume` polls saved IDs and never submits them again. Ambiguous submission failures are recorded as unresolved and must be reconciled in HeyGen before another submission.

### API endpoint status

The research verified the official `create_video` reference accepts 9:16, 4:5 and 1:1, and verified the official MCP tool names. The separate REST API base and the v3 avatar, voice, create-video, and poll routes used by this optional helper were not independently confirmed against current REST reference pages during package creation. Treat those API routes as UNVERIFIED and check current HeyGen API docs before relying on Path B. The local agent's v3 routes informed the implementation, not official current endpoint verification. Credit rates also change; the default is only a planning estimate.

## Optional finishing

Detect `ffmpeg` using PATH (`ffmpeg -version`). If present, offer to burn reviewed captions or crop to 4:5 / 1:1. Never hardcode an executable path. If absent, skip this step gracefully and keep the original render.

## Final review

Check the downloaded file plays, the face and captions are not clipped, the chosen ratio matches placement, the CTA is present, and the manifest points to the file. Keep student/customer data and credentials out of this public skill package.
