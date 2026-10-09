const fs = require('fs');
const path = 'src/app/nops/[...id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Extract Location & Schedule SidebarCard
const locStart = `<SidebarCard title="Location & Schedule">`;
const locEnd = `</SidebarCard>`;
let locationContent = '';
const locStartIdx = content.indexOf(locStart);
if (locStartIdx !== -1) {
  const locEndIdx = content.indexOf(locEnd, locStartIdx) + locEnd.length;
  locationContent = content.substring(locStartIdx + locStart.length, content.indexOf(locEnd, locStartIdx));
  content = content.substring(0, locStartIdx) + content.substring(locEndIdx);
}

// 2. Extract activeTab === "audit" block
const auditStartMarker = `{activeTab === "audit" && (`;
const auditStartIdx = content.indexOf(auditStartMarker);
let auditContent = '';
if (auditStartIdx !== -1) {
  const auditEndMarkerStr = `/>\n              </div>\n            )}`;
  const auditEndIdx = content.indexOf(auditEndMarkerStr, auditStartIdx) + auditEndMarkerStr.length;
  content = content.substring(0, auditStartIdx) + content.substring(auditEndIdx);
}

// 3. Insert Location Tab content right after overview tab end
const locationTabHTML = `
            {activeTab === "location" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "20px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0", color: "var(--text-main)" }}>Location & Schedule</h3>
                  <div style={{ padding: "16px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    ${locationContent}
                  </div>
                </div>

                <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "20px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0", color: "var(--text-main)" }}>Work Boundary Map</h3>
                  <div style={{ height: "300px", background: "#E2E8F0", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #CBD5E1", overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "url('/sentosa-map.svg')", backgroundSize: "cover", backgroundPosition: "center" }}></div>
                    <div style={{ position: "relative", textAlign: "center", zIndex: 10 }}>
                      <IconMap size={32} color="#64748B" style={{ marginBottom: "8px" }} />
                      <div style={{ fontSize: "13px", color: "#475569", fontWeight: 600 }}>Boundary Map Integration</div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>Displays standard operational map layers for {nop.zone}</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "20px", border: "1px solid var(--border-color)" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--text-main)" }}>Audit Trail</h3>
                  <NopAuditLog nopId={nop.id} />
                </div>
              </div>
            )}
`;

const overviewEndMarkerStr = `</div>\n            )}\n`;
const overviewStartStr = `{activeTab === "overview" && (`;
const overviewStartIdx = content.indexOf(overviewStartStr);
if (overviewStartIdx !== -1) {
  const overviewEndIdx = content.indexOf(overviewEndMarkerStr, overviewStartIdx) + overviewEndMarkerStr.length;
  content = content.substring(0, overviewEndIdx) + locationTabHTML + content.substring(overviewEndIdx);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Script ran ok');
