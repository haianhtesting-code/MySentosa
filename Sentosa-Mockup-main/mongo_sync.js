const fs = require('fs');
const path = 'src/lib/nopData.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'export function loadStoredNops(): NOPApplication[] {\n  if (nopsCache) return nopsCache;\n  return INITIAL_NOPS;\n}',
  `export function loadStoredNops(): NOPApplication[] {
  if (nopsCache) return nopsCache;
  return INITIAL_NOPS;
}

export async function fetchNopsFromMongo(): Promise<NOPApplication[]> {
  try {
    const res = await fetch('/api/nop-data?col=nops');
    if (res.ok) {
      const data = await res.json();
      nopsCache = data;
      return data;
    }
  } catch (err) {
    console.error(err);
  }
  return loadStoredNops();
}
`
);

content = content.replace(
  'export function saveStoredNops(data: NOPApplication[]): void {\n  nopsCache = data;\n}',
  `export function saveStoredNops(data: NOPApplication[]): void {
  nopsCache = data;
  if (typeof window !== 'undefined') {
    fetch('/api/nop-data?col=nops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(console.error);
  }
}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Updated nopData.ts');
