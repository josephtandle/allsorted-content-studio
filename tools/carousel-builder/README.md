# Carousel Builder

Make a carousel without setting up a server or connecting an ad account. The app opens in your browser and saves PNGs, templates, and a Meta handoff file in a local `workspace` folder.

## What you need

- Node.js 20.9 or later
- npm

## Mac

1. Open Terminal in the unzipped app folder.
2. Run `npm install`.
3. Run `npm start`.
4. Open [http://localhost:4173](http://localhost:4173).

## Windows

1. Open PowerShell in the unzipped app folder.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:4173` in your browser.

Use the five steps to describe your offer, audience, and message. Edit every slide. Upload your own images if you want them included. The default carousel canvas is square at 1080 × 1080. Choose 4:5 or 9:16 in the Style step when those formats fit better.

The export step writes PNGs into `workspace/creatives/`, appends them to `manifest.json`, and creates a Meta carousel spec. Fill in the Page ID, link, and primary message in that JSON before you use it. The app shows the exact `creatives carousel ... --dry-run` command. A dry run checks the handoff. It does not publish an ad.

## Optional connections

The app works without API keys. Optional integrations start off. To turn one on, create a local `.env` file in the app folder and add the key and the matching `ENABLE_...=true` setting:

```text
PEXELS_API_KEY=your_key_here
ENABLE_PEXELS=true
ANTHROPIC_API_KEY=your_key_here
ENABLE_AI_CAPTIONS=true
```

Keep `.env` private. Never paste API keys into the app or share them with a student. The Pexels search and Anthropic caption request go to their respective providers only when enabled. Without an Anthropic key, the app gives you a prompt to copy into your agent workspace yourself.

To store app data in a different folder, set `CAROUSEL_WORKSPACE` in `.env`. Restart the app after changing settings.

## Stop the app

In the Terminal or PowerShell window running it, press `Ctrl+C`.

## Tests

Run `npm test` to check image presets, manifest appends, Meta handoff shape, and the source files for personal data.

MIT licensed. See [LICENSE](LICENSE).
