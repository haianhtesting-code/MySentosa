"use client";

import React from "react";

export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
}

const baseStyle = (size: number, style?: React.CSSProperties): React.CSSProperties => ({
  width: size,
  height: size,
  flexShrink: 0,
  display: "inline-block",
  verticalAlign: "middle",
  ...style,
});

/**
 * REFINED DUO-TONE ICON SYSTEM FOR SENTOSA NOP
 * Designed from scratch:
 * - Layer 1: Soft translucent volume fill (opacity 0.14 - 0.22) for depth and optical anchoring
 * - Layer 2: Precision geometric contour stroke (1.8px) with rounded caps & joins
 * - Zero OS emoji dependency; 100% vector SVG scalable to any viewport
 */

/** Lightning Zap - for Urgent Fast-Track (<7 days) */
export const IconZap: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.18,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <polygon
      points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <polygon
      points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Check Circle - for Active permits, Full Clearance, Approved */
export const IconCheckCircle: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.9,
  fillOpacity = 0.16,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <circle
      cx="12"
      cy="12"
      r="9.5"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <circle
      cx="12"
      cy="12"
      r="9.5"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M8.2 12.2l2.6 2.6 5.2-5.2"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Clock - for Upcoming permits, Permitted Hours, SLA */
export const IconClock: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.15,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <circle
      cx="12"
      cy="12"
      r="9.5"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <circle
      cx="12"
      cy="12"
      r="9.5"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <circle cx="12" cy="12" r="1.4" fill={color} />
    <polyline
      points="12 6.8 12 12 15.5 13.8"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Alert Octagon / Stop - for Suspended permits, Stop-Work */
export const IconAlertOctagon: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.9,
  fillOpacity = 0.18,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <polygon
      points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <polygon
      points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="7.5"
      x2="12"
      y2="12.5"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
    />
    <circle cx="12" cy="16.2" r="1.3" fill={color} />
  </svg>
);

/** Alert Triangle - for Document Overdue, Change Requested, Statutory Trigger warning */
export const IconAlertTriangle: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.9,
  fillOpacity = 0.18,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="8.5"
      x2="12"
      y2="13"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
    />
    <circle cx="12" cy="16.5" r="1.2" fill={color} />
  </svg>
);

/** Ban / Circle Slash - for Cancelled / Revoked permits */
export const IconBan: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.9,
  fillOpacity = 0.16,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <circle
      cx="12"
      cy="12"
      r="9.5"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <circle
      cx="12"
      cy="12"
      r="9.5"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <line
      x1="5.3"
      y1="5.3"
      x2="18.7"
      y2="18.7"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
    />
  </svg>
);

/** Clipboard Check - for IPA Granted, Review Checklist */
export const IconClipboardCheck: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.14,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <rect
      x="5"
      y="4.5"
      width="14"
      height="16.5"
      rx="2"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <rect
      x="5"
      y="4.5"
      width="14"
      height="16.5"
      rx="2"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    {/* Clip Handle */}
    <rect
      x="8.5"
      y="2.2"
      width="7"
      height="3.6"
      rx="1"
      fill={color}
      fillOpacity={fillOpacity * 1.8}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <polyline
      points="8.5 12.5 10.8 14.8 15.5 10"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Map - for GIS Work Boundary Map */
export const IconMap: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.16,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    {/* Left Fold */}
    <polygon
      points="1 6 8 2 8 18 1 22"
      fill={color}
      fillOpacity={fillOpacity * 1.3}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Center Fold */}
    <polygon
      points="8 2 16 6 16 22 8 18"
      fill={color}
      fillOpacity={fillOpacity * 0.7}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right Fold */}
    <polygon
      points="16 6 23 2 23 18 16 22"
      fill={color}
      fillOpacity={fillOpacity * 1.5}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Map Pin - for Location & Precinct */
export const IconMapPin: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.18,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="10"
      r="3"
      fill={color}
      fillOpacity={0.9}
    />
  </svg>
);

