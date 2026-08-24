import { getCurrentUser } from "@/lib/auth";
import { canAccessPath, getRoleHome, isAppRole, type AppRole } from "@/lib/rbac";
import { AppShellClient } from "@/components/layout/app-shell-client";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getMedicineExpirySummary } from "@/lib/patient-view";

function getInitials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (!parts.length) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const role: AppRole = isAppRole(user.role) ? user.role : "RECORDS";
  const medicineExpiry = await getMedicineExpirySummary();
  const pathname = (await headers()).get("x-clinic-pathname");
  if (pathname && !canAccessPath(role, pathname)) {
    redirect(`${getRoleHome(role)}?error=You%20do%20not%20have%20access%20to%20that%20page.`);
  }

  return (
    <AppShellClient role={role} userInitials={getInitials(user.name)} medicineExpiry={medicineExpiry}>
      {children}
    </AppShellClient>
  );
}
