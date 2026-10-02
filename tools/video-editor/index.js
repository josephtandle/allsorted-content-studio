"use strict";

/**
 * Local, mechanical video-editing operations over ffmpeg/ffprobe. No network
 * calls, no credentials, no AI generation, no transcript-driven editing --
 * that space is covered by other modules (descript for cloud transcript
 * editing, kling/flow for AI generation). This module is the free, local,
 * deterministic layer: trim, resize to a platform preset, extract audio,
 * burn in a caption file the member already has, and inspect media.
 *
 * Every write goes to an explicit output directory the caller names. This
 * module never edits, moves, or deletes the original input file, and never
 * overwrites an existing output.
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const PRESETS = {
  "instagram-reel": { width: 1080, height: 1920 },
  tiktok: { width: 1080, height: 1920 },
  youtube: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

function required(input, key) {
  if (input[key] === undefined || input[key] === null || input[key] === "") throw new Error(`Missing required input: ${key}`);
  return input[key];
}

function settings(input = {}) {
  return {
    ffmpegBin: input.ffmpegBin || process.env.FFMPEG_BIN || "ffmpeg",
    ffprobeBin: input.ffprobeBin || process.env.FFPROBE_BIN || "ffprobe",
  };
}

function assertInputFile(file) {
  const resolved = path.resolve(required({ file }, "file"));
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error("The selected input file does not exist.");
  return resolved;
}

function assertOutputPath(outputDirectory, filename) {
  const directory = path.resolve(required({ outputDirectory }, "outputDirectory"));
  const output = path.join(directory, filename);
  if (fs.existsSync(output)) throw new Error(`Refusing to overwrite existing output: ${path.basename(output)}`);
  return { directory, output };
}

function binaryAvailable(bin) {
  try {
    execFileSync(bin, ["-version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// Hard-burning captions needs the "subtitles" video filter, which only
// exists in ffmpeg builds compiled with libass. Not every distribution
// includes it (some minimal/Homebrew builds ship without it) -- detect this
// up front and fail with a clear, specific message instead of a raw ffmpeg
// stderr dump the member has no way to interpret.
function hasSubtitlesFilter(ffmpegBin) {
  try {
    const output = execFileSync(ffmpegBin, ["-hide_banner", "-filters"], { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8");
    return /\bsubtitles\b/.test(output);
  } catch {
    return false;
  }
}

function check(input = {}) {
  const { ffmpegBin, ffprobeBin } = settings(input);
  const ffmpegAvailable = binaryAvailable(ffmpegBin);
  const ffprobeAvailable = binaryAvailable(ffprobeBin);
  return {
    configured: ffmpegAvailable,
    ffmpegAvailable,
    ffprobeAvailable,
    ffmpegBin,
    ffprobeBin,
    captionBurnAvailable: ffmpegAvailable && hasSubtitlesFilter(ffmpegBin),
    presets: Object.keys(PRESETS),
  };
}

function inspectMedia(input = {}) {
  const { ffprobeBin } = settings(input);
  const file = assertInputFile(input.file);
  if (!binaryAvailable(ffprobeBin)) throw new Error(`ffprobe was not found (${ffprobeBin}). Install ffmpeg, or set FFPROBE_BIN to its path.`);
  const raw = execFileSync(
    ffprobeBin,
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name,duration", "-show_entries", "format=duration,size", "-of", "json", file],
    { stdio: ["ignore", "pipe", "pipe"] }
  ).toString("utf8");
  const parsed = JSON.parse(raw);
  const stream = (parsed.streams && parsed.streams[0]) || {};
  return {
    file: path.basename(file),
    width: stream.width ?? null,
    height: stream.height ?? null,
    codec: stream.codec_name ?? null,
    durationSeconds: Number(parsed.format?.duration ?? stream.duration ?? 0) || null,
    sizeBytes: Number(parsed.format?.size ?? 0) || null,
  };
}

function trimClip(input = {}) {
  const { ffmpegBin } = settings(input);
  const file = assertInputFile(input.file);
  const start = String(required(input, "start"));
  const end = input.end ? String(input.end) : null;
  if (!binaryAvailable(ffmpegBin)) throw new Error(`ffmpeg was not found (${ffmpegBin}). Install ffmpeg, or set FFMPEG_BIN to its path.`);
  const filename = input.outputFilename || `trim-${path.basename(file)}`;
  const { directory, output } = assertOutputPath(input.outputDirectory, filename);
  fs.mkdirSync(directory, { recursive: true });
  const args = ["-y", "-ss", start];
  if (end) args.push("-to", end);
  args.push("-i", file, "-map", "0:v:0?", "-map", "0:a:0?", "-dn", "-map_chapters", "-1", "-map_metadata", "-1", "-c", "copy", output);
  execFileSync(ffmpegBin, args, { stdio: "pipe" });
  return { input: path.basename(file), output: path.basename(output), start, end: end || null, originalUntouched: true };
}

function platformPreset(input = {}) {
  const { ffmpegBin } = settings(input);
  const file = assertInputFile(input.file);
  const preset = String(required(input, "preset"));
  const dims = PRESETS[preset];
  if (!dims) throw new Error(`Unknown preset "${preset}". Choose one of: ${Object.keys(PRESETS).join(", ")}.`);
  if (!binaryAvailable(ffmpegBin)) throw new Error(`ffmpeg was not found (${ffmpegBin}). Install ffmpeg, or set FFMPEG_BIN to its path.`);
  const filename = input.outputFilename || `${preset}-${path.basename(file)}`;
  const { directory, output } = assertOutputPath(input.outputDirectory, filename);
  fs.mkdirSync(directory, { recursive: true });
  const scaleFilter = `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease,pad=${dims.width}:${dims.height}:(ow-iw)/2:(oh-ih)/2`;
  execFileSync(ffmpegBin, ["-y", "-i", file, "-vf", scaleFilter, "-c:a", "copy", output], { stdio: "pipe" });
  return { input: path.basename(file), output: path.basename(output), preset, width: dims.width, height: dims.height, originalUntouched: true };
}

function extractAudio(input = {}) {
  const { ffmpegBin } = settings(input);
  const file = assertInputFile(input.file);
  if (!binaryAvailable(ffmpegBin)) throw new Error(`ffmpeg was not found (${ffmpegBin}). Install ffmpeg, or set FFMPEG_BIN to its path.`);
  const filename = input.outputFilename || `${path.parse(file).name}.wav`;
  const { directory, output } = assertOutputPath(input.outputDirectory, filename);
  fs.mkdirSync(directory, { recursive: true });
  execFileSync(ffmpegBin, ["-y", "-i", file, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output], { stdio: "pipe" });
  return { input: path.basename(file), output: path.basename(output), originalUntouched: true };
}

function burnCaptions(input = {}) {
  const { ffmpegBin } = settings(input);
  const file = assertInputFile(input.file);
  const captions = assertInputFile(input.captionsFile);
  if (!/\.(srt|vtt)$/i.test(captions)) throw new Error("Captions file must be .srt or .vtt. This module burns in captions you already have; it does not transcribe audio.");
  if (!binaryAvailable(ffmpegBin)) throw new Error(`ffmpeg was not found (${ffmpegBin}). Install ffmpeg, or set FFMPEG_BIN to its path.`);
  if (!hasSubtitlesFilter(ffmpegBin)) throw new Error("This ffmpeg build has no \"subtitles\" filter (it was not compiled with libass). Install an ffmpeg build with libass support to burn in captions -- other operations (trim-clip, resize-for-platform, extract-audio) do not need it.");
  const filename = input.outputFilename || `captioned-${path.basename(file)}`;
  const { directory, output } = assertOutputPath(input.outputDirectory, filename);
  fs.mkdirSync(directory, { recursive: true });
  // ffmpeg's own filtergraph parser (not the shell -- execFileSync passes
  // args directly, no shell involved) treats ":" as an option separator and
  // "'" as a quote inside a filter value, so escape those two characters
  // only. Do not wrap the value in quotes: with no shell in the loop there
  // is nothing for a quote pair to protect, and ffmpeg's parser fails to
  // find an option name if the whole value arrives pre-quoted.
  const escapedCaptions = captions.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
  execFileSync(ffmpegBin, ["-y", "-i", file, "-vf", `subtitles=${escapedCaptions}`, "-c:a", "copy", output], { stdio: "pipe" });
  return { input: path.basename(file), output: path.basename(output), captions: path.basename(captions), originalUntouched: true };
}

async function run(command, input = {}) {
  if (command === "demo") return { ok: true, mode: "offline demo", network: false, filesWritten: 0, presets: Object.keys(PRESETS) };
  // "check-video-tools" and "resize-for-platform" are the documented (README)
  // command names; "check-ffmpeg" and "platform-preset" are kept as aliases
  // for backward compatibility with older callers.
  if (command === "check-ffmpeg" || command === "check-video-tools") return check(input);
  if (command === "inspect-media") return inspectMedia(input);
  if (command === "trim-clip") return trimClip(input);
  if (command === "platform-preset" || command === "resize-for-platform") return platformPreset(input);
  if (command === "extract-audio") return extractAudio(input);
  if (command === "burn-captions") return burnCaptions(input);
  throw new Error(`Unknown command: ${command}`);
}

async function runRecipe(command, input = {}) {
  try {
    const result = await run(command, input);
    return { status: "ok", reply: `${command} completed.`, metadata: result };
  } catch (error) {
    return { status: "error", reply: error.message, metadata: { command } };
  }
}

async function main(argv = process.argv.slice(2)) {
  const command = argv[0] || "demo";
  const inputAt = argv.indexOf("--input");
  const input = inputAt >= 0 ? JSON.parse(argv[inputAt + 1] || "{}") : {};
  console.log(JSON.stringify(await run(command, input), null, 2));
}

if (require.main === module) main().catch((error) => { console.error(`[video-editor] ${error.message}`); process.exit(1); });
module.exports = { PRESETS, check, inspectMedia, trimClip, platformPreset, extractAudio, burnCaptions, main, run, runRecipe };
