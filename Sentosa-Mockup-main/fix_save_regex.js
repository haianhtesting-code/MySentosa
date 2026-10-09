const fs = require('fs');
const path = 'src/lib/nopData.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /export function saveStoredNops\(\s*data:\s*NOPApplication\[\]\s*\):\s*void\s*\{\s*nopsCache\s*=\s*data;\s*\}/g;

if (regex.test(content)) {
  content = content.replace(regex, `export function saveStoredNops(data: NOPApplication[]): void {
  nopsCache = data;
  if (typeof window !== 'undefined') {
    fetch('/api/nop-data?col=nops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(console.error);
  }
}`);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Fixed saveStoredNops with Regex');
} else {
  console.log('Could not find saveStoredNops block with regex either');
}
