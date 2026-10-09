const fs = require('fs');
const path = 'src/app/nops/[...id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Insert Handlers before handleLiftSuspension
content = content.replace(
  '  const handleLiftSuspension = () => {',
  `  const handleLOPreScreenApprove = () => {
    if (!nop || nop.loPreScreenStatus !== "Pending Pre-screening") return;
    persist(
      nops.map((n) =>
        n.id !== nop.id ? n : {
          ...n,
          loPreScreenStatus: "Cleared for Approval",
          updatedAt: new Date().toISOString()
        }
      )
    );
    recordNopAudit({
      nopId: nop.id,
      action: "PRE_SCREEN_CLEARED",
      actor: username,
      role,
      comment: "Liaison Officer cleared application for domain approvals."
    });
    showFeedback("Pre-screening cleared. Application routed to Technical Approvers.");
  };

  const handleDomainApprove = (domain) => {
    if (!nop) return;
    const otherPending = (nop.domainApprovals || []).filter(da => da.domain !== domain && da.status === "Pending");
    const willBeFullyApproved = otherPending.length === 0;

    persist(
      nops.map((n) =>
        n.id !== nop.id ? n : {
          ...n,
          domainApprovals: (n.domainApprovals || []).map(da => 
            da.domain === domain ? { ...da, status: "Approved", decidedAt: new Date().toISOString() } : da
          ),
          applicationStatus: willBeFullyApproved ? "Approved" : n.applicationStatus,
          permitStatus: willBeFullyApproved ? derivePermitStatus({ ...n, applicationStatus: "Approved" }) : n.permitStatus,
          updatedAt: new Date().toISOString()
        }
      )
    );
    recordNopAudit({
      nopId: nop.id,
      action: "DOMAIN_APPROVED",
      actor: username,
      role,
      comment: \`Domain \${domain} technically cleared.\`
    });
    showFeedback(\`Domain \${domain} approved successfully.\`);
  };

  const handleLiftSuspension = () => {`
);

// 2. Insert buttons in Quick Actions
const isLiaisonOfficerAssignedStr = `
            const isLiaisonOfficerAssigned = role === "Liaison Officer" && nop.sdcLiaisonOfficer && (
              nop.sdcLiaisonOfficer.toLowerCase().includes(username?.toLowerCase() || "") ||
              (username && username.toLowerCase().includes(nop.sdcLiaisonOfficer.toLowerCase()))
            );
`;

const buttonsStr = `
                  {isLiaisonOfficerAssigned && nop.applicationStatus === "Under Review" && nop.loPreScreenStatus === "Pending Pre-screening" && (
                    <button className="btn btn-success btn-sm" onClick={handleLOPreScreenApprove} style={{ fontSize: "12px", background: "#10B981", border: "none", fontWeight: 700, justifyContent: "flex-start", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <IconCheckCircle size={13} strokeWidth={2.5} />
                      <span>Clear LO Pre-Screening</span>
                    </button>
                  )}
                  {isAssignedApproverOrAdmin && nop.applicationStatus === "Under Review" && nop.loPreScreenStatus === "Cleared for Approval" && nop.domainApprovals?.some((a) => a.status === "Pending" && (a.approverName === username || a.approverName?.includes(username || "") || (approverDept && (a.departmentId === approverDept || a.approverGroup?.toLowerCase().includes(approverDept.toLowerCase()))))) && (
                    nop.domainApprovals.filter(a => a.status === "Pending" && (a.approverName === username || a.approverName?.includes(username || "") || (approverDept && (a.departmentId === approverDept || a.approverGroup?.toLowerCase().includes(approverDept.toLowerCase()))))).map(da => (
                      <button key={da.domain} className="btn btn-success btn-sm" onClick={() => handleDomainApprove(da.domain)} style={{ fontSize: "12px", background: "#10B981", border: "none", fontWeight: 700, justifyContent: "flex-start", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <IconCheckCircle size={13} strokeWidth={2.5} />
                        <span>Approve Domain: {da.domain}</span>
                      </button>
                    ))
                  )}
`;

content = content.replace(
  '            const isContractor = isContractorApplicant({ role, username, companyName: company, canActAsApplicant }, nop);',
  `            const isContractor = isContractorApplicant({ role, username, companyName: company, canActAsApplicant }, nop);` + isLiaisonOfficerAssignedStr
);

content = content.replace(
  '{isContractor &&',
  buttonsStr + '\n                  {isContractor &&'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced successfully');
