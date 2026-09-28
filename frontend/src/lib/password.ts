import type { PasswordRequirements } from './api';

/** Requirements a password still misses, as short human-readable items. */
export function passwordProblems(pwd: string, req: PasswordRequirements): string[] {
  const problems: string[] = [];
  if (pwd.length < req.min_length) problems.push(`At least ${req.min_length} characters`);
  if (pwd.length > req.max_length) problems.push(`At most ${req.max_length} characters`);
  if (req.require_digit && !/\d/.test(pwd)) problems.push('At least one digit (0-9)');
  if (req.require_letter && !/[a-zA-Z]/.test(pwd)) problems.push('At least one letter (a-z, A-Z)');
  if (req.require_capital && !/[A-Z]/.test(pwd)) problems.push('At least one uppercase letter (A-Z)');
  if (req.require_special) {
    const escaped = req.special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`[${escaped}]`).test(pwd)) {
      problems.push(`At least one special character from: ${req.special_chars}`);
    }
  }
  return problems;
}
