"use strict";

const path = require("node:path");
const { readArg } = require("./_helpers");

module.exports.runRecipe = async function runRecipe(input = {}) {
  const file = String(readArg(input, ["file"], "") || "").trim();
  const preset = String(readArg(input, ["preset", "platform"], "") || "").trim();
  const outputDirectory = String(readArg(input, ["outputDirectory", "outputDir"], "") || "").trim();
  if (!file) return { status: "error", reply: "Provide the video file to resize." };
  if (!preset) return { status: "error", reply: "Provide a platform preset: instagram-reel, tiktok, youtube, or square." };
  if (!outputDirectory) return { status: "error", reply: "Provide an output directory for the resized video." };

  const mod = require(path.join(__dirname, "..", "index.js"));
  try {
    const result = mod.platformPreset({ ...input, file, preset, outputDirectory });
    return { status: "ok", reply: `Resized ${result.input} to ${result.preset} (${result.width}x${result.height}) -> ${result.output}. Original untouched.`, metadata: result };
  } catch (error) {
    return { status: "error", reply: error.message };
  }
};
