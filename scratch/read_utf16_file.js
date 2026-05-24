const fs = require('fs');
if (fs.existsSync('firebase-deploy.log')) {
  const content = fs.readFileSync('firebase-deploy.log', 'utf-16le');
  console.log('Includes Turbopack:', content.includes('Turbopack'));
  console.log('Includes webpack:', content.includes('webpack'));
  console.log('Includes next build:', content.includes('next build'));
  
  // Let's find lines around "Compiled successfully" or "Next.js"
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('Compiled') || line.includes('Next.js') || line.includes('turbopack') || line.includes('webpack') || line.includes('build')) {
      console.log(`${idx}: ${line.trim()}`);
    }
  });
} else {
  console.log('firebase-deploy.log does not exist');
}
