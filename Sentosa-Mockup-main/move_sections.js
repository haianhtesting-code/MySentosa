const fs = require('fs');

const path = 'src/app/nops/new/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the step wrappers
content = content.replace(/\{step === 2 && \(\r?\n\s*<div style=\{\{ display: "flex", flexDirection: "column", gap: "14px" \}\}>\r?\n/, '');
content = content.replace(/\{step === 3 && \(\r?\n\s*<div style=\{\{ display: "flex", flexDirection: "column", gap: "14px" \}\}>\r?\n/, '');
// We also have to remove their closing tags.
content = content.replace(/<\/div>\r?\n\s*\)\}\r?\n\r?\n\s*\{\/\* Step 3: Supporting Documents/g, '</div>\n\n              {/* Step 3: Supporting Documents');
content = content.replace(/<\/div>\r?\n\s*\)\}\r?\n\r?\n\s*\{\/\* Wizard Footer Buttons/g, '</div>\n\n              {/* Wizard Footer Buttons');


// 2. Extract Work Involvements block
const wiStart = content.indexOf('{/* Work Involvements / Triggers */}');
const wiEndMarker = '{/* Step 3: Supporting Documents & Muster */}';
const wiEnd = content.indexOf(wiEndMarker);

let wiBlock = content.slice(wiStart, wiEnd);
// Remove wiBlock from original
content = content.slice(0, wiStart) + content.slice(wiEnd);

// 3. Extract Documents block
const docsStart = content.indexOf('{/* SUB-03: Urgent NOP Notice with deferrable documents schedule */}');
const docsEndMarker = '{/* NOP Personnel Muster (FRD §4 Personnel Details) */}';
const docsEnd = content.indexOf(docsEndMarker);

let docsBlock = content.slice(docsStart, docsEnd);
content = content.slice(0, docsStart) + content.slice(docsEnd);

// 4. Insert both before Group C
const targetInsert = content.indexOf('{/* Group C Card: Blackout Dates, Night Works & Equipment */}');

content = content.slice(0, targetInsert) + 
          wiBlock + 
          '\n' + docsBlock + 
          '\n' + content.slice(targetInsert);


fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
