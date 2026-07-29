export type AppRole = "ADMIN" | "DOCTOR_NURSE" | "SUPPLY_OFFICER" | "RECORDS";

type NavigationItem = {
  href: string;
};

const ROLE_HOME: Record<AppRole, string> = {
  ADMIN: "/dashboard",
  DOCTOR_NURSE: "/dashboard",
  SUPPLY_OFFICER: "/dashboard",
  RECORDS: "/dashboard",
};

const ROLE_MODULES: Record<AppRole, string[]> = {
  ADMIN: [
    "/dashboard",
    "/patients",
    "/todays-patients",
    "/follow-ups",
    "/vaccination",
    "/emergency-cases",
    "/inventory",
    "/item-requests",
    "/reports",
    "/activity-logs",
    "/accounts",
    "/settings",
  ],
  DOCTOR_NURSE: [
    "/dashboard",
    "/patients",
    "/todays-patients",
    "/follow-ups",
    "/vaccination",
    "/emergency-cases",
    "/item-requests",
    "/reports",
  ],
  SUPPLY_OFFICER: ["/dashboard", "/inventory", "/item-requests", "/reports"],
  RECORDS: ["/dashboard", "/patients", "/reports"],
};

export function isAppRole(value: unknown): value is AppRole {
  return value === "ADMIN" || value === "DOCTOR_NURSE" || value === "SUPPLY_OFFICER" || value === "RECORDS";
}

export function getRoleHome(role: AppRole) {
  return ROLE_HOME[role];
}

export function canAccessPath(role: AppRole, pathname: string) {
  return ROLE_MODULES[role].some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

export function filterNavigationByRole<T extends NavigationItem>(items: T[], role: AppRole) {
  return items.filter((item) => canAccessPath(role, item.href));
}
