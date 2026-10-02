# Video Editor

Local, mechanical video-editing operations over `ffmpeg`/`ffprobe`. This module makes no network calls and needs no credentials -- its only dependency is a local ffmpeg install.

## What it does

- `inspect-media` -- width, height, codec, duration, and file size via `ffprobe`.
- `trim-clip` -- cut `[start, end]` out of a file with a lossless stream copy.
- `resize-for-platform` -- scale and letterbox to `instagram-reel` / `tiktok` (1080x1920), `youtube` (1920x1080), or `square` (1080x1080).
- `extract-audio` -- pull the audio track out to a 16kHz mono WAV.
- `burn-captions` -- hard-burn an existing `.srt`/`.vtt` file into the video. Requires an ffmpeg build compiled with libass (the `subtitles` filter); run `check-video-tools` first to confirm `captionBurnAvailable`. This module does not transcribe audio -- bring your own caption file.
- `check-video-tools` -- reports whether `ffmpeg`/`ffprobe` are available and whether caption burning is supported, with no network calls and no writes.

## What it does not do

No cloud transcript editing, no AI generation, no automatic transcription. Those are different modules' jobs.

## Setup

1. Install `ffmpeg` (which includes `ffprobe`). Most package managers ship it; for caption burning specifically you need a build with libass support.
2. Optionally copy `config.example.json` to your own `config.json`, or set `FFMPEG_BIN`/`FFPROBE_BIN` if your binaries are not on `PATH`.
3. Run `node index.js check-video-tools` to confirm what's available before relying on any operation.
4. Run `node index.js demo` for an offline, dependency-free smoke check.

Every operation writes to an output directory you name, never touches your original file, and refuses to overwrite an existing output rather than silently replacing it.
