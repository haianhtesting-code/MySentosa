const fs = require('fs');
const txt = fs.readFileSync('temp_old_page.tsx', 'utf16le');
const idx = txt.indexOf('SidebarCard title="Quick Actions"');
console.log(txt.substring(idx, idx + 2000));
