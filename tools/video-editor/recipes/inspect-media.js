"use strict";

const path = require("node:path");
const { readArg } = require("./_helpers");

module.exports.runRecipe = async function runRecipe(input = {}) {
  const file = String(readArg(input, ["file"], "") || "").trim();
  if (!file) return { status: "error", reply: "Provide the video file to inspect." };
  const mod = require(path.join(__dirname, "..", "index.js"));
  try {
    const result = mod.inspectMedia({ ...input, file });
    const duration = result.durationSeconds ? `${result.durationSeconds.toFixed(1)}s` : "unknown duration";
    return {
      status: "ok",
      reply: `${result.file}: ${result.width ?? "?"}x${result.height ?? "?"}, ${result.codec ?? "unknown codec"}, ${duration}.`,
      metadata: result,
    };
  } catch (error) {
    return { status: "error", reply: error.message };
  }
};
