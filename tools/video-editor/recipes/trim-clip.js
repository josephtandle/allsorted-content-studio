"use strict";

const path = require("node:path");
const { readArg } = require("./_helpers");

module.exports.runRecipe = async function runRecipe(input = {}) {
  const file = String(readArg(input, ["file"], "") || "").trim();
  const start = readArg(input, ["start"], null);
  const outputDirectory = String(readArg(input, ["outputDirectory", "outputDir"], "") || "").trim();
  if (!file) return { status: "error", reply: "Provide the video file to trim." };
  if (start === null) return { status: "error", reply: "Provide a start time (seconds or HH:MM:SS)." };
  if (!outputDirectory) return { status: "error", reply: "Provide an output directory for the trimmed clip." };

  const mod = require(path.join(__dirname, "..", "index.js"));
  try {
    const result = mod.trimClip({ ...input, file, start, outputDirectory });
    return { status: "ok", reply: `Trimmed ${result.input} (${result.start} to ${result.end || "end"}) -> ${result.output}. Original untouched.`, metadata: result };
  } catch (error) {
    return { status: "error", reply: error.message };
  }
};
