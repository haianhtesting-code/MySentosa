const fs = require('fs');

function replaceInFile(path, replacer) {
  let content = fs.readFileSync(path, 'utf8');
  content = replacer(content);
  fs.writeFileSync(path, content, 'utf8');
}

// 1. nopAudit.ts
replaceInFile('src/lib/nopAudit.ts', (content) => {
  content = content.replace('const raw = localStorage.getItem("sentosa_nops_master_registry_v1");', 'const raw = null;');
  
  if (!content.includes('let auditCache: string | null = null;')) {
    content = content.replace('export const STORAGE_KEY = "sdc_nops_audit_trail_v2";', 'export const STORAGE_KEY = "sdc_nops_audit_trail_v2";\nlet auditCache: string | null = null;');
  }
  
  content = content.replace('const raw = localStorage.getItem(STORAGE_KEY);', 'const raw = auditCache;');
  content = content.replace('localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));', 'auditCache = JSON.stringify(updated);');
  return content;
});

// 2. nopNotifications.ts
replaceInFile('src/lib/nopNotifications.ts', (content) => {
  if (!content.includes('let notifSettingsCache: string | null = null;')) {
    content = content.replace('const NOTIF_SETTINGS_STORAGE_KEY = "sdc_nops_notif_settings_v1";', 'const NOTIF_SETTINGS_STORAGE_KEY = "sdc_nops_notif_settings_v1";\nlet notifSettingsCache: string | null = null;\nlet notifCache: string | null = null;');
  }
  
  content = content.replace('const raw = localStorage.getItem(NOTIF_SETTINGS_STORAGE_KEY);', 'const raw = notifSettingsCache;');
  content = content.replace('localStorage.setItem(NOTIF_SETTINGS_STORAGE_KEY, JSON.stringify(settings));', 'notifSettingsCache = JSON.stringify(settings);');
  
  content = content.replace('const raw = localStorage.getItem(NOTIF_STORAGE_KEY);', 'const raw = notifCache;');
  content = content.replace('localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));', 'notifCache = JSON.stringify(INITIAL_NOTIFICATIONS);');
  content = content.replace('localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs));', 'notifCache = JSON.stringify(notifs);');
  content = content.replace('localStorage.removeItem(NOTIF_STORAGE_KEY);', 'notifCache = null;');
  
  content = content.replace('const raw = localStorage.getItem(STORAGE_KEY);', 'const raw = null;'); // clear old stuff
  
  return content;
});

// 3. nopReminderEngine.ts
replaceInFile('src/lib/nopReminderEngine.ts', (content) => {
  if (!content.includes('let reminderStateCache: string | null = null;')) {
    content = content.replace('const REMINDER_STATE_KEY = "sdc_nops_reminder_state_v1";', 'const REMINDER_STATE_KEY = "sdc_nops_reminder_state_v1";\nlet reminderStateCache: string | null = null;\nlet clockOffsetCache: string | null = null;\nlet docExpiryStateCache: string | null = null;');
  }
  
  content = content.replace('const raw = localStorage.getItem(REMINDER_STATE_KEY);', 'const raw = reminderStateCache;');
  content = content.replace('localStorage.setItem(REMINDER_STATE_KEY, JSON.stringify(state));', 'reminderStateCache = JSON.stringify(state);');
  
  content = content.replace('return Number(localStorage.getItem(CLOCK_OFFSET_KEY) || "0") || 0;', 'return Number(clockOffsetCache || "0") || 0;');
  content = content.replace('localStorage.setItem(CLOCK_OFFSET_KEY, String(Math.max(0, ms)));', 'clockOffsetCache = String(Math.max(0, ms));');
  
  content = content.replace('const raw = localStorage.getItem(DOC_EXPIRY_STATE_KEY);', 'const raw = docExpiryStateCache;');
  content = content.replace('localStorage.setItem(DOC_EXPIRY_STATE_KEY, JSON.stringify(state));', 'docExpiryStateCache = JSON.stringify(state);');
  
  return content;
});

// 4. RoleContext.tsx
replaceInFile('src/context/RoleContext.tsx', (content) => {
  // Remove localStorage reading entirely
  content = content.replace("let savedRole = localStorage.getItem('sentosa_cms_role') as UserRole;", "let savedRole = null as any;");
  content = content.replace("const savedUsername = localStorage.getItem('sentosa_cms_username');", "const savedUsername = null;");
  content = content.replace("const savedDept = localStorage.getItem('sentosa_cms_approver_dept');", "const savedDept = null;");
  
  // Remove localStorage setting entirely
  content = content.replace("localStorage.setItem('sentosa_cms_approver_dept', newDept);", "");
  content = content.replace("localStorage.setItem('sentosa_cms_role', newRole);", "");
  content = content.replace("localStorage.setItem('sentosa_cms_username', newUsername);", "");
  
  return content;
});

// 5. Sidebar.tsx
replaceInFile('src/components/Sidebar.tsx', (content) => {
  content = content.replace("const saved = localStorage.getItem('sidebar_collapsed') === 'true';", "const saved = false;");
  content = content.replace("localStorage.setItem('sidebar_collapsed', 'true');", "");
  content = content.replace("localStorage.setItem('sidebar_collapsed', 'false');", "");
  return content;
});

// 6. checklistTemplates.ts
replaceInFile('src/lib/checklistTemplates.ts', (content) => {
  if (!content.includes('let templateCache: string | null = null;')) {
    content = content.replace('export const CHECKLIST_TEMPLATES_STORAGE_KEY = "sdc_nops_checklist_templates_v2";', 'export const CHECKLIST_TEMPLATES_STORAGE_KEY = "sdc_nops_checklist_templates_v2";\nlet templateCache: string | null = null;');
  }
  content = content.replace('const stored = localStorage.getItem(CHECKLIST_TEMPLATES_STORAGE_KEY);', 'const stored = templateCache;');
  content = content.replace('localStorage.setItem(CHECKLIST_TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_CHECKLIST_TEMPLATES));', 'templateCache = JSON.stringify(DEFAULT_CHECKLIST_TEMPLATES);');
  content = content.replace('localStorage.setItem(CHECKLIST_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));', 'templateCache = JSON.stringify(templates);');
  return content;
});

// 7. groups.ts
replaceInFile('src/lib/groups.ts', (content) => {
  if (!content.includes('let groupsCache: string | null = null;')) {
    content = content.replace('export const STORAGE_KEY = "sentosa_cms_tdg_v3";', 'export const STORAGE_KEY = "sentosa_cms_tdg_v3";\nlet groupsCache: string | null = null;');
  }
  content = content.replace('const raw = localStorage.getItem(STORAGE_KEY);', 'const raw = groupsCache;');
  content = content.replace('localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));', 'groupsCache = JSON.stringify(updated);');
  content = content.replace('localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GROUPS));', 'groupsCache = JSON.stringify(DEFAULT_GROUPS);');
  return content;
});

console.log('localStorage removed from the core logic');
