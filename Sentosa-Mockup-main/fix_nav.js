const fs = require('fs');
const path = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('      </nav>\n\n        {/* Administration Section */}', '        {/* Administration Section */}');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed nav tag');
