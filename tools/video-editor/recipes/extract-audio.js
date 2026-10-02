"use strict";

const path = require("node:path");
const { readArg } = require("./_helpers");

module.exports.runRecipe = async function runRecipe(input = {}) {
  const file = String(readArg(input, ["file"], "") || "").trim();
  const outputDirectory = String(readArg(input, ["outputDirectory", "outputDir"], "") || "").trim();
  if (!file) return { status: "error", reply: "Provide the video file to extract audio from." };
  if (!outputDirectory) return { status: "error", reply: "Provide an output directory for the extracted audio." };

  const mod = require(path.join(__dirname, "..", "index.js"));
  try {
    const result = mod.extractAudio({ ...input, file, outputDirectory });
    return { status: "ok", reply: `Extracted audio from ${result.input} -> ${result.output}. Original untouched.`, metadata: result };
  } catch (error) {
    return { status: "error", reply: error.message };
  }
};
