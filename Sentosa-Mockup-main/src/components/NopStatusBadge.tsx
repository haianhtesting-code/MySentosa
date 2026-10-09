"use client";

import React from "react";
import { NOPApplication, getEffectiveStatusBadgeProps, derivePermitStatus } from "@/lib/nopData";
import { PermitStatusIcon } from "@/components/NopIcons";

type NopStatusBadgeSize = "sm" | "md" | "lg";

const SIZE_STYLES: Record<NopStatusBadgeSize, { fontSize: string; padding: string; gap: string; iconSize: number; fontWeight: number }> = {
  sm: { fontSize: "10.5px", padding: "3px 9px", gap: "5px", iconSize: 11, fontWeight: 700 },
  md: { fontSize: "11px", padding: "3px 10px", gap: "5px", iconSize: 12, fontWeight: 700 },
  lg: { fontSize: "11px", padding: "4px 12px", gap: "6px", iconSize: 12, fontWeight: 800 },
};

interface NopStatusBadgeProps {
  nop: Pick<NOPApplication, "applicationStatus" | "permitStatus" | "startDateTime" | "endDateTime">;
  size?: NopStatusBadgeSize;
  /** Uppercase the label text (some list surfaces render every badge in caps). */
  uppercase?: boolean;
}

/**
 * Single source of truth for how a NOP's status is displayed anywhere in the app
 * (Register, Contractor Portal, Detail page, Certificate). Before this component
 * existed, each of those 4 places re-implemented the same badge JSX independently,
 * which is exactly how the "Upcoming badge shown for a Draft application" bug
 * (WEB-02) needed fixing in 4 separate files instead of one — and how the icon
 * could silently drift out of sync with the label (see below).
 *
 * The icon is only shown once the NOP is actually Approved: before that,
 * `derivePermitStatus` falls back to a placeholder permit status (commonly
 * "Upcoming") that has nothing to do with the Draft/Under Review/Change Requested
 * label actually being displayed, so showing its icon next to that label would be
 * a mismatched, misleading combination — better to show no icon at all.
 */
export function NopStatusBadge({ nop, size = "sm", uppercase = false }: NopStatusBadgeProps) {
  const badge = getEffectiveStatusBadgeProps(nop);
  const isIssued = nop.applicationStatus === "Approved";
  const s = SIZE_STYLES[size];

  return (
    <span
      className={`badge ${badge.className}`}
      style={{
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        padding: s.padding,
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        borderRadius: "9999px"
      }}
    >
      {isIssued && <PermitStatusIcon status={derivePermitStatus(nop)} size={s.iconSize} />}
      <span>{uppercase ? badge.label.toUpperCase() : badge.label}</span>
    </span>
  );
}

export default NopStatusBadge;
