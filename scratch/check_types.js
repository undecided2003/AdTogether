const fs = require('fs');
const path = require('path');

function searchFile(dir, fileName, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' || dir.includes('next')) {
        searchFile(fullPath, fileName, query);
      }
    } else if (file === fileName) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(query)) {
        console.log(`Found in ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(query)) {
            console.log(`${idx}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log('Searching for NextConfig type definitions...');
searchFile('node_modules/next/dist', 'config-shared.d.ts', 'turbopack');
searchFile('node_modules/next/dist', 'config-shared.d.ts', 'turbo');
