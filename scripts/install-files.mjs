import fs from 'node:fs';
import path from 'node:path';

const [src, dest, home] = process.argv.slice(2);
if (!src || !dest || !home) throw new Error('Usage: install-files.mjs <source> <destination> <home>');
const protectedPaths = new Set(['brand/BRAND-BRAIN.md', 'brand/brand.json', 'learnings/LEARNINGS.md']);
function pathExists(file) { try { fs.lstatSync(file); return true; } catch { return false; } }
function sameFile(file, bytes) {
  try { return fs.statSync(file).isFile() && fs.readFileSync(file).equals(bytes); } catch { return false; }
}
function copyTree(source, target, rel = '', skipPersonal = false, resolvePlaceholder = false) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const child = rel ? `${rel}/${entry.name}` : entry.name;
    if (skipPersonal && !rel && entry.name === 'personal') continue;
    if (child === '.git' || child.startsWith('.git/') || child.split('/').includes('node_modules')) continue;
    if (child === '.test-data' || child.startsWith('.test-data/') || child.startsWith('runs/') || protectedPaths.has(child)) continue;
    const from = path.join(source, entry.name), to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to, child, false, resolvePlaceholder);
    else if (entry.isFile()) {
      let content = fs.readFileSync(from);
      if (resolvePlaceholder && from.endsWith('.md')) content = Buffer.from(content.toString('utf8').replaceAll('CONTENT_STUDIO_DIR', dest));
      if (!fs.existsSync(to) || !fs.readFileSync(to).equals(content)) fs.writeFileSync(to, content);
    }
  }
}
function expectedTree(source, ignorePersonal = false, rel = '') {
  const output = new Map();
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (ignorePersonal && !rel && entry.name === 'personal') continue;
    const child = rel ? `${rel}/${entry.name}` : entry.name, full = path.join(source, entry.name);
    if (child === '.git' || child.startsWith('.git/') || child.split('/').includes('node_modules') || child === '.test-data' || child.startsWith('.test-data/') || child.startsWith('runs/') || protectedPaths.has(child)) continue;
    if (entry.isDirectory()) for (const [name, bytes] of expectedTree(full, false, child)) output.set(name, bytes);
    else if (entry.isFile()) {
      let bytes = fs.readFileSync(full);
      if (full.endsWith('.md')) bytes = Buffer.from(bytes.toString('utf8').replaceAll('CONTENT_STUDIO_DIR', dest));
      output.set(child, bytes);
    }
  }
  return output;
}
function actualTree(directory, ignorePersonal = false, rel = '') {
  const output = new Map();
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignorePersonal && !rel && entry.name === 'personal') continue;
    const child = rel ? `${rel}/${entry.name}` : entry.name, full = path.join(directory, entry.name);
    if (child === '.git' || child.startsWith('.git/') || child.split('/').includes('node_modules') || child === '.test-data' || child.startsWith('.test-data/') || child.startsWith('runs/') || protectedPaths.has(child)) continue;
    if (entry.isDirectory()) for (const [name, bytes] of actualTree(full, false, child)) output.set(name, bytes);
    else if (entry.isFile()) output.set(child, fs.readFileSync(full));
  }
  return output;
}
function sameTree(source, target, ignorePersonal = false) {
  if (!pathExists(target)) return false;
  try { if (!fs.statSync(target).isDirectory()) return false; } catch { return false; }
  const expected = expectedTree(source, ignorePersonal), actual = actualTree(target, ignorePersonal);
  actual.delete('studio-root');
  return expected.size === actual.size && [...expected].every(([name, bytes]) => actual.get(name)?.equals(bytes));
}
function backup(target, name) {
  if (!pathExists(target)) return;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  let saved = `${target}.backup-${stamp}`, suffix = 1;
  while (fs.existsSync(saved)) saved = `${target}.backup-${stamp}-${String(suffix++).padStart(2, '0')}`;
  fs.renameSync(target, saved);
  console.log(`Backed up your existing ${name} to ${saved}`);
  return saved;
}
function safeSkill(source, target, label, ignorePersonal = false) {
  if (pathExists(target) && !sameTree(source, target, ignorePersonal)) backup(target, label);
  copyTree(source, target, '', false, true);
  const marker = path.join(target, 'studio-root'), markerBytes = Buffer.from(`${dest}\n`);
  if (!sameFile(marker, markerBytes)) fs.writeFileSync(marker, markerBytes);
}
function copyPersonal(source, target) {
  if (!source || !fs.existsSync(source)) return;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name), to = path.join(target, entry.name);
    if (entry.isDirectory()) copyPersonal(from, to);
    else if (!pathExists(to)) fs.copyFileSync(from, to);
  }
}
fs.mkdirSync(dest, { recursive: true });
// In-place install: the source tree is already the install root. Never rewrite
// shipped files there (placeholder substitution belongs only in Claude copies).
const sameRoot = fs.realpathSync(src) === fs.realpathSync(dest);
if (!sameRoot) copyTree(src, dest);
const learnings = path.join(dest, 'learnings/LEARNINGS.md');
if (!pathExists(learnings)) {
  fs.mkdirSync(path.dirname(learnings), { recursive: true });
  fs.copyFileSync(path.join(src, 'learnings/LEARNINGS.template.md'), learnings);
}
const skills = path.join(home, '.claude/skills'), agents = path.join(home, '.claude/agents');
fs.mkdirSync(skills, { recursive: true }); fs.mkdirSync(agents, { recursive: true });
safeSkill(path.join(dest, 'skill'), path.join(skills, 'content-studio'), 'content-studio');
safeSkill(path.join(dest, 'tools/ad-images'), path.join(skills, 'ad-images'), 'ad-images');
safeSkill(path.join(dest, 'tools/heygen-ad-videos'), path.join(skills, 'heygen-ad-videos'), 'heygen-ad-videos');
safeSkill(path.join(dest, 'tools/launch-video/brag'), path.join(skills, 'brag'), 'brag');
safeSkill(path.join(dest, 'tools/launch-video/brag-slim'), path.join(skills, 'brag-slim'), 'brag-slim');
const hook = path.join(skills, 'hooklab'), hookSource = path.join(dest, 'tools/hooklab');
const priorHook = pathExists(hook) && !sameTree(hookSource, hook, true) ? backup(hook, 'hooklab') : null;
copyTree(hookSource, hook, '', true, true);
copyPersonal(priorHook && path.join(priorHook, 'personal'), path.join(hook, 'personal'));
copyPersonal(path.join(hookSource, 'personal'), path.join(hook, 'personal'));
for (const entry of fs.readdirSync(path.join(dest, 'agents'), { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.startsWith('content-') || !entry.name.endsWith('.md')) continue;
  const source = path.join(dest, 'agents', entry.name), target = path.join(agents, entry.name);
  const bytes = Buffer.from(fs.readFileSync(source, 'utf8').replaceAll('CONTENT_STUDIO_DIR', dest));
  if (pathExists(target) && !sameFile(target, bytes)) backup(target, entry.name);
  if (!sameFile(target, bytes)) fs.writeFileSync(target, bytes);
}
