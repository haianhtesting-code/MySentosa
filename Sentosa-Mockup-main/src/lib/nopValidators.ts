// Sentosa NOP Module — Standardized Singapore Validation Suite
// Solves N-01 (UEN), N-02 (SG Mobile), N-05 (Email) definitively

/**
 * Validates Singapore Business UEN (Unique Entity Number)
 * Supports:
 * - 9-digit standard businesses: 53312345A, 12345678X
 * - 10-digit companies: 199801234K, 201512345D, 202601234M
 * - Other entities / societies: T05LL1103B, S12FC1234A, T20FC0123G
 */
export const UEN_REGEX = /^(?:(?:19|20)\d{7}[A-Z]|\d{8}[A-Z]|[TSR]\d{2}[A-Z0-9]{2}\d{4}[A-Z])$/i;

export function isValidSingaporeUen(uen: string): boolean {
  if (!uen) return false;
  const cleaned = uen.trim().toUpperCase();
  return UEN_REGEX.test(cleaned);
}

/**
 * Validates Singapore Phone Number (Mobile & Fixed line)
 * Supports:
 * - "+65 9123 4567", "+65 91234567", "+6591234567"
 * - "9123 4567", "91234567", "8123 4567", "81234567"
 * - Fixed lines: "+65 6789 0123", "6789 0123", "67890123"
 */
export const SG_PHONE_REGEX = /^(?:\+?65[\s-]?)?[689]\d{3}[\s-]?\d{4}$/;

export function isValidSingaporePhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.trim();
  return SG_PHONE_REGEX.test(cleaned);
}

/**
 * Validates Corporate Email Address
 * Rejects:
 * - Missing @, spaces inside, missing dot in domain, TLD < 2 chars (e.g. user@domainXcom)
 * Accepts:
 * - name@company.sg, david.tan@kimseng.sg, user.name+tag@sub.domain.com
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const cleaned = email.trim();
  if (/\s/.test(cleaned)) return false;
  return EMAIL_REGEX.test(cleaned);
}
