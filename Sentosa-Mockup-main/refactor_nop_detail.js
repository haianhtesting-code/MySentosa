const fs = require('fs');

const path = 'src/app/nops/[...id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Move Action permission logic to the top
const permissionsLogic = `
  const isAssignedApproverOrAdmin =
    role === "NOP Operations Admin" ||
    (role === "Technical Approver" && (
      hasNopPermission(role, "nop.view_all") ||
      nop?.domainApprovals?.some((a) =>
        a.approverName === username ||
        a.approverName?.includes(username || "") ||
        (approverDept && (a.departmentId === approverDept || a.approverGroup?.toLowerCase().includes(approverDept.toLowerCase())))
      )
    ));

  const isContractor = isContractorApplicant({ role, username, companyName: company, canActAsApplicant }, nop || undefined);
  const isLiaisonOfficerAssigned = role === "Liaison Officer" && nop?.sdcLiaisonOfficer && (
    nop.sdcLiaisonOfficer.toLowerCase().includes(username?.toLowerCase() || "") ||
    (username && username.toLowerCase().includes(nop.sdcLiaisonOfficer.toLowerCase()))
  );
`;

content = content.replace(
  'const isApplicant = isContractorApplicant({ role, username, companyName: company, canActAsApplicant }, nop || undefined);',
  `const isApplicant = isContractorApplicant({ role, username, companyName: company, canActAsApplicant }, nop || undefined);\n${permissionsLogic}`
);


// 2. Remove Quick Actions SidebarCard and generate the actions block
const actionsBlockStart = `          {(() => {\n            // SEC-04 & P0-03: Technical enforcement roles`;
const actionsBlockEnd = `              </SidebarCard>\n            );\n          })()}`;
const actionsStartIdx = content.indexOf(actionsBlockStart);
const actionsEndIdx = content.indexOf(actionsBlockEnd) + actionsBlockEnd.length;

if (actionsStartIdx !== -1 && actionsEndIdx !== -1) {
  content = content.substring(0, actionsStartIdx) + content.substring(actionsEndIdx);
}

// Create the actions header block
const actionsHeader = `
          {/* Quick Actions moved to Header */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {isLiaisonOfficerAssigned && nop.applicationStatus === "Under Review" && nop.loPreScreenStatus === "Pending Pre-screening" && (
              <button className="btn btn-success btn-sm" onClick={handleLOPreScreenApprove} style={{ background: "#10B981", border: "none" }}>
                <IconCheckCircle size={13} strokeWidth={2.5} /> Clear LO Pre-Screening
              </button>
            )}
            {isAssignedApproverOrAdmin && nop.applicationStatus === "Under Review" && nop.loPreScreenStatus === "Cleared for Approval" && nop.domainApprovals?.some((a) => a.status === "Pending" && (a.approverName === username || a.approverName?.includes(username || "") || (approverDept && (a.departmentId === approverDept || a.approverGroup?.toLowerCase().includes(approverDept.toLowerCase()))))) && (
              nop.domainApprovals.filter(a => a.status === "Pending" && (a.approverName === username || a.approverName?.includes(username || "") || (approverDept && (a.departmentId === approverDept || a.approverGroup?.toLowerCase().includes(approverDept.toLowerCase()))))).map(da => (
                <button key={da.domain} className="btn btn-success btn-sm" onClick={() => handleDomainApprove(da.domain)} style={{ background: "#10B981", border: "none" }}>
                  <IconCheckCircle size={13} strokeWidth={2.5} /> Approve Domain: {da.domain}
                </button>
              ))
            )}
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

// Insert the quick actions next to Certificate
content = content.replace(
  '{canDownloadCertificate && (',
  `${actionsHeader}\n        {canDownloadCertificate && (`
);


// 3. Update tabs array
content = content.replace(
  '{ key: "overview", label: "Overview" },',
  '{ key: "overview", label: "Overview" },\n    { key: "location", label: "Location" },'
);
content = content.replace(
  '    { key: "audit", label: "Audit Trail" }\n  ];',
  '  ]; // audit moved to location'
);


// 4. Extract Location SidebarCard
const locStart = `<SidebarCard title="Location & Schedule">`;
const locEnd = `</SidebarCard>`;
let locationContent = '';
const locStartIdx = content.indexOf(locStart);
if (locStartIdx !== -1) {
  const locEndIdx = content.indexOf(locEnd, locStartIdx) + locEnd.length;
  locationContent = content.substring(locStartIdx + locStart.length, content.indexOf(locEnd, locStartIdx));
  content = content.substring(0, locStartIdx) + content.substring(locEndIdx);
}


// 5. Build Location Tab
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

// 6. Remove Audit tab block and insert Location tab
const auditTabStart = `{activeTab === "audit" && (`
const auditTabEnd = `            )}\n`

const auditStartIdx = content.indexOf(auditTabStart);
if (auditStartIdx !== -1) {
  // Find closing )}
  const afterAudit = content.substring(auditStartIdx);
  const endMatch = afterAudit.indexOf('            )}\n');
  if (endMatch !== -1) {
    content = content.substring(0, auditStartIdx) + locationTabHTML + content.substring(auditStartIdx + endMatch + 15);
  }
}

// 7. Add Download button to documents
content = content.replace(
  '<span>{doc.name}</span>',
  '<a href="#" onClick={(e) => { e.preventDefault(); window.open(`/uploads/\${doc.name}`, "_blank"); }} style={{ color: "var(--color-primary)", textDecoration: "underline", cursor: "pointer" }}>{doc.name}</a>'
);
content = content.replace(
  '{doc.status}\n                        </span>',
  `{doc.status}\n                        </span>\n                        <button className="btn btn-secondary btn-sm" onClick={() => window.open(\`/uploads/\${doc.name}\`, '_blank')} title="Download Document" style={{ padding: "4px" }}>\n                          <IconDownload size={14} />\n                        </button>\n                      </div>`
);
content = content.replace(
  '<span className={`badge ${doc.status === "Verified" ? "badge-onsite" : doc.status === "Overdue" ? "badge-high" : "badge-review"}`}>',
  '<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>\n<span className={`badge ${doc.status === "Verified" ? "badge-onsite" : doc.status === "Overdue" ? "badge-high" : "badge-review"}`}>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done refactoring');
