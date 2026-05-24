const fs = require('fs');
const path = require('path');

const logFilePath = 'C:\\Users\\kevin\\.gemini\\antigravity\\brain\\bb3c68c9-950e-4838-9375-28f169a697c0\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logFilePath)) {
  console.log('Log file does not exist');
  process.exit(1);
}

const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

const stepIndices = [105, 109, 131];
lines.forEach((line) => {
  if (line.trim() === '') return;
  try {
    const step = JSON.parse(line);
    if (stepIndices.includes(step.step_index)) {
      console.log(`\n======================= STEP ${step.step_index} (${step.source} - ${step.type}) =======================`);
      console.log(step.content);
    }
  } catch (e) {}
});
