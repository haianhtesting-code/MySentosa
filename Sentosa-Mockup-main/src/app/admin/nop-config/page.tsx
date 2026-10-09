"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { NopConfirmModal } from "@/components/NopConfirmModal";
import { useRole } from "@/context/RoleContext";
import { hasNopPermission } from "@/lib/nopPermissions";
import {
  NOPApplication,
  BlackoutDateConfig,
  loadStoredBlackouts,
  saveStoredBlackouts,
  apiSaveBlackouts,
  fetchBlackouts,
  loadStoredNops,
  fetchNopsFromMongo,
  saveStoredNops,
  ROUTING_MATRIX_RULES,
  RoutingMatrixRule,
  loadStoredRouting,
  saveStoredRouting,
  apiSaveRoutingRules,
  reapplyRoutingToPendingSteps,
  STATUTORY_TRIGGERS_LIST,
  SINGAPORE_PUBLIC_HOLIDAYS_2026,
  SUPPORTING_DOCUMENT_SCHEDULE,
  UrgentDocClassificationMap,
  loadStoredUrgentDocClassification,
  saveStoredUrgentDocClassification,
  ApproverGroupCatalogItem,
  getApproverPersonForRole,
  loadStoredApproverGroups,
  saveStoredApproverGroups,
  apiSaveApproverGroups,
  DEFAULT_APPROVER_GROUPS
} from "@/lib/nopData";
import { getUsers, UserAccount } from "@/lib/users";
import { recordNopAudit, loadNopAuditTrail, NopAuditEntry } from "@/lib/nopAudit";
import { derivePermitStatus } from "@/lib/nopData";
import {
  dispatchNopNotification,
  loadStoredNotificationSettings,
  saveStoredNotificationSettings
} from "@/lib/nopNotifications";
import {
  IconCalendar,
  IconGitFork,
  IconClock,
  IconPlus,
  IconX,
  IconMapPin,
  IconAlertTriangle,
  IconShieldCheck,
  IconCheckCircle,
  IconTrash2,
  IconInfo,
  IconEdit
} from "@/components/NopIcons";

