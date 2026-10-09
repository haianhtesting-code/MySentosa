const fs = require('fs');
const path = 'src/app/nops/[...id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove Quick Actions SidebarCard
const actionsBlockStart = `          {(() => {
            // SEC-04 & P0-03: Technical enforcement roles`;
const actionsBlockEnd = `              </SidebarCard>
            );
          })()}`;

const actionsStartIdx = content.indexOf(actionsBlockStart);
if (actionsStartIdx !== -1) {
  const actionsEndIdx = content.indexOf(actionsBlockEnd) + actionsBlockEnd.length;
  content = content.substring(0, actionsStartIdx) + content.substring(actionsEndIdx);
} else {
  console.log("Could not find actions block to remove");
}

// 2. Add actionsHeader next to canDownloadCertificate
const actionsHeader = `
          {/* Quick Actions moved to Header */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
            {isContractor && hasNopPermission(role, "nop.request_extension") && nop.applicationStatus === "Approved" && (derivedStatus === "Upcoming" || derivedStatus === "Active" || derivedStatus === "Suspended") && !(nop.extensionRequests || []).some((r) => r.status === "Approved" || r.status === "Pending Pre-screening" || r.status === "Under Approver Review") && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowExtensionModal(true); setExtensionEndDate(""); setExtensionReason(""); setExtensionError(null); }}>
                <IconCalendar size={13} strokeWidth={2} /> Request 1-Month Extension
              </button>
            )}
            {isAssignedApproverOrAdmin && hasNopPermission(role, "nop.lift_suspension") && nop.applicationStatus === "Approved" && derivedStatus === "Suspended" && (
              <button className="btn btn-success btn-sm" onClick={handleLiftSuspension} style={{ background: "#10B981", border: "none" }}>
                <IconCheckCircle size={13} strokeWidth={2.5} /> Lift Suspension
              </button>
            )}
            {isAssignedApproverOrAdmin && hasNopPermission(role, "nop.suspend_permit") && nop.applicationStatus === "Approved" && derivedStatus === "Active" && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSuspensionModal(true)} style={{ color: "#EF4444" }}>
                <IconAlertOctagon size={13} strokeWidth={2.2} /> Issue Stop-Work Suspension
              </button>
            )}
            {isAssignedApproverOrAdmin && hasNopPermission(role, "nop.revoke_permit") && nop.applicationStatus === "Approved" && (derivedStatus === "Upcoming" || derivedStatus === "Active" || derivedStatus === "Suspended") && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setRevokeReason(""); setShowRevokeModal(true); }} style={{ color: "#EF4444" }}>
                <IconBan size={13} strokeWidth={2.2} /> Revoke Permit
              </button>
            )}
            {isContractor && hasNopPermission(role, "nop.request_cancel") && nop.applicationStatus === "Approved" && (derivedStatus === "Upcoming" || derivedStatus === "Active" || derivedStatus === "Suspended") && !nop.cancellationRequest && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setCancelReason(""); setShowCancelModal(true); }}>
                <IconX size={13} strokeWidth={2.2} /> Request Cancellation
              </button>
            )}
            {isContractor && (nop.applicationStatus === "Under Review" || nop.applicationStatus === "Change Requested") && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowWithdrawModal(true)} style={{ color: "#DC2626" }}>
                <IconX size={13} strokeWidth={2.2} /> Withdraw Application
              </button>
            )}
          </div>
`;

content = content.replace(
  '{canDownloadCertificate && (',
  `${actionsHeader}\n        {canDownloadCertificate && (`
);

// 3. Extract Location & Schedule SidebarCard
const locStart = `<SidebarCard title="Location & Schedule">`;
const locEnd = `</SidebarCard>`;
let locationContent = '';
const locStartIdx = content.indexOf(locStart);
if (locStartIdx !== -1) {
  const locEndIdx = content.indexOf(locEnd, locStartIdx) + locEnd.length;
  locationContent = content.substring(locStartIdx + locStart.length, content.indexOf(locEnd, locStartIdx));
  content = content.substring(0, locStartIdx) + content.substring(locEndIdx);
} else {
  console.log("Could not find Location & Schedule SidebarCard");
}

// 4. Extract activeTab === "audit" block
const auditStartMarker = `{activeTab === "audit" && (`;
let auditContent = '';
const auditStartIdx = content.indexOf(auditStartMarker);
if (auditStartIdx !== -1) {
  // we know it ends with NopAuditLog nopId={nop.id} /></div>)}
  const auditEndMarkerStr = `/>\n              </div>\n            )}`;
  const auditEndIdx = content.indexOf(auditEndMarkerStr, auditStartIdx) + auditEndMarkerStr.length;
  // Get just the inner content for Audit
  auditContent = content.substring(auditStartIdx, auditEndIdx);
  // Remove it from current place
  content = content.substring(0, auditStartIdx) + content.substring(auditEndIdx);
} else {
  console.log("Could not find Audit tab block");
}

// 5. Insert Location Tab content right after overview tab end
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
