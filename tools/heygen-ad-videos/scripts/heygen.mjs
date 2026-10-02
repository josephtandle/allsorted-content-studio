#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export const BASE_URL = 'https://api.heygen.com';
const JOBS = path.resolve('jobs.json');
const CONFIG = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const json = (file, fallback) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
const save = (file, data) => { const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 }); fs.renameSync(tmp, file); };
const auth = () => { const key = process.env.HEYGEN_API_KEY; if (!key) throw Error('HEYGEN_API_KEY is not set in the environment.'); return { 'X-Api-Key': key }; };
export async function request(url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, { ...options, headers: { ...auth(), ...(options.headers || {}) } });
  const body = options.raw ? response : await response.json().catch(() => ({}));
  if (!response.ok) throw Error(`HeyGen request failed: HTTP ${response.status}`);
  return body;
}
export function estimate(script, resolution = '1080p', cap = Number(process.env.HEYGEN_SPEND_CAP_USD || CONFIG.spendCapUsd)) {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  const minutes = words / 150;
  const rate = resolution === '720p' ? CONFIG.usdPerMinute720p : CONFIG.usdPerMinute1080p;
  const usd = minutes * rate;
  return { words, minutes, usd, cap, rate, resolution, overCap: usd > cap };
}
export function buildManifest(manifest, record) {
  const next = structuredClone(manifest || { offer: record.offer, format: 'video', ratio: record.ratio, files: [] });
  next.files ||= [];
  if (!next.files.some(x => x.file === record.file)) next.files.push(record);
  return next;
}
export async function submitAndTrack({ script, avatar, voice, aspect = '9:16', resolution = '1080p', out, spendCapUsd, fetchImpl = fetch, confirmation = '', jobsPath = JOBS, poll = true }) {
  const plan = estimate(script, resolution, spendCapUsd);
  if (confirmation !== 'RENDER 1 VIDEOS') throw Error(`Type RENDER 1 VIDEOS exactly to authorize this render${plan.overCap ? ` above the $${plan.cap.toFixed(2)} cap` : ''}.`);
  const jobs = json(jobsPath, []);
  const job = { id: `local-${Date.now()}`, status: 'submitting', out, aspect, resolution, createdAt: new Date().toISOString() };
  jobs.push(job); save(jobsPath, jobs);
  try {
    const body = await request(`${BASE_URL}/v3/videos`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'avatar', avatar_id: avatar, voice_id: voice, script, aspect_ratio: aspect, resolution, output_format: 'mp4', fit: 'cover' }) }, fetchImpl);
    const data = body.data || body; job.id = data.video_id || data.id;
    if (!job.id) { job.status = 'unresolved'; save(jobsPath, jobs); throw Error('Submission response had no job ID; reconcile in HeyGen before retrying.'); }
    job.status = data.status || 'waiting'; save(jobsPath, jobs);
    return poll ? pollJob(job, { jobs, jobsPath, fetchImpl }) : job;
  } catch (error) { if (job.status === 'submitting') { job.status = 'unresolved'; save(jobsPath, jobs); } throw error; }
}
export async function pollJob(job, { jobs = json(JOBS, []), jobsPath = JOBS, fetchImpl = fetch, maxPolls = 360, intervalMs = CONFIG.pollIntervalMs, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  for (let i = 0; i < maxPolls; i++) {
    const body = await request(`${BASE_URL}/v1/video_status.get?video_id=${encodeURIComponent(job.id)}`, {}, fetchImpl);
    const data = body.data || body;
    job.status = data.status || job.status;
    if (job.status === 'completed') { job.url = data.video_url; save(jobsPath, jobs); return job; }
    if (['failed', 'error'].includes(job.status)) { save(jobsPath, jobs); throw Error(`Render ${job.id} ended with ${job.status}.`); }
    save(jobsPath, jobs); if (i + 1 < maxPolls) await sleep(intervalMs);
  }
  return job;
}
async function main(args) {
  const cmd = args[0];
  if (cmd === 'estimate') { const s = fs.readFileSync(args[args.indexOf('--script-file') + 1], 'utf8'); const p = estimate(s, args[args.indexOf('--resolution') + 1] || '1080p'); console.log(JSON.stringify(p, null, 2)); return; }
  if (cmd === 'avatars' || cmd === 'voices') { const route = cmd === 'avatars' ? '/v3/avatars' : '/v3/voices'; console.log(JSON.stringify(await request(BASE_URL + route), null, 2)); return; }
  if (cmd === 'resume') { const jobs = json(JOBS, []); for (const job of jobs) if (job.id && !job.id.startsWith('local-') && !['completed', 'failed', 'error'].includes(job.status)) await pollJob(job, { jobs, jobsPath: JOBS }); console.log(JSON.stringify(jobs, null, 2)); return; }
  if (cmd !== 'render') throw Error('Use avatars, voices, estimate, render, or resume.');
  const script = fs.readFileSync(args[args.indexOf('--script-file') + 1], 'utf8');
  const value = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
  const plan = estimate(script, value('--resolution') || '1080p'); console.log(JSON.stringify(plan, null, 2));
  if (plan.overCap) throw Error('Increase spendCapUsd in config.json deliberately before continuing.');
  if (!stdin.isTTY) throw Error('Interactive terminal required for typed spend confirmation.');
  const rl = readline.createInterface({ input: stdin, output: stdout }); const answer = await rl.question('Type RENDER 1 VIDEOS to continue: '); rl.close();
  if (answer !== 'RENDER 1 VIDEOS') throw Error('Confirmation did not match.');
  const job = await submitAndTrack({ script, avatar: value('--avatar'), voice: value('--voice'), aspect: value('--aspect'), resolution: value('--resolution'), out: value('--out'), confirm: true });
  if (job.status === 'completed' && job.url && job.out) { const response = await request(job.url, { raw: true }); fs.mkdirSync(path.dirname(job.out), { recursive: true }); fs.writeFileSync(job.out, Buffer.from(await response.arrayBuffer())); job.downloaded = true; save(JOBS, json(JOBS, [])); const [w, h] = (job.aspect || '9:16').split(':').map(Number); const manifestPath = path.resolve('creatives/manifest.json'); fs.mkdirSync(path.dirname(manifestPath), { recursive: true }); const current = json(manifestPath, null); save(manifestPath, buildManifest(current, { file: path.relative(path.dirname(manifestPath), path.resolve(job.out)).replaceAll('\\', '/'), hook: '', width, height, status: 'rendered', format: 'mp4' })); }
  console.log(JSON.stringify(job, null, 2));
}
if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