/** Building / Contractor - for Contractor organization */
export const IconBuilding: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.15,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <rect
      x="4"
      y="3"
      width="16"
      height="18"
      rx="2"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <rect
      x="4"
      y="3"
      width="16"
      height="18"
      rx="2"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M9.5 21v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4"
      fill={color}
      fillOpacity={fillOpacity * 2}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <circle cx="8" cy="7" r="1" fill={color} />
    <circle cx="12" cy="7" r="1" fill={color} />
    <circle cx="16" cy="7" r="1" fill={color} />
    <circle cx="8" cy="11.5" r="1" fill={color} />
    <circle cx="12" cy="11.5" r="1" fill={color} />
    <circle cx="16" cy="11.5" r="1" fill={color} />
  </svg>
);

/** Phone - for PIC 24/7 Mobile */
export const IconPhone: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.16,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Shield Check - for SDC Liaison Officer / WSH */
export const IconShieldCheck: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.16,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="9 12 11.2 14.2 15.5 10"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** File Text - for Documents, Submissions, RAMS */
export const IconFileText: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.14,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <polygon
      points="14 2 14 8 20 8"
      fill={color}
      fillOpacity={fillOpacity * 1.8}
    />
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="14 2 14 8 20 8"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="8"
      y1="13"
      x2="16"
      y2="13"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <line
      x1="8"
      y1="17"
      x2="13"
      y2="17"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

/** Award / Certificate - for Digital NOP Certificate */
export const IconAward: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.18,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <polygon
      points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"
      fill={color}
      fillOpacity={fillOpacity * 0.9}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="8.5"
      r="6.5"
      fill={color}
      fillOpacity={fillOpacity * 1.5}
    />
    <circle
      cx="12"
      cy="8.5"
      r="6.5"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <circle cx="12" cy="8.5" r="2.2" fill={color} />
  </svg>
);

/** Printer - for Print Official Certificate */
export const IconPrinter: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.14,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <polyline
      points="6 9 6 2.5 18 2.5 18 9"
      fill={color}
      fillOpacity={fillOpacity * 1.4}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="3.5"
      y="9"
      width="17"
      height="8"
      rx="2"
      fill={color}
      fillOpacity={fillOpacity}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <rect
      x="6.5"
      y="14"
      width="11"
      height="7.5"
      rx="1"
      fill={color}
      fillOpacity={fillOpacity * 1.8}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="17.5" cy="11.5" r="0.9" fill={color} />
  </svg>
);

/** Upload Cloud / Tray - for document upload dropzone */
export const IconUploadCloud: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.14,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="16 15.5 12 11.5 8 15.5"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="11.5"
      x2="12"
      y2="21"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
    />
  </svg>
);

/** Download - for Export CSV / Download files */
export const IconDownload: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.14,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="7 11 12 16 17 11"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12"
      y1="16"
      x2="12"
      y2="3"
      stroke={color}
      strokeWidth={strokeWidth + 0.3}
      strokeLinecap="round"
    />
  </svg>
);

/** Search - for Search Bar & Empty state */
export const IconSearch: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.16,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <circle
      cx="11"
      cy="11"
      r="7.5"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <circle
      cx="11"
      cy="11"
      r="7.5"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <line
      x1="16.5"
      y1="16.5"
      x2="21"
      y2="21"
      stroke={color}
      strokeWidth={strokeWidth + 0.4}
      strokeLinecap="round"
    />
  </svg>
);

/** Edit - for Amend & Resubmit */
export const IconEdit: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.14,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"
      fill={color}
      fillOpacity={fillOpacity * 0.8}
    />
    <path
      d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
      fill={color}
      fillOpacity={fillOpacity * 1.8}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Inbox - for Department Approvals Queue */
