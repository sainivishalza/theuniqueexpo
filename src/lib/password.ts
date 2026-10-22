// Rules for a new password, shared by the server and the change-password form.
// bcrypt only uses the first 72 bytes of a password, so longer ones are refused rather than
// silently cut short.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

export type PasswordProblem = "weak_password" | "too_long";

export function passwordProblem(password: string): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "weak_password";
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return "too_long";
  return null;
}
