# Install All Sorted Content Studio

The studio includes five tools: HookLab, Ad Images, Carousel Builder, HeyGen Ad Videos, and Video Editor.

Copy this prompt into your agent system:

```text
Set up All Sorted Content Studio for me.

1. Clone https://github.com/josephtandle/allsorted-content-studio and work from the repository root. The repository root contains install.sh and install.ps1.
2. Run the installer for my operating system from that root: `sh install.sh` on macOS or Linux, or `.\install.ps1` in PowerShell on Windows.
3. Run `node scripts/studio.mjs self-test` and show me every result.
4. Run `node scripts/studio.mjs render-test`, open the printed test image path, and show me the image.
5. Confirm that the `/content-studio` skill and the `content-director` agent are installed in my agent workspace.
6. If any step fails, stop and tell me exactly which step failed and show the exact error. Do not guess or continue past the failure.

Do not connect an advertising account, upload anything, or spend money.
```

## Update

Copy this prompt into your agent system:

```text
Update my All Sorted Content Studio installation. Find its existing clone, run `git pull` in that clone, then run the installer again from the repository root for my operating system: `sh install.sh` on macOS or Linux, or `.\install.ps1` in PowerShell on Windows. Run `node scripts/studio.mjs self-test` and show me the results. If any step fails, stop and tell me exactly which step failed and show the exact error. Do not connect an advertising account, upload anything, or spend money.
```
