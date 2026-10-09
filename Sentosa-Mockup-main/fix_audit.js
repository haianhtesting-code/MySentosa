const fs = require('fs');

let path = 'src/lib/nopAudit.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('let auditCache: string | null = null;')) {
  // Try to insert at the top of the file
  content = 'let auditCache: string | null = null;\n' + content;
  fs.writeFileSync(path, content, 'utf8');
}

console.log('Fixed auditCache');
