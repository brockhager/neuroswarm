const fs = require('fs');
const path = 'c:\\JS\\ns\\neuroswarm\\start-all-nodes.bat';
const s = fs.readFileSync(path, 'utf8');
const lines = s.split(/\r?\n/);
let inQuote = false;
let stack = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote) {
      if (ch === '(') stack++;
      else if (ch === ')') {
        if (stack === 0) {
          console.log(`Unmatched ) at line ${i+1} col ${j+1}`);
          process.exit(0);
        }
        stack--;
      }
    }
  }
  if (i < 120 || i > lines.length - 10) {
    console.log(`line ${i+1}: netStack=${stack}`);
  } else if (i % 50 === 0) {
    console.log(`line ${i+1}: netStack=${stack}`);
  }
}
console.log('Done: netStack=' + stack);
