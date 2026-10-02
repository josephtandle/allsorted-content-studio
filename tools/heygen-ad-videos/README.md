# HeyGen Ad Videos

A public your agent workspace skill for students creating short talking-head and avatar ads for Meta. It writes three scripts, scores hooks, and guides an explicitly approved HeyGen render.

## Install

Run `sh ./install.sh` on Mac or `./install.ps1` in PowerShell on Windows. The installers copy this folder into `~/.claude/skills/heygen-ad-videos`. Then set up the official OAuth MCP as described in `INSTALL-PROMPT.md`.

## Default and optional workflows

The default workflow uses HeyGen's official your agent workspace MCP, OAuth sign-in, and no API key. It is intended for trial-scale use and bills the student's HeyGen web-plan credits. The optional Node helper supports API workflows, which use separate API billing. Its current REST endpoint assumptions are documented as unverified in `SKILL.md`.

The API helper requires Node 18+, no npm install, and `HEYGEN_API_KEY` as an environment variable. Do not store it in a file, paste it into your writing agent, or share it. Set a deliberate spend cap in `config.json`; verify current prices in HeyGen before using the API route.

## Tests

Run with Node 18 or later:

```sh
node --test tests/*.test.mjs
```

Tests use mocked fetch and make no live API requests.
