import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

test('package contains no personal paths, identifiers, or environment files', () => {
  const banned = [
    '/User' + 's/', 'my' + 'os', 'new' + 'york' + '1', 'jo' + 'e@', '@g' + 'mail', 'il' + 'ly',
    ['j' + 'oe', 'ch' + 'e'].join(' '), new RegExp('\\b' + 'j' + 'oe' + '\\b', 'i'), new RegExp('\\b' + 'master' + 'mind' + '\\b', 'i')
  ];
  const digitId = new RegExp('(?<![0-9])[0-9]{15,}(?![0-9])');
  const envName = '.' + 'env';
  const violations = [];
  for (const file of filesUnder(root)) {
    if (path.basename(file) === envName || path.basename(file).startsWith(`${envName}.`)) violations.push(`${file}: environment file`);
    if (path.extname(file).toLowerCase() === '.png') continue;
    const content = fs.readFileSync(file);
    const text = content.toString('utf8');
    for (const term of banned) if (term instanceof RegExp ? term.test(text) : text.toLowerCase().includes(term.toLowerCase())) violations.push(`${path.relative(root, file)}: personal-data pattern`);
    if (digitId.test(text)) violations.push(`${path.relative(root, file)}: long numeric identifier`);
  }
  assert.deepEqual(violations, []);
});
