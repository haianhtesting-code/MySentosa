const fs = require('fs');

const path = 'src/app/nops/new/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Very rough regex to find opening divs
  const opens = [...line.matchAll(/<div(\s|>)/g)];
  for (let match of opens) {
    stack.push(i + 1);
  }
  
  // Find closing divs
  const closes = [...line.matchAll(/<\/div>/g)];
  for (let match of closes) {
    if (stack.length > 0) {
      stack.pop();
    }
  }
}

console.log('Unclosed div lines:', stack);
