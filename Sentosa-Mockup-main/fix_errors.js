const fs = require('fs');
const path = 'src/app/nops/[...id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove bad buttons
const btn1Start = `{isLiaisonOfficerAssigned && nop.applicationStatus === "Under Review" && nop.loPreScreenStatus === "Pending Pre-screening" && (`;
const btn1End = `</button>\n            )}`;
const b1Start = content.indexOf(btn1Start);
if (b1Start !== -1) {
  content = content.substring(0, b1Start) + content.substring(content.indexOf(btn1End, b1Start) + btn1End.length);
}

const btn2Start = `{isAssignedApproverOrAdmin && nop.applicationStatus === "Under Review" && nop.loPreScreenStatus === "Cleared for Approval" &&`;
const btn2End = `))
            )}`;
const b2Start = content.indexOf(btn2Start);
if (b2Start !== -1) {
  content = content.substring(0, b2Start) + content.substring(content.indexOf(btn2End, b2Start) + btn2End.length);
}

// 2. Remove activeTab === "audit" block
const auditRegex = /\{\s*activeTab === "audit" && \([\s\S]*?\}\s*\)/;
content = content.replace(auditRegex, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed compile errors.');
