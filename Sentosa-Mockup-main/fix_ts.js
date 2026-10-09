const fs = require('fs');

function replaceInFile(path, modifier) {
  let content = fs.readFileSync(path, 'utf8');
  content = modifier(content);
  fs.writeFileSync(path, content, 'utf8');
}

// FIX IMPORTS
const files = ['src/app/nops/page.tsx', 'src/app/nops/[...id]/page.tsx', 'src/app/nops/new/page.tsx', 'src/app/admin/nop-config/page.tsx'];
for (const file of files) {
  replaceInFile(file, (content) => {
    // Remove the bad import
    content = content.replace("import {\n  fetchNopsFromMongo,", "import {");
    
    // Add to the right import
    if (!content.includes('fetchNopsFromMongo')) {
      content = content.replace('loadStoredNops,', 'loadStoredNops,\n  fetchNopsFromMongo,');
    }
    return content;
  });
}

// FIX MISSING VARIABLES
replaceInFile('src/lib/checklistTemplates.ts', (content) => {
  if (!content.includes('let templateCache: string | null = null;')) {
    content = content.replace('export const CHECKLIST_TEMPLATES_STORAGE_KEY', 'let templateCache: string | null = null;\nexport const CHECKLIST_TEMPLATES_STORAGE_KEY');
  }
  return content;
});

replaceInFile('src/lib/nopAudit.ts', (content) => {
  if (!content.includes('let auditCache: string | null = null;')) {
    content = content.replace('export const STORAGE_KEY', 'let auditCache: string | null = null;\nexport const STORAGE_KEY');
  }
  return content;
});

replaceInFile('src/lib/nopNotifications.ts', (content) => {
  if (!content.includes('let notifSettingsCache: string | null = null;')) {
    content = content.replace('const NOTIF_SETTINGS_STORAGE_KEY', 'let notifSettingsCache: string | null = null;\nlet notifCache: string | null = null;\nconst NOTIF_SETTINGS_STORAGE_KEY');
  }
  return content;
});

replaceInFile('src/lib/nopReminderEngine.ts', (content) => {
  if (!content.includes('let reminderStateCache: string | null = null;')) {
    content = content.replace('const REMINDER_STATE_KEY', 'let reminderStateCache: string | null = null;\nlet clockOffsetCache: string | null = null;\nlet docExpiryStateCache: string | null = null;\nconst REMINDER_STATE_KEY');
  }
  return content;
});

console.log('Fixed TypeScript errors');
