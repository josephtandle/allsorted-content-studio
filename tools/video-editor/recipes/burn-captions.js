"use strict";

const path = require("node:path");
const { readArg } = require("./_helpers");

module.exports.runRecipe = async function runRecipe(input = {}) {
  const file = String(readArg(input, ["file"], "") || "").trim();
  const captionsFile = String(readArg(input, ["captionsFile", "captions"], "") || "").trim();
  const outputDirectory = String(readArg(input, ["outputDirectory", "outputDir"], "") || "").trim();
  if (!file) return { status: "error", reply: "Provide the video file to caption." };
  if (!captionsFile) return { status: "error", reply: "Provide an existing .srt or .vtt captions file. This module burns in captions you already have; it does not transcribe audio." };
  if (!outputDirectory) return { status: "error", reply: "Provide an output directory for the captioned video." };

  const mod = require(path.join(__dirname, "..", "index.js"));
  try {
    const result = mod.burnCaptions({ ...input, file, captionsFile, outputDirectory });
    return { status: "ok", reply: `Burned ${result.captions} into ${result.input} -> ${result.output}. Original untouched.`, metadata: result };
  } catch (error) {
    return { status: "error", reply: error.message };
  }
};
