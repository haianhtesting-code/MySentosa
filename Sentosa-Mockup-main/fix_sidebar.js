const fs = require('fs');

const path = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Rename 'NOP' to 'No Objection Permit' in NAV_GROUPS
content = content.replace(
  "{ name: 'NOP',             path: '/nops'",
  "{ name: 'No Objection Permit',             path: '/nops'"
);

const blockStartStr = `      <nav className="nav-scroll">`;
const blockEndStr = `        {/* Administration Section */}`;

const startIndex = content.indexOf(blockStartStr);
const endIndex = content.indexOf(blockEndStr);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `${blockStartStr}
        {NAV_GROUPS.map(group => {
          const isRestrictedRole = role === 'Applicant (Contractor)' || role === 'Stakeholder Manager';
          if (isRestrictedRole && group.label !== 'Planning') return null;

          const visibleItems = group.items.filter(item => {
            if (isRestrictedRole && item.path !== '/nops') return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="nav-group">
              {!isCollapsed && <div className="nav-group-label">{isRestrictedRole ? 'No Objection Permit' : group.label}</div>}
              {visibleItems.map(item => {
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={\`nav-item \${isActive(item.path) ? 'active' : ''}\`}
                  >
                    <Icon d={item.d} d2={item.d2} />
                    <span className="nav-label">{item.name}</span>
                    {isCollapsed && <span className="nav-tooltip">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

`;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Sidebar.tsx updated successfully');
} else {
  console.log('Could not find Nav block:', {
    startFound: startIndex !== -1,
    endFound: endIndex !== -1
  });
}
