/** Masks an email address for display while keeping its domain visible. */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return '';

  const [userPart, domain] = email.split('@');
  if (userPart.length <= 3) return `${userPart.charAt(0)}***@${domain}`;
  return `${userPart.slice(0, 2)}***${userPart.slice(-2)}@${domain}`;
}
