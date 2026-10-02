"use strict";

const path = require("node:path");

module.exports.runRecipe = async function runRecipe(input = {}) {
  const mod = require(path.join(__dirname, "..", "index.js"));
  const result = mod.check(input);
  const parts = [];
  parts.push(result.ffmpegAvailable ? `ffmpeg is available (${result.ffmpegBin}).` : `ffmpeg was not found (looked for "${result.ffmpegBin}").`);
  parts.push(result.ffprobeAvailable ? `ffprobe is available (${result.ffprobeBin}).` : `ffprobe was not found (looked for "${result.ffprobeBin}").`);
  parts.push(result.captionBurnAvailable ? "Caption burning is supported (libass present)." : "Caption burning is NOT supported on this install (no libass/subtitles filter) -- trim, resize, and audio extraction are unaffected.");
  return { status: "ok", reply: parts.join(" "), metadata: result };
};