export default function NopSettingsPage() {
  const { role, username } = useRole();
  const isReadOnly = role === "NOP Business Owner" || role === "System Administrator";
  const canEdit = !isReadOnly && (
    hasNopPermission(role, "nop.config_rules") ||
    hasNopPermission(role, "nop.config_moratorium") ||
    role === "NOP Operations Admin" ||
    role === "Current Ops Administrator"
  );
  const canAccessSettingsWorkspace = canEdit || isReadOnly;

  // Tab State
  const [activeAdminTab, setActiveAdminTab] = useState<"groups" | "routing" | "blackouts" | "sla" | "urgent_docs" | "config_audit">("groups");
  const [slaPolicyDaysN, setSlaPolicyDaysN] = useState<number>(3);
  const [slaError, setSlaError] = useState<string | null>(null);
  const [configAuditLogs, setConfigAuditLogs] = useState<NopAuditEntry[]>([]);
  const [configAuditSearch, setConfigAuditSearch] = useState("");

  // State for Editing / Adding Routing Rules Modal
  const [editingRuleIdx, setEditingRuleIdx] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState<Partial<RoutingMatrixRule>>({});

  // Approver Groups State
  const [approverGroups, setApproverGroups] = useState<ApproverGroupCatalogItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [systemUsers, setSystemUsers] = useState<UserAccount[]>([]);
  const [nops, setNops] = useState<NOPApplication[]>([]);

  // Modals for Group Items
  const [groupModalItem, setGroupModalItem] = useState<Partial<ApproverGroupCatalogItem> | null>(null);
  const [isNewGroupItem, setIsNewGroupItem] = useState(false);
  const [groupMemberSearch, setGroupMemberSearch] = useState("");

  // Urgent NOP Classification
  const [urgentDocClassification, setUrgentDocClassification] = useState<UrgentDocClassificationMap>({});
  const [urgentDocDirty, setUrgentDocDirty] = useState(false);

  // Routing Matrix Rules State
  const [routingRules, setRoutingRules] = useState<RoutingMatrixRule[]>(ROUTING_MATRIX_RULES);
  const [routingSearch, setRoutingSearch] = useState("");

  // Blackout Dates State
  const [blackouts, setBlackouts] = useState<BlackoutDateConfig[]>([]);
  const [showNewBlackoutModal, setShowNewBlackoutModal] = useState(false);
  const [editingBlackoutId, setEditingBlackoutId] = useState<string | null>(null);
  const [deleteBlackoutId, setDeleteBlackoutId] = useState<string | null>(null);
  const [newBlackoutForm, setNewBlackoutForm] = useState<{
    name: string;
    startDate: string;
    endDate: string;
    zone: string;
    restrictionLevel: "Total Blackout" | "No Heavy Machinery" | "Night Restriction Only";
  }>({
    name: "",
    startDate: "",
    endDate: "",
    zone: "All Island Precincts",
    restrictionLevel: "Total Blackout"
  });
  const [blackoutModalError, setBlackoutModalError] = useState<string | null>(null);

  // Feedback Notification Banner
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  useEffect(() => {
    setRoutingRules(loadStoredRouting());
    setApproverGroups(loadStoredApproverGroups());
    setBlackouts(loadStoredBlackouts());
    fetchBlackouts().then(b => {
      if (b && Array.isArray(b) && b.length > 0) setBlackouts(b);
    }).catch(() => {});
    setSystemUsers(getUsers());
    setUrgentDocClassification(loadStoredUrgentDocClassification());
    setNops(loadStoredNops());
    const initSettings = loadStoredNotificationSettings();
    setSlaPolicyDaysN(initSettings.deferredDocumentDaysN || 3);
    setConfigAuditLogs(loadNopAuditTrail().filter(e => e.nopId === "SYSTEM_CONFIG" || (e.action && e.action.startsWith("CONFIG_"))));
  }, []);

  const handleToggleUrgentDocDeferrable = (docId: string) => {
    if (!canEdit) {
      showFeedback("You do not have permission to modify the Urgent NOP Classification.");
      return;
    }
    setUrgentDocClassification((prev) => ({ ...prev, [docId]: !prev[docId] }));
    setUrgentDocDirty(true);
  };

  const handleSaveUrgentDocClassification = () => {
    if (!canEdit) {
      showFeedback("You do not have permission to modify the Urgent NOP Classification.");
      return;
    }
    saveStoredUrgentDocClassification(urgentDocClassification);
    setUrgentDocDirty(false);
    recordNopAudit({
      nopId: "SYSTEM_CONFIG",
      action: "CONFIG_UPDATE_URGENT_DOCS",
      actor: username,
      role,
      comment: "Updated Urgent NOP deferred document classification list."
    });
    setConfigAuditLogs(loadNopAuditTrail().filter(e => e.nopId === "SYSTEM_CONFIG" || (e.action && e.action.startsWith("CONFIG_"))));
    showFeedback("Urgent NOP Classification saved successfully.");
  };

  const handleOpenEditRule = (idx: number) => {
    if (!canEdit) return;
    setEditingRuleIdx(idx);
    const rule = routingRules[idx];
    const grp = approverGroups.find(g => (rule.groupId && g.id === rule.groupId) || g.name === rule.approverGroup);
    setRuleForm({
      ...rule,
      groupId: rule.groupId || grp?.id,
      approverGroup: grp?.name || rule.approverGroup
    });
  };

  const handleSaveRuleModal = () => {
    if (!canEdit) {
      showFeedback("You do not have permission to modify routing rules.");
      return;
    }
    const selGroup = approverGroups.find(g => g.id === ruleForm.groupId || g.name === ruleForm.approverGroup) || approverGroups[0];
    const existingRule = editingRuleIdx !== null ? routingRules[editingRuleIdx] : null;
    if (editingRuleIdx === null || !existingRule) return;

    const newRule: RoutingMatrixRule = {
      ...existingRule,
      groupId: selGroup?.id || ruleForm.groupId,
      approverGroup: selGroup?.name || (ruleForm.approverGroup ? ruleForm.approverGroup.trim() : "SDC Central Operations Group"),
      areaOfResponsibility: ruleForm.areaOfResponsibility ? ruleForm.areaOfResponsibility.trim() : "",
      active: true
    };

    const hasChanged =
      existingRule.approverGroup !== newRule.approverGroup ||
      existingRule.areaOfResponsibility !== newRule.areaOfResponsibility;

    const updated = routingRules.map((r, i) => (i === editingRuleIdx ? newRule : r));
    setRoutingRules(updated);
    saveStoredRouting(updated);
    apiSaveRoutingRules(updated);

    // CFG-01 & CFG-02: Automatically re-apply updated routing only if rule changed, targeting only this rule id
    const nops = loadStoredNops();
    const { applications, reassignments } = hasChanged
      ? reapplyRoutingToPendingSteps(nops, updated, newRule.id)
      : { applications: nops, reassignments: [] };
    if (reassignments.length > 0) {
      saveStoredNops(applications);
      reassignments.forEach((r) => {
        recordNopAudit({
          nopId: r.nopId,
          action: "ROUTING_REASSIGNED",
          actor: username,
          role,
          comment: `${r.domain}: pending approval step reassigned to "${r.toGroup}".`
        });
      });
    }

    recordNopAudit({
      nopId: "SYSTEM_CONFIG",
      action: "CONFIG_UPDATE_RULE",
      actor: username,
      role,
      before: existingRule ? { trigger: existingRule.trigger, group: existingRule.approverGroup } : undefined,
      after: { trigger: newRule.trigger, group: newRule.approverGroup },
      comment: `Updated routing rule for "${newRule.trigger}": assigned to Approver Group "${newRule.approverGroup}"`
    });
    setConfigAuditLogs(loadNopAuditTrail().filter(e => e.nopId === "SYSTEM_CONFIG" || (e.action && e.action.startsWith("CONFIG_"))));
    setEditingRuleIdx(null);
    showFeedback(
      reassignments.length > 0
        ? `Saved! Reassigned ${reassignments.length} pending step(s) across ${new Set(reassignments.map(r => r.nopId)).size} permit(s).`
        : `Approval rule for "${newRule.trigger.slice(0, 30)}..." successfully saved!`
    );
  };

  const handleSaveGroupModal = () => {
    if (!canEdit) {
      showFeedback("You do not have permission to modify Approver Groups.");
      return;
    }
    if (!groupModalItem?.name) {
      showFeedback("Please provide a valid Approver Group name.");
      return;
    }
    const trimmedName = groupModalItem.name.trim();
    const isDuplicate = approverGroups.some(g => g.id !== groupModalItem.id && g.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      showFeedback(`Error: An Approver Group named "${trimmedName}" already exists. Please choose a unique name.`);
      return;
    }
    const members = groupModalItem.members || [];
    if (members.length === 0) {
      showFeedback("Error: An Approver Group must have at least 1 assigned member. Please add members before saving.");
      return;
    }
    const existingGroup = approverGroups.find(g => g.id === groupModalItem.id);
    const newGroup: ApproverGroupCatalogItem = {
      id: groupModalItem.id || `g_${Date.now()}`,
      name: trimmedName,
      authorizedRole: groupModalItem.authorizedRole || "Technical Approver",
      description: groupModalItem.description ? groupModalItem.description.trim() : "",
      members: members
    };
    let updated: ApproverGroupCatalogItem[];
    if (isNewGroupItem) {
      updated = [...approverGroups, newGroup];
    } else {
      updated = approverGroups.map(g => (g.id === newGroup.id ? newGroup : g));
    }
    setApproverGroups(updated);
    saveStoredApproverGroups(updated);
    apiSaveApproverGroups(updated);

    // CFG-11: Reassign pending steps if members changed
    const currentNops = loadStoredNops();
    let reassignCount = 0;
    const nextNops = currentNops.map(nop => {
      if (!nop.domainApprovals) return nop;
      const nextApprovals = nop.domainApprovals.map(step => {
        if (step.status === "Pending" && step.approverGroup === newGroup.name) {
          if (!members.includes(step.approverName)) {
            reassignCount++;
            return { ...step, approverName: members[0] };
          }
        }
        return step;
      });
      return { ...nop, domainApprovals: nextApprovals };
    });
    if (reassignCount > 0) {
      saveStoredNops(nextNops);
      setNops(nextNops);
    }

    recordNopAudit({
      nopId: "SYSTEM_CONFIG",
      action: isNewGroupItem ? "CONFIG_CREATE_GROUP" : "CONFIG_UPDATE_GROUP",
      actor: username,
      role,
      before: isNewGroupItem ? undefined : { name: existingGroup?.name, members: existingGroup?.members },
      after: { name: newGroup.name, members: newGroup.members },
      comment: `${isNewGroupItem ? "Created" : "Updated"} Approver Group "${newGroup.name}" with ${members.length} member(s): ${members.join(", ")}`
    });
    setConfigAuditLogs(loadNopAuditTrail().filter(e => e.nopId === "SYSTEM_CONFIG" || (e.action && e.action.startsWith("CONFIG_"))));

    setGroupModalItem(null);
    showFeedback(`Approver Group "${newGroup.name}" saved successfully!`);
  };

  const handleDeleteGroup = (id: string) => {
    if (!canEdit) return;
    const grp = approverGroups.find(g => g.id === id);
    const linkedRules = routingRules.filter(r => r.groupId === id || (grp && r.approverGroup === grp.name));
    if (linkedRules.length > 0) {
      showFeedback(`Cannot delete group "${grp?.name || id}": it is currently referenced by ${linkedRules.length} routing matrix rules. Please reassign those rules first.`);
      return;
    }
    const updated = approverGroups.filter(g => g.id !== id);
    setApproverGroups(updated);
    saveStoredApproverGroups(updated);
    apiSaveApproverGroups(updated);
    recordNopAudit({
      nopId: "SYSTEM_CONFIG",
      action: "CONFIG_DELETE_GROUP",
      actor: username,
      role,
      before: { name: grp?.name, members: grp?.members },
      after: null,
      comment: `Removed Approver Group "${grp?.name || id}" from catalog`
    });
    setConfigAuditLogs(loadNopAuditTrail().filter(e => e.nopId === "SYSTEM_CONFIG" || (e.action && e.action.startsWith("CONFIG_"))));
    setGroupModalItem(null);
    showFeedback("Approver Group removed from catalog.");
  };

  // Blackout Management
  const handleOpenNewBlackoutModal = () => {
    if (!canEdit) return;
    setEditingBlackoutId(null);
    setNewBlackoutForm({
      name: "",
      startDate: "",
      endDate: "",
      zone: "All Island Precincts",
      restrictionLevel: "Total Blackout"
    });
    setBlackoutModalError(null);
    setShowNewBlackoutModal(true);
  };

  const handleOpenEditBlackoutModal = (bo: BlackoutDateConfig) => {
    if (!canEdit) return;
    setEditingBlackoutId(bo.id);
    setNewBlackoutForm({
      name: bo.name,
      startDate: bo.startDate,
      endDate: bo.endDate,
      zone: bo.zones && bo.zones.length > 0 ? bo.zones[0] : "All Island Precincts",
      restrictionLevel: bo.restrictionLevel
    });
    setBlackoutModalError(null);
    setShowNewBlackoutModal(true);
  };

  const handleCloseNewBlackoutModal = () => {
    setShowNewBlackoutModal(false);
    setEditingBlackoutId(null);
    setBlackoutModalError(null);
  };

  const handleCreateBlackoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!newBlackoutForm.name.trim()) {
      setBlackoutModalError("Please specify a blackout event title.");
      return;
    }
    if (!newBlackoutForm.startDate || !newBlackoutForm.endDate) {
      setBlackoutModalError("Start date and end date are both required.");
      return;
    }
    if (newBlackoutForm.endDate < newBlackoutForm.startDate) {
      setBlackoutModalError("End date cannot be earlier than start date.");
      return;
    }
    const todayStr = new Date().toISOString().substring(0, 10);
    if (!editingBlackoutId && newBlackoutForm.startDate < todayStr) {
      setBlackoutModalError("Cannot create a blackout moratorium window starting in the past.");
      return;
    }

    // Check for overlap with existing blackouts (excluding current editing blackout)
    const overlappingBlackout = blackouts.find((b) => {
      if (editingBlackoutId && b.id === editingBlackoutId) return false;
      const overlapDates = !(newBlackoutForm.endDate < b.startDate || newBlackoutForm.startDate > b.endDate);
      const overlapZones = newBlackoutForm.zone === "All Island Precincts" || b.zones.includes("All Island Precincts") || b.zones.includes(newBlackoutForm.zone);
      return overlapDates && overlapZones;
    });

    const isEdit = !!editingBlackoutId;
    const oldBo = isEdit ? blackouts.find(b => b.id === editingBlackoutId) : null;
    const boId = editingBlackoutId || `BO-2026-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;
    const savedBo: BlackoutDateConfig = {
      id: boId,
      name: newBlackoutForm.name.trim(),
      startDate: newBlackoutForm.startDate,
      endDate: newBlackoutForm.endDate,
      zones: [newBlackoutForm.zone],
      restrictionLevel: newBlackoutForm.restrictionLevel,
      status: oldBo?.status || "Active"
    };

    let updated: BlackoutDateConfig[];
    if (isEdit) {
      updated = blackouts.map(b => b.id === boId ? savedBo : b);
    } else {
      updated = [...blackouts, savedBo];
    }
    setBlackouts(updated);
    saveStoredBlackouts(updated);
    apiSaveBlackouts(updated);

    // CFG-07: Impact Analysis on active & upcoming approved permits
    const bStart = new Date(newBlackoutForm.startDate).getTime();
    const bEnd = new Date(newBlackoutForm.endDate + "T23:59:59").getTime();
    const allNops = loadStoredNops();
    const affected = allNops.filter((n) => {
      if (n.applicationStatus !== "Approved") return false;
      const st = derivePermitStatus(n);
      if (st !== "Active" && st !== "Upcoming") return false;
      const nStart = new Date(n.startDateTime).getTime();
      const nEnd = new Date(n.endDateTime).getTime();
      const dateOverlap = !(nEnd < bStart || nStart > bEnd);
      const zoneMatch = newBlackoutForm.zone === "All Island Precincts" || (n.zone && (n.zone.includes(newBlackoutForm.zone) || newBlackoutForm.zone.includes(n.zone)));
      return dateOverlap && zoneMatch;
    });

    // Dispatch NOTIF-25 to affected approved permits (Applicant and assigned LO)
    affected.forEach((nop) => {
      dispatchNopNotification({
        triggerCode: "NOTIF-25",
        nopId: nop.id,
        recipientRole: "Applicant (Contractor PIC)",
        recipientEmail: nop.applicantEmail,
        subject: `Blackout Window Advisory for Approved Permit ${nop.id}`,
        content: `Island moratorium "${savedBo.name}" (${savedBo.startDate} to ${savedBo.endDate}) overlaps with your permit in ${nop.zone}. Please coordinate noise and heavy machinery operations per SDC directives.\nPermit dossier: /nops/${nop.id}`
      });

      if (nop.sdcLiaisonOfficer) {
        dispatchNopNotification({
          triggerCode: "NOTIF-25",
          nopId: nop.id,
          recipientRole: "Liaison Officer",
          recipientEmail: nop.sdcLiaisonOfficer.toLowerCase().includes("gary") ? "gary.ng@sdc.gov.sg" : "jonathan.teo@sdc.gov.sg",
          subject: `Blackout Window Advisory for Supervised Permit ${nop.id}`,
          content: `Island moratorium "${savedBo.name}" (${savedBo.startDate} to ${savedBo.endDate}) overlaps with permit ${nop.id} in ${nop.zone}. Please supervise noise and machinery constraints.`
        });
      }
    });

    recordNopAudit({
      nopId: "SYSTEM_CONFIG",
      action: isEdit ? "CONFIG_UPDATE_BLACKOUT" : "CONFIG_CREATE_BLACKOUT",
      actor: username,
      role,
      before: isEdit && oldBo ? { name: oldBo.name, dates: `${oldBo.startDate} to ${oldBo.endDate}`, zone: oldBo.zones.join(", ") } : undefined,
      after: { name: savedBo.name, dates: `${savedBo.startDate} to ${savedBo.endDate}`, zone: savedBo.zones.join(", ") },
      comment: `${isEdit ? "Updated" : "Created"} blackout window "${savedBo.name}" (${savedBo.startDate} to ${savedBo.endDate}, Zone: ${savedBo.zones.join(", ")}). Impact analysis identified ${affected.length} active/upcoming permit(s); NOTIF-25 dispatched.${overlappingBlackout ? ` [Warning: Overlaps with ${overlappingBlackout.name}]` : ""}`
    });
    setConfigAuditLogs(loadNopAuditTrail().filter(e => e.nopId === "SYSTEM_CONFIG" || (e.action && e.action.startsWith("CONFIG_"))));

    handleCloseNewBlackoutModal();
    const affectedListStr = affected.length > 0 ? ` (Affected: ${affected.map(n => n.id).join(", ")})` : "";
    const overlapStr = overlappingBlackout ? ` [Warning: Overlaps with "${overlappingBlackout.name}"]` : "";
    showFeedback(`Blackout "${savedBo.name}" ${isEdit ? "updated" : "created"}!${overlapStr} ${affected.length} affected permit(s)${affectedListStr}. NOTIF-25 sent.`);
  };

  const handleDeleteBlackout = (id: string) => {
    if (!canEdit) return;
    setDeleteBlackoutId(id);
  };

  const executeDeleteBlackout = () => {
    if (!deleteBlackoutId || !canEdit) return;
    const target = blackouts.find(b => b.id === deleteBlackoutId);
    const updated = blackouts.filter(b => b.id !== deleteBlackoutId);
    setBlackouts(updated);
    saveStoredBlackouts(updated);
    apiSaveBlackouts(updated);
    recordNopAudit({
      nopId: "SYSTEM_CONFIG",
      action: "CONFIG_DELETE_BLACKOUT",
      actor: username,
      role,
      before: { name: target?.name, dates: `${target?.startDate} to ${target?.endDate}` },
      after: null,
      comment: `Deleted blackout window "${target?.name || deleteBlackoutId}" (${deleteBlackoutId})`
    });
    setConfigAuditLogs(loadNopAuditTrail().filter(e => e.nopId === "SYSTEM_CONFIG" || (e.action && e.action.startsWith("CONFIG_"))));
    setDeleteBlackoutId(null);
    showFeedback(`Blackout "${target?.name || deleteBlackoutId}" removed from calendar.`);
  };

  // Notification Configuration Handlers
  const handleSaveSlaPolicy = () => {
    if (!canEdit) return;
    setSlaError(null);
    if (!slaPolicyDaysN || slaPolicyDaysN <= 0 || !Number.isInteger(slaPolicyDaysN)) {
      setSlaError("Continuous 24h completion period N must be a strictly positive integer of at least 1 day.");
      return;
    }
    const current = loadStoredNotificationSettings();
    const updated = { ...current, deferredDocumentDaysN: slaPolicyDaysN };
    saveStoredNotificationSettings(updated);
    recordNopAudit({
      nopId: "SYSTEM_CONFIG",
      action: "CONFIG_UPDATE_SLA",
      actor: username,
      role,
      before: { deferredDocumentDaysN: current.deferredDocumentDaysN },
      after: { deferredDocumentDaysN: slaPolicyDaysN },
      comment: `Updated continuous deferred document deadline N to ${slaPolicyDaysN} days.`
    });
    setConfigAuditLogs(loadNopAuditTrail().filter(e => e.nopId === "SYSTEM_CONFIG" || (e.action && e.action.startsWith("CONFIG_"))));
    showFeedback("SLA Policy saved successfully.");
  };

  const handleExportMatrixCsv = () => {
    if (isReadOnly || !hasNopPermission(role, "nop.export_xlsx")) {
      showFeedback("You do not have permission to export matrix data.");
      return;
    }
    const header = "Trigger Number,Statutory Work Involvement Trigger,Approver Group,Area of Responsibility\n";
    const rows = routingRules.map((r, idx) => 
      `"${idx + 1}","${(r.trigger || '').replace(/"/g, '""')}","${(r.approverGroup || '').replace(/"/g, '""')}","${(r.areaOfResponsibility || '').replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SDC_NOP_Statutory_Routing_Matrix_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback("Approval Matrix CSV exported.");
  };

  if (!canAccessSettingsWorkspace) {
    return (
      <div style={{ background: "#FFFFFF", border: "1px dashed var(--border-color)", borderRadius: "12px", padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>Access Denied</div>
        <div style={{ fontSize: "13px", marginBottom: "12px" }}>
          You do not have permission to view NOP System Configuration &amp; Rule Engine.
        </div>
        <Link href="/nops" className="btn btn-secondary btn-sm" style={{ marginTop: "8px", display: "inline-flex" }}>Back to Register</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {isReadOnly && (
        <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", color: "#334155", padding: "12px 18px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
          <IconInfo size={18} />
          <span><strong>Read-Only Mode:</strong> You are viewing NOP System Policies and Configurations in audit inspection mode. Configuration changes and data exports are restricted to NOP Operations Admin.</span>
        </div>
      )}
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 10000,
          background: "#0F172A",
          color: "#FFFFFF",
          padding: "12px 20px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{ color: "#22C55E" }}>✓</span>
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Page Header Bar */}
      <div className="page-header-bar glass" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="title-section">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Link href="/nops" style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "none" }}>
              No Objection Permit
            </Link>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#EA580C" }}>System Configuration</span>
          </div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-main)", margin: "4px 0" }}>
            NOP System Configuration &amp; Rule Engine
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
            Configure approver groups, statutory routing rules, island blackout calendar, SLA policies, and notification triggers.
          </p>
        </div>

        {!isReadOnly && hasNopPermission(role, "nop.export_xlsx") && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportMatrixCsv}
              style={{ fontWeight: 700, fontSize: "12px" }}
            >
              Export Matrix CSV
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs with Category Headings */}
      <div className="glass" style={{ padding: "10px 16px 0 16px", display: "flex", alignItems: "flex-end", gap: "20px", background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)", overflowX: "auto" }}>
        {/* Category: Approvals */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#EA580C", textTransform: "uppercase", paddingLeft: "8px" }}>Approvals</span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => setActiveAdminTab("groups")}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeAdminTab === "groups" ? "2px solid #FF8200" : "2px solid transparent",
                color: activeAdminTab === "groups" ? "#FF8200" : "var(--text-muted)",
                padding: "8px 12px",
                fontSize: "12.5px",
                fontWeight: activeAdminTab === "groups" ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Approver Groups ({approverGroups.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab("routing")}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeAdminTab === "routing" ? "2px solid #FF8200" : "2px solid transparent",
                color: activeAdminTab === "routing" ? "#FF8200" : "var(--text-muted)",
                padding: "8px 12px",
                fontSize: "12.5px",
                fontWeight: activeAdminTab === "routing" ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Approval Routing Matrix ({routingRules.length} Rules)
            </button>
          </div>
        </div>

        {/* Vertical Separator */}
        <div style={{ width: "1px", height: "34px", background: "var(--border-color)", marginBottom: "6px" }} />

        {/* Category: Policies & notifications */}
        {/* Category: Policies */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563EB", textTransform: "uppercase", paddingLeft: "8px" }}>Policies &amp; Governance</span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => setActiveAdminTab("blackouts")}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeAdminTab === "blackouts" ? "2px solid #FF8200" : "2px solid transparent",
                color: activeAdminTab === "blackouts" ? "#FF8200" : "var(--text-muted)",
                padding: "8px 12px",
                fontSize: "12.5px",
                fontWeight: activeAdminTab === "blackouts" ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Island Blackout Dates ({blackouts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab("sla")}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeAdminTab === "sla" ? "2px solid #FF8200" : "2px solid transparent",
                color: activeAdminTab === "sla" ? "#FF8200" : "var(--text-muted)",
                padding: "8px 12px",
                fontSize: "12.5px",
                fontWeight: activeAdminTab === "sla" ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Document Completion &amp; SLA
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab("urgent_docs")}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeAdminTab === "urgent_docs" ? "2px solid #FF8200" : "2px solid transparent",
                color: activeAdminTab === "urgent_docs" ? "#FF8200" : "var(--text-muted)",
                padding: "8px 12px",
                fontSize: "12.5px",
                fontWeight: activeAdminTab === "urgent_docs" ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Urgent NOP Classification
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab("config_audit")}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeAdminTab === "config_audit" ? "2px solid #FF8200" : "2px solid transparent",
                color: activeAdminTab === "config_audit" ? "#FF8200" : "var(--text-muted)",
                padding: "8px 12px",
                fontSize: "12.5px",
                fontWeight: activeAdminTab === "config_audit" ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Config Audit Log ({configAuditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: APPROVER GROUPS MANAGEMENT */}
      {activeAdminTab === "groups" && (
        <div style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
            {/* Top Toolbar */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div>
                <h2 style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#0F172A",
                  margin: 0,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase"
                }}>
                  APPROVER GROUPS MANAGEMENT
                </h2>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "3px" }}>
                  {approverGroups.length} groups &bull; All groups have active reviewer members assigned
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search group, member..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  style={{ width: "240px", fontSize: "12.5px", padding: "7px 12px" }}
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const allUsers = systemUsers.length > 0 ? systemUsers : getUsers();
                      const defaultFirstMember = allUsers.find(u => u.role === "Technical Approver" && u.status === "Active")?.name || "Tan Kian Seng";
                      setGroupModalItem({
                        name: "",
                        description: "",
                        members: [defaultFirstMember]
                      });
                      setIsNewGroupItem(true);
                      setGroupMemberSearch("");
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      background: "#FF8200",
                      color: "#FFFFFF",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(255, 130, 0, 0.25)"
                    }}
                  >
                    <IconPlus size={14} />
                    <span>Create Approver Group</span>
                  </button>
                )}
              </div>
            </div>

            {/* Approver Groups Table */}
            <div style={{
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#FFFFFF"
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", width: "45px", textAlign: "center" }}>
                        #
                      </th>
                      <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", minWidth: "260px" }}>
                        GROUP NAME &amp; SCOPE
                      </th>
                      <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", minWidth: "260px" }}>
                        ASSIGNED MEMBERS
                      </th>
                      <th style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", width: "110px", textAlign: "center" }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {approverGroups
                      .filter(g => {
                        if (!catalogSearch) return true;
                        const q = catalogSearch.toLowerCase();
                        const matchName = g.name.toLowerCase().includes(q);
                        const matchDesc = g.description && g.description.toLowerCase().includes(q);
                        const matchMember = g.members && g.members.some(m => m.toLowerCase().includes(q));
                        return matchName || matchDesc || matchMember;
                      })
                      .map((item, idx) => {
                        const members = item.members && item.members.length > 0 ? item.members : ["Tan Kian Seng"];
                        const isSelected = groupModalItem?.id === item.id;
                        const linkedRules = routingRules.filter(r => r.groupId === item.id || r.approverGroup === item.name);

                        return (
                          <tr
                            key={item.id || idx}
                            style={{
                              borderBottom: "1px solid #F1F5F9",
                              borderLeft: isSelected ? "3px solid #FF8200" : "3px solid transparent",
                              background: isSelected ? "#FFFBF5" : idx % 2 === 0 ? "#FFFFFF" : "#FAFBFD",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <td style={{ padding: "14px", textAlign: "center", fontWeight: 700, color: isSelected ? "#FF8200" : "#94A3B8", verticalAlign: "middle" }}>
                              {idx + 1}
                            </td>

                            <td style={{ padding: "14px", verticalAlign: "middle" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontWeight: 800, color: "#0F172A", fontSize: "13px" }}>
                                  {item.name}
                                </span>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0" }}>
                                  {item.id.toUpperCase()}
                                </span>
                              </div>
                              {item.description && (
                                <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: "3px", lineHeight: "1.4" }}>
                                  {item.description}
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "5px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "1px 7px", borderRadius: "10px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                                  {linkedRules.length} linked {linkedRules.length === 1 ? "rule" : "rules"}
                                </span>
                              </div>
                            </td>

                            <td style={{ padding: "14px", verticalAlign: "middle" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                                {members.map((mName, mIdx) => (
                                  <span
                                    key={mIdx}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      background: "#FFFFFF",
                                      border: "1px solid #CBD5E1",
                                      borderRadius: "6px",
                                      padding: "3px 8px",
                                      fontSize: "11.5px",
                                      color: "#0F172A",
                                      fontWeight: 600,
                                      boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                                    }}
                                  >
                                    {mName}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td style={{ padding: "14px", textAlign: "center", verticalAlign: "middle" }}>
                              <div style={{ display: "flex", justifyContent: "center", gap: "6px", alignItems: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGroupModalItem({ ...item, members: members });
                                    setIsNewGroupItem(false);
                                    setGroupMemberSearch("");
                                  }}
                                  style={{
                                    height: "30px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "0 10px",
                                    borderRadius: "6px",
                                    fontSize: "11.5px",
                                    fontWeight: 600,
                                    background: "#FFFFFF",
                                    border: "1px solid #CBD5E1",
                                    color: "#1E293B",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease"
                                  }}
                                  title={isReadOnly ? "View group details" : "Edit group"}
                                >
                                  <IconEdit size={12} color="#475569" />
                                  <span>{isReadOnly ? "View" : "Edit"}</span>
                                </button>
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteGroup(item.id)}
                                    disabled={!canEdit}
                                    style={{
                                      height: "30px",
                                      width: "30px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: 0,
                                      borderRadius: "6px",
                                      border: "1px solid #FECACA",
                                      background: "#FEF2F2",
                                      color: "#DC2626",
                                      cursor: canEdit ? "pointer" : "not-allowed",
                                      opacity: canEdit ? 1 : 0.5,
                                      transition: "all 0.15s ease"
                                    }}
                                    title={canEdit ? "Delete group" : "Read-only"}
                                  >
                                    <IconTrash2 size={13} color="#DC2626" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* TAB 2: APPROVAL ROUTING MATRIX */}
      {activeAdminTab === "routing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            {/* Toolbar */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div>
                <h2 style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#0F172A",
                  margin: 0,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase"
                }}>
                  APPROVAL ROUTING MATRIX
                </h2>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "3px" }}>
                  {routingRules.length} statutory trigger{routingRules.length === 1 ? "" : "s"} &bull; Maps work involvement to designated approver group (FRD &sect;5.6)
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search trigger, group, area..."
                  value={routingSearch}
                  onChange={(e) => setRoutingSearch(e.target.value)}
                  style={{ width: "260px", fontSize: "12.5px", padding: "7px 12px" }}
                />
              </div>
            </div>

            {/* Routing Rules Table */}
            <div style={{
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#FFFFFF"
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <th style={{ padding: "12px 14px", width: "45px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>#</th>
                      <th style={{ padding: "12px 14px", minWidth: "300px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Statutory Work Involvement Trigger</th>
                      <th style={{ padding: "12px 14px", minWidth: "220px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Approver Group (Pool)</th>
                      <th style={{ padding: "12px 14px", minWidth: "300px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Area of Responsibility</th>
                      <th style={{ padding: "12px 14px", textAlign: "center", width: "90px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routingRules
                      .filter(r => {
                        if (!routingSearch) return true;
                        const q = routingSearch.toLowerCase();
                        return (
                          r.trigger.toLowerCase().includes(q) ||
                          (r.approverGroup && r.approverGroup.toLowerCase().includes(q)) ||
                          (r.areaOfResponsibility && r.areaOfResponsibility.toLowerCase().includes(q))
                        );
                      })
                      .map((rule, idx) => {
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9", background: idx % 2 === 0 ? "#FFFFFF" : "#FAFBFD" }}>
                            <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#94A3B8" }}>{idx + 1}</td>
                            <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                              <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "13px" }}>{rule.trigger}</div>
                            </td>
                            <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const grp = approverGroups.find(g => g.name === (rule.approverGroup || "SDC Central Operations Group"));
                                  if (grp) {
                                    setGroupModalItem({ ...grp });
                                    setIsNewGroupItem(false);
                                    setGroupMemberSearch("");
                                  } else {
                                    setActiveAdminTab("groups");
                                  }
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: "#EFF6FF",
                                  border: "1px solid #BFDBFE",
                                  color: "#1D4ED8",
                                  fontWeight: 700,
                                  fontSize: "11.5px",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease"
                                }}
                                onMouseEnter={e => {
                                  (e.currentTarget as HTMLElement).style.background = "#DBEAFE";
                                  (e.currentTarget as HTMLElement).style.borderColor = "#93C5FD";
                                }}
                                onMouseLeave={e => {
                                  (e.currentTarget as HTMLElement).style.background = "#EFF6FF";
                                  (e.currentTarget as HTMLElement).style.borderColor = "#BFDBFE";
                                }}
                                title="Click to view & manage group details"
                              >
                                <span>{rule.approverGroup || "SDC Central Operations Group"}</span>
                                <span style={{ fontSize: "10px", color: "#2563EB" }}>↗</span>
                              </button>
                            </td>
                            <td style={{ padding: "12px 14px", verticalAlign: "top", color: "#475569", fontSize: "12px", lineHeight: "1.4" }}>
                              {rule.areaOfResponsibility || "—"}
                            </td>


                            <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "top" }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditRule(idx)}
                                disabled={!canEdit}
                                title={canEdit ? "Edit rule" : "Read-only"}
                                style={{
                                  height: "30px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "0 10px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  borderRadius: "6px",
                                  border: "1px solid #CBD5E1",
                                  background: "#FFFFFF",
                                  color: "#1E293B",
                                  cursor: canEdit ? "pointer" : "not-allowed",
                                  transition: "all 0.15s ease"
                                }}
                                onMouseEnter={e => {
                                  if (canEdit) {
                                    (e.currentTarget as HTMLElement).style.background = "#F8FAFC";
                                    (e.currentTarget as HTMLElement).style.borderColor = "#94A3B8";
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (canEdit) {
                                    (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                                    (e.currentTarget as HTMLElement).style.borderColor = "#CBD5E1";
                                  }
                                }}
                              >
                                <IconEdit size={12} color="#475569" />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ISLAND BLACKOUT DATES */}
      {activeAdminTab === "blackouts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: 0, textTransform: "uppercase" }}>
                  ISLAND OPERATIONS BLACKOUT CALENDAR
                </h2>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "3px" }}>
                  Defines major festival, marathon, and VIP movement moratorium windows across island sectors.
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleOpenNewBlackoutModal}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #FF8200 0%, #EA580C 100%)",
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(255, 130, 0, 0.25)"
                  }}
                >
                  <IconPlus size={14} />
                  <span>Configure New Blackout</span>
                </button>
              )}
            </div>

            {/* Automatic Enforcement Rule Note */}
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "12.5px", color: "#1E40AF" }}>
              <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                <IconShieldCheck size={16} color="#1D4ED8" />
                <span>Automatic Island-Wide Weekend &amp; Singapore Public Holiday Enforcement</span>
              </div>
              <div style={{ marginTop: "4px", fontSize: "12px" }}>
                All Saturdays, Sundays, and Singapore Statutory Public Holidays are automatically included as blackout warning dates across the permit engine.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "14px" }}>
              {blackouts.map((bo) => {
                const isTotal = bo.restrictionLevel === "Total Blackout";
                const isNoHeavy = bo.restrictionLevel === "No Heavy Machinery";
                const badgeBg = isTotal ? "#FEE2E2" : isNoHeavy ? "#FEF3C7" : "#EEF2FF";
                const badgeColor = isTotal ? "#991B1B" : isNoHeavy ? "#92400E" : "#3730A3";
                const badgeBorder = isTotal ? "#FCA5A5" : isNoHeavy ? "#FDE68A" : "#C7D2FE";

                return (
                  <div
                    key={bo.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-primary, #FF8200)", letterSpacing: "0.03em" }}>
                          {bo.id}
                        </span>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: badgeBg,
                          color: badgeColor,
                          border: `1px solid ${badgeBorder}`,
                          whiteSpace: "nowrap"
                        }}>
                          {bo.restrictionLevel}
                        </span>
                      </div>
                      <h4 style={{ margin: "8px 0 0 0", fontSize: "14px", fontWeight: 800, color: "#0F172A" }}>{bo.name}</h4>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "6px" }}>
                        <strong>Window:</strong> {bo.startDate} &rarr; {bo.endDate}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                        <strong>Affected Sectors:</strong> {bo.zones.join(", ")}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", borderTop: "1px solid #F1F5F9", paddingTop: "10px" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditBlackoutModal(bo)}
                        disabled={!canEdit}
                        style={{
                          height: "30px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "0 12px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          borderRadius: "6px",
                          border: "1px solid #CBD5E1",
                          background: "#FFFFFF",
                          color: "#1E293B",
                          cursor: canEdit ? "pointer" : "not-allowed",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={e => {
                          if (canEdit) {
                            (e.currentTarget as HTMLElement).style.background = "#F8FAFC";
                            (e.currentTarget as HTMLElement).style.borderColor = "#94A3B8";
                          }
                        }}
                        onMouseLeave={e => {
                          if (canEdit) {
                            (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                            (e.currentTarget as HTMLElement).style.borderColor = "#CBD5E1";
                          }
                        }}
                        title={canEdit ? "Edit blackout window" : "Read-only"}
                      >
                        <IconEdit size={12} color="#475569" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlackout(bo.id)}
                        disabled={!canEdit}
                        style={{
                          height: "30px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "0 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          color: "#DC2626",
                          border: "1px solid #E2E8F0",
                          background: "#FFFFFF",
                          borderRadius: "6px",
                          cursor: canEdit ? "pointer" : "not-allowed",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={e => {
                          if (canEdit) {
                            (e.currentTarget as HTMLElement).style.background = "#FEF2F2";
                            (e.currentTarget as HTMLElement).style.borderColor = "#FECACA";
                          }
                        }}
                        onMouseLeave={e => {
                          if (canEdit) {
                            (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                            (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0";
                          }
                        }}
                        title={canEdit ? "Remove blackout" : "Read-only"}
                      >
                        <IconTrash2 size={13} color="#DC2626" />
                        <span>Remove Blackout</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENT COMPLETION & REVIEW POLICIES */}
      {activeAdminTab === "sla" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            padding: "24px",
            maxWidth: "680px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: "0 0 4px 0", textTransform: "uppercase" }}>
              DOCUMENT COMPLETION &amp; SLA POLICIES
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "12.5px", color: "#64748B" }}>
              Configure continuous 24-hour calendar days allowed for contractor to submit remaining deferred documents post-IPA grant.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {slaError && (
                <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", color: "#B91C1C", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600 }}>
                  {slaError}
                </div>
              )}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", display: "block", marginBottom: "6px" }}>
                  Continuous 24h Document-Completion Period N (Days) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  disabled={!canEdit}
                  value={slaPolicyDaysN}
                  onChange={(e) => setSlaPolicyDaysN(Number(e.target.value))}
                  className="form-control"
                  style={{ width: "100%", fontSize: "13px", padding: "8px 12px" }}
                />
              </div>

              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", color: "#92400E" }}>
                <strong>Policy Rule:</strong> Changes to period N apply exclusively to In-Principle Approvals granted after this update.
              </div>

              {canEdit && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveSlaPolicy}
                  style={{
                    fontWeight: 700,
                    width: "fit-content",
                    padding: "8px 20px",
                    borderRadius: "6px",
                    background: "var(--color-primary, #FF8200)",
                    borderColor: "var(--color-primary, #FF8200)"
                  }}
                >
                  Save SLA Policy
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: URGENT NOP CLASSIFICATION */}
      {activeAdminTab === "urgent_docs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: "0 0 4px 0", textTransform: "uppercase" }}>
              URGENT NOP CLASSIFICATION &amp; DEFERRABLE DOCUMENTS
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "12.5px", color: "#64748B" }}>
              For urgent permits (where the work start date is fewer than 7 days from the submission date), configure which supporting document categories are strictly required upfront versus those that can be deferred and submitted after the In-Principle Approval (IPA) is granted.
            </p>

            <div style={{
              background: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderLeft: "4px solid #3B82F6",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "24px",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start"
            }}>
              <span style={{ color: "#3B82F6", marginTop: "2px", flexShrink: 0, display: "inline-flex" }}>
                <IconInfo size={20} />
              </span>
              <div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>How Deferrable Documents Work</h4>
                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>
                  <li><strong>Mandatory Upfront:</strong> The applicant MUST upload this document before the system allows routing the Urgent NOP for approval.</li>
                  <li><strong>Deferrable Post-IPA:</strong> The applicant can submit the Urgent NOP without this document. They must provide it within the SLA period (currently {slaPolicyDaysN} days) after receiving In-Principle Approval.</li>
                  <li><strong>Optional:</strong> These documents are inherently optional and are never strictly required at submission.</li>
                </ul>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {SUPPORTING_DOCUMENT_SCHEDULE.filter((d) => d.category !== "Baseline").map((doc) => {
                const isDeferrable = !!urgentDocClassification[doc.id];
                const isOptional = doc.category === "Optional";

                return (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: isDeferrable ? "1px solid #FDE68A" : "1px solid #E2E8F0",
                      padding: "16px",
                      borderRadius: "10px",
                      background: isDeferrable ? "#FFFBEB" : "#FFFFFF",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ maxWidth: "55%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <h4 style={{ margin: 0, fontWeight: 800, color: "#0F172A", fontSize: "13.5px" }}>
                          {doc.name}
                        </h4>
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#475569",
                          background: "#F1F5F9",
                          border: "1px solid #CBD5E1",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          textTransform: "uppercase"
                        }}>
                          {doc.category}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.4" }}>{doc.description}</div>
                    </div>

                    <div style={{ width: "40%", display: "flex", justifyContent: "flex-end" }}>
                      {isOptional ? (
                        <div style={{
                          padding: "8px 16px",
                          background: "#F8FAFC",
                          border: "1px dashed #CBD5E1",
                          borderRadius: "8px",
                          color: "#64748B",
                          fontSize: "12px",
                          fontWeight: 600,
                          textAlign: "center",
                          width: "100%"
                        }}>
                          Optional Document (No deferral logic needed)
                        </div>
                      ) : (
                        <div style={{ display: "flex", background: "#F1F5F9", padding: "4px", borderRadius: "8px", width: "100%", gap: "4px" }}>
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => {
                              if (isDeferrable && canEdit) handleToggleUrgentDocDeferrable(doc.id);
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              cursor: canEdit && isDeferrable ? "pointer" : "default",
                              background: !isDeferrable ? "#FFFFFF" : "transparent",
                              color: !isDeferrable ? "#0F172A" : "#64748B",
                              boxShadow: !isDeferrable ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                              transition: "all 0.2s"
                            }}
                          >
                            <span style={{ color: !isDeferrable ? "#DC2626" : "transparent", marginRight: "4px" }}>●</span>
                            Mandatory Upfront
                          </button>
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => {
                              if (!isDeferrable && canEdit) handleToggleUrgentDocDeferrable(doc.id);
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              cursor: canEdit && !isDeferrable ? "pointer" : "default",
                              background: isDeferrable ? "#FFFFFF" : "transparent",
                              color: isDeferrable ? "#B45309" : "#64748B",
                              boxShadow: isDeferrable ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                              transition: "all 0.2s"
                            }}
                          >
                            <span style={{ color: isDeferrable ? "#F59E0B" : "transparent", marginRight: "4px" }}>●</span>
                            Deferrable Post-IPA
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-start", borderTop: "1px solid #E2E8F0", paddingTop: "20px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveUrgentDocClassification}
                disabled={!urgentDocDirty || !canEdit}
                style={{
                  fontWeight: 700,
                  width: "fit-content",
                  padding: "8px 20px",
                  borderRadius: "6px",
                  background: "var(--color-primary, #FF8200)",
                  borderColor: "var(--color-primary, #FF8200)",
                  opacity: urgentDocDirty && canEdit ? 1 : 0.5,
                  cursor: urgentDocDirty && canEdit ? "pointer" : "not-allowed"
                }}
              >
                Save Urgent NOP Classification
              </button>
            </div>
          </div>
        </div>
      )}


      {/* TAB 8: SYSTEM CONFIGURATION AUDIT TRAIL (CFG-04) */}
      {activeAdminTab === "config_audit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: 0, textTransform: "uppercase" }}>
                  SYSTEM CONFIGURATION AUDIT LOG
                </h2>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "3px" }}>
                  Immutable audit trail of all policy, routing, group, blackout, and SLA configuration changes
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Search config changes..."
                  value={configAuditSearch}
                  onChange={(e) => setConfigAuditSearch(e.target.value)}
                  className="form-control"
                  style={{ width: "260px", fontSize: "12px", padding: "7px 12px" }}
                />
              </div>
            </div>

            <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  <tr>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Timestamp</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Actor &amp; Role</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Configuration Action</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Details / Specification</th>
                  </tr>
                </thead>
                <tbody>
                  {configAuditLogs
                    .filter((log) => {
                      if (!configAuditSearch.trim()) return true;
                      const q = configAuditSearch.toLowerCase();
                      return (
                        (log.actor && log.actor.toLowerCase().includes(q)) ||
                        (log.role && log.role.toLowerCase().includes(q)) ||
                        (log.action && log.action.toLowerCase().includes(q)) ||
                        (log.comment && log.comment.toLowerCase().includes(q))
                      );
                    })
                    .length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>
                        No system configuration audit records recorded yet. Any policy or routing modifications will be immutably tracked here.
                      </td>
                    </tr>
                  ) : (
                    configAuditLogs
                      .filter((log) => {
                        if (!configAuditSearch.trim()) return true;
                        const q = configAuditSearch.toLowerCase();
                        return (
                          (log.actor && log.actor.toLowerCase().includes(q)) ||
                          (log.role && log.role.toLowerCase().includes(q)) ||
                          (log.action && log.action.toLowerCase().includes(q)) ||
                          (log.comment && log.comment.toLowerCase().includes(q))
                        );
                      })
                      .map((log) => (
                        <tr key={log.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>
                            {log.timestamp ? log.timestamp.replace("T", " ").substring(0, 19) : "Just now"}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <strong>{log.actor || "Administrator"}</strong>
                            <div style={{ color: "#64748B", fontSize: "11px" }}>{log.role || "NOP Operations Admin"}</div>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "10.5px",
                              fontWeight: 700,
                              background: "#EFF6FF",
                              color: "#2563EB",
                              border: "1px solid #DBEAFE"
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "#1E293B" }}>
                            <div>{log.comment}</div>
                            {(log.before !== undefined || log.after !== undefined) && (
                              <div style={{ marginTop: "6px", fontSize: "11px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 10px" }}>
                                {log.before !== undefined && (
                                  <div style={{ color: "#B91C1C", marginBottom: "2px" }}>
                                    <span style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>Before:</span>{" "}
                                    <code>{typeof log.before === "object" ? JSON.stringify(log.before) : String(log.before)}</code>
                                  </div>
                                )}
                                {log.after !== undefined && (
                                  <div style={{ color: "#15803D" }}>
                                    <span style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "10px" }}>After:</span>{" "}
                                    <code>{typeof log.after === "object" ? JSON.stringify(log.after) : String(log.after)}</code>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* MODAL: EDIT / ADD ROUTING RULE */}
      {editingRuleIdx !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "24px"
          }}
          onClick={() => setEditingRuleIdx(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "600px",
              padding: "24px 28px",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
              border: "1px solid #CBD5E1"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
                Edit Statutory Routing Rule
              </h3>
              <button
                type="button"
                onClick={() => setEditingRuleIdx(null)}
                style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", display: "block", marginBottom: "4px" }}>
                  Statutory Work Involvement Trigger
                </label>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", lineHeight: 1.5, wordBreak: "break-word" }}>
                  {ruleForm.trigger || "—"}
                </div>
              </div>

              {/* Approver Group Configuration */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", margin: 0 }}>
                    Approver Group (Pool) <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  {(() => {
                    const grp = approverGroups.find(g => (ruleForm.groupId && g.id === ruleForm.groupId) || g.name === ruleForm.approverGroup);
                    return grp ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRuleIdx(null);
                          setGroupModalItem({ ...grp });
                          setIsNewGroupItem(false);
                          setGroupMemberSearch("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-primary, #FF8200)",
                          fontWeight: 700,
                          fontSize: "11px",
                          cursor: "pointer",
                          padding: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px"
                        }}
                        title="Open group members & configuration modal"
                      >
                        <span>↗ View Group Details</span>
                      </button>
                    ) : null;
                  })()}
                </div>
                <select
                  className="form-control"
                  value={
                    ruleForm.groupId ||
                    approverGroups.find(g => g.name === ruleForm.approverGroup)?.id ||
                    approverGroups[0]?.id ||
                    "g1"
                  }
                  onChange={(e) => {
                    const sel = approverGroups.find(g => g.id === e.target.value);
                    setRuleForm({
                      ...ruleForm,
                      groupId: sel?.id,
                      approverGroup: sel?.name || ruleForm.approverGroup
                    });
                  }}
                  style={{ width: "100%", fontSize: "12.5px", background: "#FFFFFF" }}
                >
                  {approverGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.id.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", display: "block", marginBottom: "4px" }}>
                  Area of Responsibility
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Transit rail guideway structural buffer and emergency stop integration (Optional)"
                  value={ruleForm.areaOfResponsibility || ""}
                  onChange={(e) => setRuleForm({ ...ruleForm, areaOfResponsibility: e.target.value })}
                  style={{ width: "100%", fontSize: "12.5px" }}
                />
              </div>





              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px", borderTop: "1px solid #E2E8F0", paddingTop: "14px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingRuleIdx(null)} style={{ fontSize: "12.5px" }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveRuleModal}
                  style={{ fontSize: "12.5px", fontWeight: 700, background: "var(--color-primary, #FF8200)", borderColor: "var(--color-primary, #FF8200)" }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT APPROVER GROUP */}
      {groupModalItem !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "20px"
          }}
          onClick={() => {
            setGroupModalItem(null);
            setGroupMemberSearch("");
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "760px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
              overflow: "hidden",
              border: "1px solid #CBD5E1"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: "18px 24px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
              background: "#F8FAFC"
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "#0F172A",
                  letterSpacing: "0.01em",
                  textTransform: "uppercase"
                }}>
                  {isNewGroupItem ? "CREATE APPROVER GROUP" : "EDIT APPROVER GROUP"}
                </h3>
                <div style={{ fontSize: "12.5px", color: "#64748B", marginTop: "3px" }}>
                  Update group details and assigned members.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGroupModalItem(null);
                  setGroupMemberSearch("");
                }}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748B",
                  fontSize: "14px",
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}>
              {/* SECTION 1: GROUP CORE CONFIGURATION */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                padding: "16px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px"
              }}>
                <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Group Information
                </div>

                <div>
                  <label style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1E293B",
                    display: "block",
                    marginBottom: "5px"
                  }}>
                    Group Name <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    disabled={isReadOnly}
                    placeholder="e.g. Sentosa Express Engineering Group"
                    value={groupModalItem.name || ""}
                    onChange={e => setGroupModalItem({ ...groupModalItem, name: e.target.value })}
                    style={{ width: "100%", fontSize: "13px", padding: "8px 12px", fontWeight: 600, background: isReadOnly ? "#F1F5F9" : "#FFFFFF" }}
                  />
                </div>

                <div>
                  <label style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1E293B",
                    display: "block",
                    marginBottom: "5px"
                  }}>
                    Scope &amp; Description
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    disabled={isReadOnly}
                    placeholder="Brief description of approval pool scope and responsibilities..."
                    value={groupModalItem.description || ""}
                    onChange={e => setGroupModalItem({ ...groupModalItem, description: e.target.value })}
                    style={{ width: "100%", fontSize: "12.5px", padding: "8px 12px", background: isReadOnly ? "#F1F5F9" : "#FFFFFF" }}
                  />
                </div>
              </div>

              {/* SECTION 2: ADD MEMBERS & MEMBERS LIST */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                padding: "16px",
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "10px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Group Members
                  </div>
                  <span style={{
                    fontSize: "11.5px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: (groupModalItem.members || []).length > 0 ? "#DCFCE7" : "#FEE2E2",
                    color: (groupModalItem.members || []).length > 0 ? "#15803D" : "#B91C1C",
                    border: `1px solid ${(groupModalItem.members || []).length > 0 ? "#86EFAC" : "#FCA5A5"}`
                  }}>
                    {(groupModalItem.members || []).length} Member(s) {(groupModalItem.members || []).length === 0 ? "— (Min 1 required)" : ""}
                  </span>
                </div>

                {/* ADD MEMBERS CONTROLS */}
                {!isReadOnly && (
                <div style={{
                  padding: "12px",
                  background: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0"
                }}>
                  {/* Search by Name or Email */}
                  <div style={{ position: "relative" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                      Search User by Name or Email to Add:
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type name or email (e.g. Tan, firdaus, @sentosa)..."
                        value={groupMemberSearch}
                        onChange={e => setGroupMemberSearch(e.target.value)}
                        style={{ width: "100%", fontSize: "12px", padding: "7px 28px 7px 10px", borderRadius: "6px" }}
                      />
                      {groupMemberSearch && (
                        <button
                          type="button"
                          onClick={() => setGroupMemberSearch("")}
                          style={{
                            position: "absolute",
                            right: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#94A3B8",
                            fontSize: "12px",
                            fontWeight: 700
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* LIVE SEARCH AUTOCOMPLETE DROPDOWN */}
                    {groupMemberSearch.trim().length > 0 && (
                      <div style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
                        maxHeight: "180px",
                        overflowY: "auto",
                        zIndex: 50,
                        padding: "4px"
                      }}>
                        {(() => {
                          const allUsers = systemUsers.length > 0 ? systemUsers : getUsers();
                          const q = groupMemberSearch.toLowerCase();
                          const matching = allUsers.filter(u => 
                            u.status === "Active" && 
                            (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.title && u.title.toLowerCase().includes(q)))
                          );

                          if (matching.length === 0) {
                            return (
                              <div style={{ padding: "10px", fontSize: "12px", color: "#64748B", textAlign: "center" }}>
                                No active user found matching &quot;{groupMemberSearch}&quot;
                              </div>
                            );
                          }

                          return matching.map(u => {
                            const cur = groupModalItem.members || [];
                            const isAdded = cur.includes(u.name);
                            return (
                              <div
                                key={u.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "7px 10px",
                                  borderRadius: "6px",
                                  background: isAdded ? "#F0FDF4" : "transparent",
                                  borderBottom: "1px solid #F1F5F9",
                                  fontSize: "12px"
                                }}
                              >
                                <div style={{ minWidth: 0, marginRight: "8px" }}>
                                  <div style={{ fontWeight: 700, color: "#0F172A" }}>{u.name}</div>
                                  <div style={{ color: "#64748B", fontSize: "11px" }}>
                                    {u.email} {u.role ? `• ${u.role}` : ""} {u.title ? `(${u.title})` : ""}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={isAdded}
                                  onClick={() => {
                                    if (!isAdded) {
                                      setGroupModalItem({ ...groupModalItem, members: [...cur, u.name] });
                                      setGroupMemberSearch("");
                                    }
                                  }}
                                  style={{
                                    fontSize: "11px",
                                    padding: "4px 10px",
                                    borderRadius: "5px",
                                    border: "none",
                                    fontWeight: 700,
                                    cursor: isAdded ? "default" : "pointer",
                                    background: isAdded ? "#E2E8F0" : "var(--color-primary, #FF8200)",
                                    color: isAdded ? "#64748B" : "#FFFFFF",
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  {isAdded ? "✓ Added" : "+ Add"}
                                </button>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* ASSIGNED MEMBERS TABLE */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Assigned Members List ({(groupModalItem.members || []).length})
                    </span>
                    {!isReadOnly && (groupModalItem.members || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setGroupModalItem({ ...groupModalItem, members: [] })}
                        style={{
                          fontSize: "11px",
                          color: "#DC2626",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                          padding: 0
                        }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {(groupModalItem.members || []).length > 0 ? (
                    <div style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      overflow: "hidden",
                      maxHeight: "220px",
                      overflowY: "auto"
                    }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                        <thead>
                          <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Name</th>
                            <th style={{ padding: "8px 12px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Email</th>
                            <th style={{ padding: "8px 12px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase" }}>Role / Designation</th>
                            {!isReadOnly && (
                              <th style={{ padding: "8px 12px", fontWeight: 700, color: "#475569", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>Action</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(groupModalItem.members || []).map((mName, mIdx) => {
                            const allUsers = systemUsers.length > 0 ? systemUsers : getUsers();
                            const uObj = allUsers.find(u => u.name.toLowerCase() === mName.toLowerCase() || mName.toLowerCase().includes(u.name.toLowerCase()));
                            const email = uObj ? uObj.email : "—";
                            const roleOrTitle = uObj ? (uObj.title ? `${uObj.role} • ${uObj.title}` : uObj.role) : "Approver";

                            return (
                              <tr
                                key={mIdx}
                                style={{
                                  borderBottom: "1px solid #F1F5F9",
                                  background: mIdx % 2 === 0 ? "#FFFFFF" : "#FAFBFD"
                                }}
                              >
                                <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0F172A" }}>
                                  {mName}
                                </td>
                                <td style={{ padding: "8px 12px", color: "#64748B" }}>
                                  {email}
                                </td>
                                <td style={{ padding: "8px 12px", color: "#334155" }}>
                                  <span style={{ fontSize: "10.5px", background: "#E2E8F0", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                                    {roleOrTitle}
                                  </span>
                                </td>
                                {!isReadOnly && (
                                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur = groupModalItem.members || [];
                                        setGroupModalItem({ ...groupModalItem, members: cur.filter(m => m !== mName) });
                                      }}
                                      style={{
                                        border: "1px solid #FECACA",
                                        background: "#FEF2F2",
                                        color: "#DC2626",
                                        borderRadius: "6px",
                                        width: "28px",
                                        height: "28px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease"
                                      }}
                                      onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.background = "#DC2626";
                                        (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                                        (e.currentTarget as HTMLElement).style.borderColor = "#DC2626";
                                      }}
                                      onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.background = "#FEF2F2";
                                        (e.currentTarget as HTMLElement).style.color = "#DC2626";
                                        (e.currentTarget as HTMLElement).style.borderColor = "#FECACA";
                                      }}
                                      title="Remove member from group"
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                      </svg>
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{
                      padding: "14px",
                      borderRadius: "8px",
                      background: "#FEF2F2",
                      border: "1px dashed #FCA5A5",
                      fontSize: "12px",
                      color: "#B91C1C",
                      fontWeight: 600,
                      textAlign: "center"
                    }}>
                      ⚠️ No members assigned to this group yet. Please search and add at least 1 member above to save.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid #E2E8F0",
              background: "#F8FAFC",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0
            }}>
              <div style={{ fontSize: "12px" }}>
                {(groupModalItem.members || []).length > 0 ? (
                  <span style={{ color: "#16A34A", fontWeight: 700 }}>
                    ✓ {(groupModalItem.members || []).length} member(s) assigned
                  </span>
                ) : (
                  <span style={{ color: "#DC2626", fontWeight: 700 }}>
                    ⚠️ Cannot save without members
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setGroupModalItem(null);
                    setGroupMemberSearch("");
                  }}
                  style={{ fontSize: "13px", padding: "8px 18px", borderRadius: "8px" }}
                >
                  {isReadOnly ? "Close" : "Cancel"}
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveGroupModal}
                    style={{
                      fontSize: "13px",
                      padding: "8px 24px",
                      fontWeight: 800,
                      borderRadius: "8px",
                      background: (groupModalItem.members || []).length === 0 ? "#94A3B8" : "var(--color-primary, #FF8200)",
                      borderColor: (groupModalItem.members || []).length === 0 ? "#94A3B8" : "var(--color-primary, #FF8200)",
                      cursor: (groupModalItem.members || []).length === 0 ? "not-allowed" : "pointer"
                    }}
                  >
                    {isNewGroupItem ? "Create Group" : "Save Changes"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Blackout Deletion */}
      <NopConfirmModal
        isOpen={!!deleteBlackoutId}
        title="Remove Blackout Period"
        message="Are you sure you want to remove this blackout moratorium from the island operations calendar? Contractors will no longer receive moratorium warnings for this window."
        confirmLabel="Remove Blackout"
        cancelLabel="Keep Blackout"
        variant="danger"
        onConfirm={executeDeleteBlackout}
        onCancel={() => setDeleteBlackoutId(null)}
      />



      {/* MODAL: CONFIGURE NEW BLACKOUT */}
      {showNewBlackoutModal && (
        <div
          className="modal-backdrop"
          onClick={handleCloseNewBlackoutModal}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px"
          }}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-blackout-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#FFFFFF",
              color: "var(--text-main)",
              borderRadius: "14px",
              padding: "24px 28px",
              boxShadow: "0 25px 60px -12px rgba(0,0,0,0.28)",
              border: "1px solid var(--border-color)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-primary, #FF8200)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {editingBlackoutId ? `Moratorium ID: ${editingBlackoutId}` : "Island Moratorium & Operations"}
                </span>
                <h3 id="new-blackout-modal-title" style={{ margin: "2px 0 0 0", fontSize: "17px", fontWeight: 800 }}>
                  {editingBlackoutId ? "Edit Blackout Window" : "Configure New Blackout Window"}
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                  {editingBlackoutId ? "Update dates, affected zones, or restriction levels for this island blackout moratorium." : "Define a moratorium window affecting statutory permit works across island precincts."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseNewBlackoutModal}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", borderRadius: "6px" }}
                title="Close"
              >
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBlackoutSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {blackoutModalError && (
                <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", color: "#B91C1C", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  <IconAlertTriangle size={16} />
                  <span>{blackoutModalError}</span>
                </div>
              )}

              <div>
                <label htmlFor="modal-blackout-name" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                  Blackout Event Title *
                </label>
                <input
                  id="modal-blackout-name"
                  type="text"
                  required
                  placeholder="e.g. Sentosa Mega Marathon 2026 / ZoukOut Festival..."
                  value={newBlackoutForm.name}
                  onChange={(e) => setNewBlackoutForm({ ...newBlackoutForm, name: e.target.value })}
                  className="form-control"
                  style={{ width: "100%", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                <div>
                  <label htmlFor="modal-blackout-start" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                    Start Date *
                  </label>
                  <input
                    id="modal-blackout-start"
                    type="date"
                    required
                    value={newBlackoutForm.startDate}
                    onChange={(e) => setNewBlackoutForm({ ...newBlackoutForm, startDate: e.target.value })}
                    className="form-control"
                    style={{ width: "100%", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label htmlFor="modal-blackout-end" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                    End Date *
                  </label>
                  <input
                    id="modal-blackout-end"
                    type="date"
                    required
                    min={newBlackoutForm.startDate}
                    value={newBlackoutForm.endDate}
                    onChange={(e) => setNewBlackoutForm({ ...newBlackoutForm, endDate: e.target.value })}
                    className="form-control"
                    style={{ width: "100%", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-blackout-zone" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                  Affected Precinct Zone *
                </label>
                <select
                  id="modal-blackout-zone"
                  value={newBlackoutForm.zone}
                  onChange={(e) => setNewBlackoutForm({ ...newBlackoutForm, zone: e.target.value })}
                  className="form-control select-dark"
                  style={{ width: "100%", fontSize: "13px" }}
                >
                  <option value="Siloso Beach Sector 1">Siloso Beach Sector 1</option>
                  <option value="Palawan Beach Promenade">Palawan Beach Promenade</option>
                  <option value="Imbiah Lookout Precinct">Imbiah Lookout Precinct</option>
                  <option value="Sentosa Gateway & Arterial">Sentosa Gateway &amp; Arterial</option>
                  <option value="All Island Precincts">All Island Precincts</option>
                </select>
              </div>

              <div>
                <label htmlFor="modal-blackout-restriction" style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                  Restriction Level *
                </label>
                <select
                  id="modal-blackout-restriction"
                  value={newBlackoutForm.restrictionLevel}
                  onChange={(e) => setNewBlackoutForm({ ...newBlackoutForm, restrictionLevel: e.target.value as "Total Blackout" | "No Heavy Machinery" | "Night Restriction Only" })}
                  className="form-control select-dark"
                  style={{ width: "100%", fontSize: "13px" }}
                >
                  <option value="Total Blackout">Total Blackout (All Non-Emergency Works Prohibited)</option>
                  <option value="No Heavy Machinery">No Heavy Machinery &amp; Noise (Foot Traffic Only)</option>
                  <option value="Night Restriction Only">Night Restriction Only (No Works Post 22:00)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px", paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseNewBlackoutModal}
                  style={{ fontWeight: 600, padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: 700, padding: "8px 20px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <IconCheckCircle size={15} />
                  <span>{editingBlackoutId ? "Save Changes" : "Save & Activate Blackout"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
