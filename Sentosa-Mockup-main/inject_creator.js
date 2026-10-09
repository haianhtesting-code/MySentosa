const fs = require('fs');
const path = 'src/app/nops/new/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /applicantEmail: newForm\.applicantEmail,(\s+)picName: newForm\.picName,/g,
  `applicantEmail: newForm.applicantEmail,$1creatorUsername: username || newForm.applicantName,$1creatorEmail: currentUser?.email || newForm.applicantEmail,$1picName: newForm.picName,`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced successfully');
