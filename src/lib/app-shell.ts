// Which pages get the dashboard frame (side list on a laptop, menu on a phone)
// instead of the website's own top bar and footer. ClientShell uses it to hide
// the website chrome and the admin/dashboard layouts use it to show the frame,
// so the two always agree.

export type ShellArea = "admin" | "dashboard";

export function shellAreaOf(pathname: string): ShellArea | null {
  if (/^\/admin(\/|$)/.test(pathname)) return "admin";
  if (/^\/dashboard(\/|$)/.test(pathname)) return "dashboard";
  return null;
}

const DASHBOARD_ROLES = ["buyer", "exhibitor", "partner"];

// Only a signed-in person who may use that area gets the frame; anyone else
// sees the normal website (and the page's own "please sign in" message).
export function shellAppliesTo(area: ShellArea | null, user: { role: string } | null | undefined): boolean {
  if (!area || !user) return false;
  return area === "admin" ? user.role === "admin" : DASHBOARD_ROLES.includes(user.role);
}
