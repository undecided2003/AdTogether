const fs = require('fs');

const p = 'node_modules/next/dist/cli/next-build.js';
if (fs.existsSync(p)) {
  const content = fs.readFileSync(p, 'utf8');
  console.log(content.substring(0, 2000));
}
