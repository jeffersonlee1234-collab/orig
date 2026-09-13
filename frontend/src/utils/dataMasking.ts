/**
 * Data Privacy Act (RA 10173) Compliance & Data Masking Utilities
 * Safely masks sensitive personal information (PII) on the UI layer.
 */

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const clean = String(phone).trim();
  if (clean.length < 7) return clean;

  // e.g. 09171234567 -> 0917****567
  if (clean.length >= 10) {
    const start = clean.slice(0, 4);
    const end = clean.slice(-3);
    return `${start}****${end}`;
  }

  const start = clean.slice(0, 2);
  const end = clean.slice(-2);
  return `${start}****${end}`;
}

export function maskId(idNum: string | null | undefined): string {
  if (!idNum) return '—';
  const clean = String(idNum).trim();
  if (clean.length < 8) return clean;

  // e.g. 110000116932100 -> 110000******100
  const start = clean.slice(0, Math.min(6, Math.floor(clean.length / 3)));
  const end = clean.slice(-3);
  return `${start}******${end}`;
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
