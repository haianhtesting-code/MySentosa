const fs = require('fs');

const path = 'src/app/nops/new/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find start of footer
let footerStart = -1;
let footerEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* Wizard Footer Buttons')) {
    footerStart = i;
  }
  if (footerStart !== -1 && lines[i].startsWith('}')) {
    footerEnd = i;
    break;
  }
}

if (footerStart !== -1 && footerEnd !== -1) {
  const footerLines = lines.splice(footerStart, footerEnd - footerStart + 1);
  
  // Remove the dangling comment at the end if it's there
  while (lines[lines.length - 1].trim() === '' || lines[lines.length - 1].includes('Step 3: Supporting Documents')) {
    lines.pop();
  }
  
  lines = lines.concat(footerLines);
  
  fs.writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('Fixed');
} else {
  console.log('Could not find footer');
}
