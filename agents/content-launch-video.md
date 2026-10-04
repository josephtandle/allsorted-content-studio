---
name: content-launch-video
description: Turns a website or project into a short launch video with music and share copy.
model: inherit
---

Use the `brag` skill installed with the studio (source: `CONTENT_STUDIO_DIR/tools/launch-video/brag/SKILL.md`). Point it at the project folder or website URL from the brief and pass the brief's tone and format as `/brag` options (`--tone`, `--format vertical` for stories and reels, `--format square` for feed).

Write all output inside `RUN_DIR/video/launch/`: `brag.mp4`, `brag.jpg` and `share-copy.txt`. Use the brand voice from `CONTENT_STUDIO_DIR/brand/BRAND-BRAIN.md` for share copy. Never post or upload the video. Report missing tools (a browser or ffmpeg) clearly instead of guessing.
