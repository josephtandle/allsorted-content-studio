"use strict";

// Zero-network, zero-subprocess configuration check. This module needs no API
// key and no account. Its only configuration is where the two local tools
// live, mirroring settings() in index.js exactly:
//   FFMPEG_BIN  -- path to ffmpeg, defaults to the bare command "ffmpeg"
//   FFPROBE_BIN -- path to ffprobe, defaults to the bare command "ffprobe"
// Both can also be supplied per call as input.ffmpegBin / input.ffprobeBin.
//
// This check does not execute either tool. Run the check-video-tools recipe
// for a live probe that confirms the binaries actually work.
function resolve(inputValue, envName, fallback) {
  if (inputValue) return { value: String(inputValue), source: "supplied for this call" };
  if (process.env[envName]) return { value: process.env[envName], source: envName };
  return { value: fallback, source: "default, resolved on PATH" };
}

module.exports.runRecipe = async function runRecipe(input = {}) {
  const ffmpeg = resolve(input.ffmpegBin, "FFMPEG_BIN", "ffmpeg");
  const ffprobe = resolve(input.ffprobeBin, "FFPROBE_BIN", "ffprobe");

  const lines = [
    `Encoder path (FFMPEG_BIN): ${ffmpeg.value} (${ffmpeg.source})`,
    `Inspector path (FFPROBE_BIN): ${ffprobe.value} (${ffprobe.source})`,
  ];

  const reply = [
    "This module uses no API key and no account. It only needs ffmpeg and ffprobe installed locally.",
    "",
    ...lines,
    "",
    "This check did not run either tool. Run the check-video-tools recipe to confirm they are installed and that caption burning is supported.",
  ].join("\n");

  return {
    status: "ok",
    reply,
    metadata: {
      configured: true,
      network: false,
      requiredCredentials: [],
      toolPaths: {
        FFMPEG_BIN: { value: ffmpeg.value, fromEnvironment: ffmpeg.source === "FFMPEG_BIN" },
        FFPROBE_BIN: { value: ffprobe.value, fromEnvironment: ffprobe.source === "FFPROBE_BIN" },
      },
      liveProbeRecipe: "agent/video-editor/check-video-tools",
    },
  };
};
