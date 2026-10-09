"use client";

import React from "react";
import { NOPApplication, isWorkAuthorized, derivePermitStatus } from "@/lib/nopData";
import {
  IconPrinter,
  IconX,
  IconShieldCheck,
  IconCheckCircle,
  IconAlertTriangle
} from "@/components/NopIcons";
import { NopStatusBadge } from "@/components/NopStatusBadge";

interface NopCertificateProps {
  nop: NOPApplication;
  onClose: () => void;
}

export const NopCertificate: React.FC<NopCertificateProps> = ({ nop, onClose }) => {
  const derivedStatus = derivePermitStatus(nop);
  const workAuth = isWorkAuthorized(nop);
  const isApproved = nop.applicationStatus === "Approved";
  const isIssued = isApproved;
  const isIpa = nop.ipaStatus === "Granted";

  // Watermark text determination per P0-06 and DOC-14
  let watermarkText: string | null = null;
  let watermarkColor = "rgba(220, 38, 38, 0.15)";
  let watermarkBorder = "4px dashed rgba(220, 38, 38, 0.25)";

  if (!isApproved) {
    if (isIpa && workAuth.allowed) {
      watermarkText = "IN-PRINCIPLE APPROVAL (IPA)";
      watermarkColor = "rgba(245, 158, 11, 0.16)";
      watermarkBorder = "4px dashed rgba(245, 158, 11, 0.3)";
    } else {
      watermarkText = "NOT ISSUED";
    }
  } else {
    if (derivedStatus === "Suspended") {
      watermarkText = "PERMIT SUSPENDED";
    } else if (derivedStatus === "Expired") {
      watermarkText = "PERMIT EXPIRED";
      watermarkColor = "rgba(100, 116, 139, 0.18)";
      watermarkBorder = "4px dashed rgba(100, 116, 139, 0.3)";
    } else if (derivedStatus === "Cancelled") {
      watermarkText = "PERMIT CANCELLED";
    } else if (derivedStatus === "Revoked") {
      watermarkText = "PERMIT REVOKED";
    } else if (derivedStatus === "Upcoming") {
      watermarkText = "UPCOMING — NOT ACTIVE";
      watermarkColor = "rgba(59, 130, 246, 0.16)";
      watermarkBorder = "4px dashed rgba(59, 130, 246, 0.3)";
    }
  }

  // Dynamic signatory
  const approvedClearances = (nop.domainApprovals || []).filter((a) => a.status === "Approved");
  const latestApproval = approvedClearances.length > 0 ? approvedClearances[approvedClearances.length - 1] : null;

  const signatoryName = latestApproval?.approvedBy || latestApproval?.approverName || nop.liaisonOfficer || nop.sdcLiaisonOfficer || "SDC Central Regulatory Board";
  const signatoryDomain = latestApproval?.domain || "SDC Safety & Island Operations";
  const approvedDate = latestApproval?.decidedAt
    ? latestApproval.decidedAt.substring(0, 10)
    : nop.updatedAt
    ? nop.updatedAt.substring(0, 10)
    : (nop.submittedAt || new Date().toISOString()).substring(0, 10);

  const workersCount = nop.workers?.length || 0;

  return (
    <div
      className="modal-backdrop nop-cert-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}
    >
      <div
        className="modal-content nop-cert-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#FFFFFF",
          color: "#0F172A",
          borderRadius: "16px",
          padding: "36px",
          boxShadow: "0 25px 60px -12px rgba(0,0,0,0.35)",
          border: "2px solid #FF8200",
          position: "relative"
        }}
      >
        {/* Close Button top right */}
        <button
          onClick={onClose}
          aria-label="Close certificate"
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            background: "#F1F5F9",
            border: "1px solid #CBD5E1",
            borderRadius: "50%",
            width: "34px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#475569"
          }}
        >
          <IconX size={16} />
        </button>

        {watermarkText && (
          <>
            <div
              style={{
                background: !isApproved ? "#FEF2F2" : derivedStatus === "Suspended" ? "#FEF2F2" : derivedStatus === "Expired" ? "#F1F5F9" : "#FFF7ED",
                border: !isApproved ? "2px solid #F87171" : derivedStatus === "Suspended" ? "2px solid #DC2626" : "2px solid #CBD5E1",
                color: !isApproved ? "#991B1B" : derivedStatus === "Suspended" ? "#991B1B" : "#475569",
                borderRadius: "8px",
                padding: "12px 18px",
                marginBottom: "16px",
                fontSize: "13px",
                fontWeight: 800,
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}
            >
              {!isApproved
                ? (isIpa && workAuth.allowed
                  ? "⚠ IN-PRINCIPLE APPROVAL (IPA) — CONDITIONAL PREPARATORY WORKS ONLY. Full NOP issuance pending clearance of all deferred statutory documents."
                  : isIpa
                  ? "⚠ IN-PRINCIPLE APPROVAL (IPA) — WORK AUTHORIZATION EXPIRED. Physical works on site are strictly prohibited."
                  : "⚠ APPLICATION PREVIEW — NOT AUTHORIZED FOR WORK. Official permit will be issued upon SDC approval.")
                : `⚠ PERMIT STATUS: ${derivedStatus.toUpperCase()} — Official certificate watermark active.`}
            </div>

            <div
              style={{
                position: "absolute",
                top: "48%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-28deg)",
                fontSize: "32px",
                fontWeight: 900,
                color: watermarkColor,
                pointerEvents: "none",
                userSelect: "none",
                whiteSpace: "nowrap",
                zIndex: 10,
                letterSpacing: "0.08em",
                textAlign: "center",
                border: watermarkBorder,
                padding: "12px 28px",
                borderRadius: "12px"
              }}
            >
              {watermarkText}
            </div>
          </>
        )}

        {/* Certificate Header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #FF8200", paddingBottom: "18px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "4px" }}>
            <IconShieldCheck size={20} color="#008C95" />
            <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.12em", color: "#008C95", textTransform: "uppercase" }}>
              Sentosa Development Corporation · Integrated Island Operations
            </span>
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 900, margin: "6px 0", color: "#0F172A", letterSpacing: "0.02em" }}>
            DIGITAL NO OBJECTION PERMIT (NOP)
          </h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "6px" }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "15px", fontWeight: 800, color: "#FF8200", background: "#FFF7ED", padding: "2px 10px", borderRadius: "6px", border: "1px solid #FED7AA" }}>
              {nop.id}
            </span>
            <NopStatusBadge nop={nop} size="lg" />
          </div>
        </div>

        {/* Key Permit Data */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", background: "#F8FAFC", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
            <div>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Contractor / Company</span>
              <strong style={{ fontSize: "14px", color: "#0F172A" }}>{nop.companyName}</strong>
              <div style={{ fontSize: "11px", color: "#64748B", fontFamily: "var(--font-mono, monospace)" }}>UEN: {nop.companyUen}</div>
            </div>
            <div>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Person-In-Charge (PIC)</span>
              <strong style={{ fontSize: "14px", color: "#0F172A" }}>{nop.applicantName}</strong>
              <div style={{ fontSize: "11px", color: "#64748B" }}>24/7 Hotline: <strong>{nop.applicantPhone}</strong></div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "10px" }}>
            <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
              {isIssued ? "Permitted Scope of Work" : "Proposed Scope of Work"}
            </span>
            <div style={{ color: "#1E293B", lineHeight: 1.5, marginTop: "2px" }}>{nop.workDescription}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
            <div>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Location &amp; Zone</span>
              <strong style={{ color: "#0F172A" }}>{nop.location}</strong>
              <span style={{ color: "#64748B", fontSize: "12px", display: "block" }}>Zone: {nop.zone}</span>
            </div>
            <div>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Space &amp; Specific Unit</span>
              <strong style={{ color: "#0F172A" }}>{nop.unitRoomNumber || nop.spaceDescription || "Designated Precinct Boundary"}</strong>
              {nop.spaceDescription && nop.unitRoomNumber && (
                <span style={{ color: "#64748B", fontSize: "12px", display: "block" }}>{nop.spaceDescription}</span>
              )}
            </div>
          </div>

          {/* Validity & Working Window */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", background: "#F1F5F9", padding: "12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
            <div>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Valid From</span>
              <strong style={{ color: "#0F172A" }}>{nop.startDateTime.substring(0, 10)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Valid Until</span>
              <strong style={{ color: "#0F172A" }}>{nop.endDateTime.substring(0, 10)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                {isIssued ? "Authorized Window" : "Requested Working Hours"}
              </span>
              <strong style={{ color: "#0F172A" }}>{nop.workingHours}</strong>
            </div>
          </div>

          {/* Personnel and PTW Link */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", fontSize: "12px" }}>
            <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Personnel Onsite</span>
              <strong>{workersCount} {isIssued ? "Authorized Workers" : "Nominated Workers"}</strong>
              <span style={{ color: "#64748B", display: "block", fontSize: "11px" }}>
                {isIssued ? "Vetted against SDC Security Clearance" : "Pending Security & Technical Vetting"}
              </span>
            </div>
            <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Related PTW Reference</span>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                {nop.relatedPtwReference || (isIssued ? "N/A — SDC Island Works NOP" : "Pending Permit Issuance")}
              </span>
              <span style={{ color: "#64748B", display: "block", fontSize: "11px" }}>
                {isIssued ? "NOP must remain Active for Site PTW validity" : "PTW cannot be activated until NOP is formally approved"}
              </span>
            </div>
          </div>

          {/* QR Verification & Signatory Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "2px dashed #CBD5E1",
              paddingTop: "16px",
              marginTop: "8px",
              gap: "16px"
            }}
          >
            {/* SDC Verification Identifier (P0-06) */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  background: "#F8FAFC",
                  border: "1.5px solid #CBD5E1",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  flexShrink: 0
                }}
              >
                🛡️
              </div>
              <div style={{ fontSize: "11px", color: "#64748B", maxWidth: "220px", lineHeight: 1.3 }}>
                <strong style={{ color: "#0F172A", display: "block" }}>SDC Verification Identifier</strong>
                <span>Ref: {nop.id}</span>
                <div style={{ color: "#0284C7", fontWeight: 600, fontSize: "10.5px", marginTop: "2px" }}>
                  Status: {isApproved ? derivedStatus : (isIpa && workAuth.allowed ? "IPA Granted" : "Under Review")}
                </div>
              </div>
            </div>

            {/* Dynamic SDC Permit Signatory */}
            <div style={{ textAlign: "right", fontSize: "12px", borderLeft: "1px solid #E2E8F0", paddingLeft: "16px" }}>
              <span style={{ color: "#64748B", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                Authorized SDC Signatory
              </span>
              <strong style={{ fontSize: "13px", color: isApproved ? "#0F172A" : "#64748B", display: "block", marginTop: "2px" }}>
                {isApproved ? signatoryName : "Pending Technical & SDC Endorsement"}
              </strong>
              <div style={{ fontSize: "11px", color: isApproved ? "#008C95" : "#94A3B8", fontWeight: 600 }}>
                {isApproved ? signatoryDomain : "SDC Integrated Island Operations"}
              </div>
              <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px" }}>
                {isApproved ? `Approved on: ${approvedDate} · Sentosa IIS` : "Not Yet Approved — Preview Only"}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="modal-actions"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            marginTop: "24px",
            borderTop: "1px solid #E2E8F0",
            paddingTop: "16px"
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (!workAuth.allowed) return;
              window.print();
            }}
            disabled={!workAuth.allowed}
            title={
              workAuth.allowed
                ? "Print official permit certificate"
                : "Permit is not active or authorized for work per SDC policy — official certificate cannot be printed."
            }
            style={{
              background: "#F1F5F9",
              color: "#0F172A",
              border: "1px solid #CBD5E1",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: workAuth.allowed ? "pointer" : "not-allowed",
              opacity: workAuth.allowed ? 1 : 0.4
            }}
          >
            <IconPrinter size={15} />
            <span>
              {workAuth.allowed
                ? "Print Official Certificate"
                : `Not Authorized to Print (${isApproved ? derivedStatus : "Not Issued"})`}
            </span>
          </button>
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{
              background: "#0F172A",
              color: "#FFFFFF",
              fontWeight: 700,
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default NopCertificate;
