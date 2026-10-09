const fs = require('fs');
const path = 'src/app/nops/new/page.tsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');

let depth = 0;
let formStarted = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('<form')) {
    formStarted = true;
    depth = 0;
  }
  
  if (formStarted) {
    const opens = [...line.matchAll(/<div(\s|>)/g)].length;
    const closes = [...line.matchAll(/<\/div>/g)].length;
    
    depth += opens;
    depth -= closes;
    
    if (depth < 0) {
      console.log(`Depth became negative at line ${i + 1}!`);
      break;
    }
    
    // Log when depth returns to 0 after form start
    if (depth === 0 && !line.includes('<form')) {
       console.log(`Depth returned to 0 at line ${i + 1}`);
    }
  }
}
