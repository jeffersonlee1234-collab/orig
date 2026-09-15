/**
 * Data Privacy Act (RA 10173) Compliance & Data Masking Utilities
 * Safely masks sensitive personal information (PII) on the UI layer.
 */

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const clean = String(phone).trim();
  const digits = clean.replace(/\D/g, '');

  if (digits.length >= 11) {
    // 09171234567 -> 0917-***-4567
    const prefix = digits.slice(0, 4);
    const suffix = digits.slice(-4);
    return `${prefix}-***-${suffix}`;
  } else if (digits.length >= 7) {
    const prefix = digits.slice(0, 3);
    const suffix = digits.slice(-3);
    return `${prefix}-***-${suffix}`;
  }

  return clean;
}

export function maskId(idNum: string | null | undefined): string {
  if (!idNum) return '—';
  const clean = String(idNum).trim();
  if (clean.length < 8) return clean;

  // Format e.g. 1100-0011-6932-0192 or 1100001169320192 -> 1100-****-****-0192
  const digits = clean.replace(/[^a-zA-Z0-9]/g, '');
  if (digits.length >= 12) {
    const prefix = digits.slice(0, 4);
    const suffix = digits.slice(-4);
    return `${prefix}-****-****-${suffix}`;
  } else if (digits.length >= 8) {
    const prefix = digits.slice(0, 4);
    const suffix = digits.slice(-3);
    return `${prefix}-****-${suffix}`;
  }

  const start = clean.slice(0, 4);
  const end = clean.slice(-3);
  return `${start}****${end}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return email || '—';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user.charAt(0)}*@${domain}`;
  return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
}

export function maskBirthDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const clean = String(dateStr).trim();
  // If format contains year at the end, mask month & day: e.g. "January 15, 1990" -> "**** **, 1990"
  const yearMatch = clean.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    return `**** **, ${yearMatch[0]}`;
  }
  return '**** ** ****';
}
