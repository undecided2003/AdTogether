const fs = require('fs');
const path = require('path');

function searchCalls(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' || dir.includes('next')) {
        searchCalls(fullPath);
      }
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('parseBundlerArgs')) {
        console.log(`Found call in ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('parseBundlerArgs')) {
            console.log(`${idx}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchCalls('node_modules/next/dist');