export const IconInbox: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.14,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="22 12 16 12 14 15 10 15 8 12 2 12"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Calendar - for Permit Dates, Schedule, Blackouts */
export const IconCalendar: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.14,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <rect
      x="3"
      y="4.5"
      width="18"
      height="16.5"
      rx="2.5"
      fill={color}
      fillOpacity={fillOpacity}
    />
    {/* Calendar Top Banner */}
    <path
      d="M3 9.5h18V7a2.5 2.5 0 0 0-2.5-2.5H5.5A2.5 2.5 0 0 0 3 7v2.5z"
      fill={color}
      fillOpacity={fillOpacity * 1.8}
    />
    <rect
      x="3"
      y="4.5"
      width="18"
      height="16.5"
      rx="2.5"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <line
      x1="16"
      y1="2.2"
      x2="16"
      y2="5.5"
      stroke={color}
      strokeWidth={strokeWidth + 0.2}
      strokeLinecap="round"
    />
    <line
      x1="8"
      y1="2.2"
      x2="8"
      y2="5.5"
      stroke={color}
      strokeWidth={strokeWidth + 0.2}
      strokeLinecap="round"
    />
    <line
      x1="3"
      y1="9.5"
      x2="21"
      y2="9.5"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <circle cx="8" cy="14" r="1.1" fill={color} />
    <circle cx="12" cy="14" r="1.1" fill={color} />
    <circle cx="16" cy="14" r="1.1" fill={color} />
  </svg>
);

/** Eye - for Inspect dossier */
export const IconEye: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.15,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="3.5"
      fill={color}
      fillOpacity={fillOpacity * 1.8}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <circle cx="12" cy="12" r="1.4" fill={color} />
  </svg>
);

