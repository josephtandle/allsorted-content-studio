import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const banned = [new RegExp('\\/'+'Users'+'\\/','i'), new RegExp('my'+'os','i'), new RegExp('new'+'york'+'1','i'), new RegExp('joe'+'@','i'), new RegExp('@'+'gmail','i'), new RegExp('il'+'ly','i'), new RegExp('c49fe3fb28c548a4'+'9e5122ba89d272b0','i'), new RegExp('9c42c4e2c6d44fcb'+'9ed7cd2a630caa3d','i'), /\b\d{15,}\b/];
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
test('package text contains no private paths, keys, or personal identifiers', () => {
  const all = files(root);
  const envFiles = all.filter(f => path.basename(f) === '.env');
  const offenders = all.filter(f => !f.includes(`${path.sep}tests${path.sep}`) && !f.endsWith('.gitignore'))
    .filter(f => !f.endsWith('.mp4') && !f.endsWith('.png'))
    .filter(f => banned.some(re => re.test(fs.readFileSync(f, 'utf8'))));
  assert.deepEqual([...envFiles, ...offenders].map(f => path.relative(root, f)), []);
});
