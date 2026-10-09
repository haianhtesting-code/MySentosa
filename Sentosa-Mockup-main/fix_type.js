const fs = require('fs');
const path = 'src/app/nops/[...id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const handleDomainApprove = (domain) => {',
  'const handleDomainApprove = (domain: string) => {'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed type');
