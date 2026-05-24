const fs = require('fs');

const p = 'node_modules/next/dist/lib/bundler.js';
if (fs.existsSync(p)) {
  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (idx >= 25 && idx < 80) {
      console.log(`${idx}: ${line.trim()}`);
    }
  });
}
