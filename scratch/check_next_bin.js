const fs = require('fs');
const path = require('path');

function searchInNextBin() {
  const binPath = 'node_modules/next/dist/bin/next-build';
  if (fs.existsSync(binPath)) {
    const content = fs.readFileSync(binPath, 'utf8');
    console.log('Found next-build bin file!');
    // Let's search for "webpack" or "turbopack" inside it
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('webpack') || line.includes('turbopack') || line.includes('turbo')) {
        console.log(`${idx}: ${line.trim()}`);
      }
    });
  } else {
    // Let's search inside next/dist/lib/commands.js or next/dist/bin/next
    const nextBin = 'node_modules/next/dist/bin/next';
    if (fs.existsSync(nextBin)) {
      const content = fs.readFileSync(nextBin, 'utf8');
      console.log('Found next bin file!');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('webpack') || line.includes('turbopack') || line.includes('turbo')) {
          console.log(`${idx}: ${line.trim()}`);
        }
      });
    }
  }
}

searchInNextBin();
