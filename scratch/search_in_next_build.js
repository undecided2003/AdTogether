const fs = require('fs');

const p = 'node_modules/next/dist/build/index.js';
if (fs.existsSync(p)) {
  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split('\n');
  let print = false;
  let printCount = 0;
  lines.forEach((line, idx) => {
    // Find where "async function build" starts
    if (line.includes('async function build(')) {
      print = true;
    }
    if (print && printCount < 100) {
      console.log(`${idx}: ${line.trim()}`);
      printCount++;
    }
  });
}
