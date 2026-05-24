const fs = require('fs');

const path1 = 'node_modules/next/dist/server/config-shared.js';
if (fs.existsSync(path1)) {
  const content = fs.readFileSync(path1, 'utf8');
  console.log('Includes turbopack config options:');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('turbopack') || line.includes('turbo')) {
      console.log(`${idx}: ${line.trim()}`);
    }
  });
} else {
  console.log('config-shared.js does not exist');
}
