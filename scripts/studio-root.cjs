'use strict';

const fs = require('node:fs');
const path = require('node:path');

function validRoot(directory) {
  return fs.existsSync(path.join(directory, 'VERSION')) && fs.existsSync(path.join(directory, 'DIRECTOR.md'));
}

function resolveStudioRoot(scriptDirectory, standaloneDirectory = scriptDirectory) {
  if (process.env.CONTENT_STUDIO_DIR) return path.resolve(process.env.CONTENT_STUDIO_DIR);
  // Installed skills can live below a source checkout in tests; their marker must win over that checkout ancestor.
  try {
    const root = fs.readFileSync(path.join(standaloneDirectory, 'studio-root'), 'utf8').trim();
    if (root && validRoot(root)) return path.resolve(root);
  } catch {}
  let current = path.resolve(scriptDirectory);
  for (;;) {
    if (validRoot(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

module.exports = { resolveStudioRoot };
