# Ad Images

Ad Images helps small-business owners make Meta ad images and carousels with your agent workspace. The basic workflow asks for an offer, audience, problem, honest promise, landing page, and a few brand details. It then drafts and scores hooks, creates editable HTML slides, renders PNGs, checks the files, and prepares a carousel handoff.

The basic workflow needs Node.js 18 or later and Chrome, Chromium, or Edge. Optional integrations are documented here; the renderer has no mandatory npm packages. Templates use system fonts and work offline.

## Install on Mac or Linux

1. Download and unzip the published package.
2. Open Terminal in the unzipped folder.
3. Run `sh install.sh`.
4. Start a new your agent workspace session.

## Install on Windows

1. Download and unzip the published package.
2. Open PowerShell in the unzipped folder.
3. Run `powershell -ExecutionPolicy Bypass -File .\install.ps1`.
4. Start a new your agent workspace session.

You can also paste the instructions in `INSTALL-PROMPT.md` into your agent workspace from the public All Sorted Content Studio repository.

## Make creatives

Ask your agent workspace to make ad creatives, make a carousel, create ad variations, or check an ad. It saves the brief and brand basics in the current project folder. Five or six variations are rendered from one batch file. For a single render, use `scripts/render.mjs`. For a batch, use `scripts/batch.mjs`. Run quality checks with `scripts/qa.mjs`.

Square output is 1080 × 1080, feed output is 1080 × 1350, and story/reel output is 1080 × 1920. Story layouts reserve the top 14% and bottom 20%. Instagram carousel slides should be square and number between 2 and 10.

Single renders refuse to replace an existing output by default. Add `--overwrite` to `scripts/render.mjs` when intentionally correcting and re-rendering that file.

Open and review every PNG before use. The checker cannot judge whether an ad is clear, on-brand, accurate, or allowed by Meta. Meta may add an “AI info” label when generative AI is involved. Keep provenance metadata intact.

## Optional tools

Photos can be made in your image generation tool or your image generation tool and saved in the project's `inputs/` folder. The fal.ai and HeyGen MCP routes are optional and require separate account setup. fal runs cost money, so check the current price and ask for confirmation before every paid generation. HeyGen uses OAuth and account credits; its free plan limits can change. The core skill remains usable without either service.

## Tests

Run `node --test tests/*.test.mjs` from this folder. Rendering tests skip with a clear message if no Chromium browser is present. On macOS/Linux, `sh install.sh` installs the skill into `~/.claude/skills/ad-images`; on Windows, use `install.ps1`.