/** Arrow Right - for Next / View more links */
export const IconArrowRight: React.FC<IconProps> = ({
  size = 14,
  className,
  style,
  color = "currentColor",
  strokeWidth = 2,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M5 12h14M13 6l6 6-6 6"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Arrow Left - for Back links */
export const IconArrowLeft: React.FC<IconProps> = ({
  size = 14,
  className,
  style,
  color = "currentColor",
  strokeWidth = 2,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M19 12H5M11 18l-6-6 6-6"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Plus - for Add button */
export const IconPlus: React.FC<IconProps> = ({
  size = 14,
  className,
  style,
  color = "currentColor",
  strokeWidth = 2.2,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <line
      x1="12"
      y1="5"
      x2="12"
      y2="19"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <line
      x1="5"
      y1="12"
      x2="19"
      y2="12"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

/** X / Close - for modal close and remove buttons */
export const IconX: React.FC<IconProps> = ({
  size = 14,
  className,
  style,
  color = "currentColor",
  strokeWidth = 2.2,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <line
      x1="18"
      y1="6"
      x2="6"
      y2="18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <line
      x1="6"
      y1="6"
      x2="18"
      y2="18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

/** Git Fork / Branch - for Approval Routing Matrix */
export const IconGitFork: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.2,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <circle
      cx="12"
      cy="18"
      r="3"
      fill={color}
      fillOpacity={fillOpacity}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <circle
      cx="6"
      cy="6"
      r="3"
      fill={color}
      fillOpacity={fillOpacity}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <circle
      cx="18"
      cy="6"
      r="3"
      fill={color}
      fillOpacity={fillOpacity}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M18 9v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <path
      d="M12 12v3"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

/** User - for registered worker / PIC */
export const IconUser: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.16,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <circle
      cx="12"
      cy="7"
      r="4"
      fill={color}
      fillOpacity={fillOpacity * 1.5}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Folder - for draft submissions / archives */
export const IconFolder: React.FC<IconProps> = ({
  size = 15,
  className,
  style,
  color = "currentColor",
  strokeWidth = 1.8,
  fillOpacity = 0.15,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <path
      d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
      fill={color}
      fillOpacity={fillOpacity}
    />
    <path
      d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="2"
      y1="10"
      x2="22"
      y2="10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeOpacity={0.4}
    />
  </svg>
);

/** Luminous Status Dot */
export const StatusDot: React.FC<{ color?: string; size?: number; className?: string }> = ({
  color = "currentColor",
  size = 7,
  className,
}) => (
  <span
    className={className}
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: color,
      boxShadow: `0 0 0 2px ${color}33, 0 0 6px ${color}66`,
      display: "inline-block",
      flexShrink: 0,
    }}
  />
);

/**
 * Standardized Duo-Tone Permit Status Vector Icon matching the luxury Sentosa design system.
 * Zero emojis, rich visual depth, and consistent optical baseline.
 */
export const PermitStatusIcon: React.FC<{
  status: "Active" | "Upcoming" | "Suspended" | "Expired" | "Cancelled" | "Revoked" | "Rejected" | "Lapsed" | string;
  size?: number;
}> = ({ status, size = 12 }) => {
  switch (status) {
    case "Active":
      return <IconCheckCircle size={size} strokeWidth={2.2} fillOpacity={0.22} />;
    case "Upcoming":
      return <IconClock size={size} strokeWidth={2.2} fillOpacity={0.22} />;
    case "Suspended":
      return <IconAlertOctagon size={size} strokeWidth={2.2} fillOpacity={0.25} />;
    case "Expired":
    case "Lapsed":
      return <IconClock size={size} strokeWidth={2.2} fillOpacity={0.16} />;
    case "Cancelled":
    case "Revoked":
    case "Rejected":
      return <IconBan size={size} strokeWidth={2.2} fillOpacity={0.25} />;
    default:
      return <StatusDot size={7} />;
  }
};

/**
 * Micro Luxe Plate Container for Hero Badges / Action Chips
 */
export const NopIconPlate: React.FC<{
  icon: React.ReactNode;
  bg?: string;
  size?: number;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({
  icon,
  bg = "var(--bg-glass-tint, rgba(0,140,149,0.08))",
  size = 30,
  borderRadius = 8,
  className,
  style,
}) => (
  <div
    className={className}
    style={{
      width: size,
      height: size,
      borderRadius,
      background: bg,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      ...style,
    }}
  >
    {icon}
  </div>
);

/** Star Icon - for BA Proposal tagging */
export const IconStar: React.FC<IconProps & { fill?: string }> = ({
  size = 14,
  className,
  style,
  color = "#F59E0B",
  fill = "#F59E0B",
  strokeWidth = 1.8,
  fillOpacity = 0.3,
}) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)}>
    <polygon
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Reusable Proposal Star Badge for all BA Proposal items
 * Luxury gold-accented pill with star icon
 */
export const ProposalStarBadge: React.FC<{
  label?: string;
  size?: "sm" | "md";
  showText?: boolean;
  style?: React.CSSProperties;
}> = ({
  label = "SDC Proposal",
  size = "sm",
  showText = true,
  style,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: size === "sm" ? "1px 6px" : "2px 8px",
      fontSize: size === "sm" ? "10px" : "11.5px",
      fontWeight: 700,
      background: "rgba(245, 158, 11, 0.12)",
      color: "#D97706",
      border: "1px solid rgba(245, 158, 11, 0.35)",
      borderRadius: "10px",
      letterSpacing: "0.02em",
      verticalAlign: "middle",
      ...style,
    }}
    title="BA Proposal"
  >
    <IconStar size={size === "sm" ? 11 : 13} color="#D97706" fill="#F59E0B" fillOpacity={0.85} />
    {showText && <span>{label}</span>}
  </span>
);


export const IconTrash: React.FC<IconProps> = ({ size = 15, className, style, color = "currentColor", strokeWidth = 1.8 }) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconTrash2: React.FC<IconProps> = IconTrash;

export const IconLayers: React.FC<IconProps> = ({ size = 15, className, style, color = "currentColor", strokeWidth = 1.8 }) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const IconTool: React.FC<IconProps> = ({ size = 15, className, style, color = "currentColor", strokeWidth = 1.8 }) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const IconRefreshCw: React.FC<IconProps> = ({ size = 15, className, style, color = "currentColor", strokeWidth = 1.8 }) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const IconInfo: React.FC<IconProps> = ({ size = 15, className, style, color = "currentColor", strokeWidth = 1.8 }) => (
  <svg viewBox="0 0 24 24" className={className} style={baseStyle(size, style)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);



