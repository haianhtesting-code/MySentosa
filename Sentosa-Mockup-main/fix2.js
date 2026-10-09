const fs = require('fs');

let path = 'src/lib/nopData.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('fetchNopsFromMongo')) {
  content = content + `
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
`;
  fs.writeFileSync(path, content, 'utf8');
}

path = 'src/lib/nopAudit.ts';
content = fs.readFileSync(path, 'utf8');
if (!content.includes('let auditCache: string | null = null;')) {
  content = content.replace('export const STORAGE_KEY', 'let auditCache: string | null = null;\nexport const STORAGE_KEY');
  fs.writeFileSync(path, content, 'utf8');
}

console.log('Fixed');
