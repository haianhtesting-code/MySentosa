const fs = require('fs');
const path = 'src/app/nops/new/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace lines 2356 and 2357 and the comment at 2359
content = content.replace(/                  <\/div>\r?\n                <\/div>\r?\n              \)\}\r?\n\r?\n              \{\/\* Step 2: Location & Triggers with Embedded Map \*\/\}/g, '                  </div>');

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced');
