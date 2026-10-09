const fs = require('fs');

const path = 'src/lib/nopData.ts';
let content = fs.readFileSync(path, 'utf8');

const oldFunc = `export function saveStoredNops(data: NOPApplication[]): void {
  nopsCache = data;
}`;

const newFunc = `export function saveStoredNops(data: NOPApplication[]): void {
  nopsCache = data;
  if (typeof window !== 'undefined') {
    fetch('/api/nop-data?col=nops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(console.error);
  }
}`;

if (content.includes(oldFunc)) {
  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Fixed saveStoredNops');
} else {
  console.log('Could not find saveStoredNops block');
}
