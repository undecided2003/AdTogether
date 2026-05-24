const fs = require('fs');
const path = require('path');

const p = 'node_modules/next/dist/cli/next-build.js';
if (fs.existsSync(p)) {
  const content = fs.readFileSync(p, 'utf8');
  console.log('Found next-build.js CLI implementation!');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('webpack') || line.includes('turbopack') || line.includes('turbo')) {
      console.log(`${idx}: ${line.trim()}`);
    }
  });
} else {
  console.log('next-build.js does not exist');
}
