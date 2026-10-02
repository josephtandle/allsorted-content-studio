import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pollJob } from '../scripts/heygen.mjs';
const testRoot = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), '..', '..', '.test-data', 'heygen');
fs.mkdirSync(testRoot, { recursive: true });

test('restart polling reuses saved job ID and never submits a second job', async () => {
  const dir = fs.mkdtempSync(path.join(testRoot, 'heygen-resume-'));
  const jobsPath = path.join(dir, 'jobs.json');
  const jobs = [{ id: 'video-existing', status: 'waiting' }]; fs.writeFileSync(jobsPath, JSON.stringify(jobs));
  let calls = 0;
  const fetchImpl = async url => { calls++; assert.match(url, /video_status\.get\?video_id=video-existing/); return { ok: true, json: async () => ({ data: { status: 'completed', video_url: 'https://mock/video.mp4' } }) }; };
  const result = await pollJob(jobs[0], { jobs, jobsPath, fetchImpl, maxPolls: 1, intervalMs: 0 });
  assert.equal(result.status, 'completed'); assert.equal(calls, 1);
  assert.equal(JSON.parse(fs.readFileSync(jobsPath)).length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});
