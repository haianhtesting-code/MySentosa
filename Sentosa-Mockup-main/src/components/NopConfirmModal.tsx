"use client";

import React, { useEffect } from "react";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconBan,
  IconX,
  IconTrash
} from "@/components/NopIcons";

export interface NopConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary" | "success" | "info";
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  isAlertOnly?: boolean;
}

export const NopConfirmModal: React.FC<NopConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  icon,
  onConfirm,
  onCancel,
  isAlertOnly = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  // Variant styles and default icons
  let themeColor = "#DC2626";
  let themeBg = "#FEE2E2";
  let themeBorder = "#FECACA";
  let defaultIcon = <IconAlertTriangle size={20} color="#DC2626" />;
  let btnConfirmBg = "#DC2626";
  let btnConfirmBorder = "#B91C1C";

  if (variant === "warning") {
    themeColor = "#D97706";
    themeBg = "#FEF3C7";
    themeBorder = "#FDE68A";
    defaultIcon = <IconAlertTriangle size={20} color="#D97706" />;
    btnConfirmBg = "#D97706";
    btnConfirmBorder = "#B45309";
  } else if (variant === "primary") {
    themeColor = "#0284C7";
    themeBg = "#E0F2FE";
    themeBorder = "#BAE6FD";
    defaultIcon = <IconCheckCircle size={20} color="#0284C7" />;
    btnConfirmBg = "#0284C7";
    btnConfirmBorder = "#0369A1";
  } else if (variant === "success") {
    themeColor = "#16A34A";
    themeBg = "#DCFCE7";
    themeBorder = "#BBF7D0";
    defaultIcon = <IconCheckCircle size={20} color="#16A34A" />;
    btnConfirmBg = "#16A34A";
    btnConfirmBorder = "#15803D";
  } else if (variant === "info") {
    themeColor = "#64748B";
    themeBg = "#F1F5F9";
    themeBorder = "#E2E8F0";
    defaultIcon = <IconCheckCircle size={20} color="#64748B" />;
    btnConfirmBg = "var(--color-primary, #FF8200)";
    btnConfirmBorder = "var(--color-primary-dark, #E06D00)";
  }

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nop-confirm-modal-title"
    >
      <div
        className="modal-content"
        style={{
          background: "#FFFFFF",
          color: "var(--text-main, #0F172A)",
          border: "1px solid var(--border-color, #E2E8F0)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          width: "100%",
          maxWidth: "460px",
          padding: 0,
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px 16px 24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
            borderBottom: "1px solid var(--border-color, #F1F5F9)"
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: themeBg,
              border: `1px solid ${themeBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: "2px"
            }}
          >
            {icon || defaultIcon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              id="nop-confirm-modal-title"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text-main, #0F172A)",
                lineHeight: 1.3
              }}
            >
              {title}
            </h3>
            <div
              style={{
                marginTop: "6px",
                fontSize: "13.5px",
                color: "var(--text-sub, #475569)",
                lineHeight: 1.55
              }}
            >
              {message}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              padding: "4px",
              cursor: "pointer",
              color: "#94A3B8",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            aria-label="Close"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            padding: "14px 24px",
            background: "var(--bg-subtle, #F8FAFC)",
            borderTop: "1px solid var(--border-color, #E2E8F0)"
          }}
        >
          {!isAlertOnly && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              autoFocus={variant === "danger"}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "8px",
                border: "1.5px solid #CBD5E1",
                background: "#FFFFFF",
                color: "var(--text-main, #0F172A)",
                cursor: "pointer"
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            autoFocus={variant !== "danger"}
            style={{
              padding: "8px 18px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "8px",
              background: btnConfirmBg,
              color: "#FFFFFF",
              border: `1.5px solid ${btnConfirmBorder}`,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
