"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { logoutAction } from "@/app/actions/workflow";
import { navItems } from "@/data/clinic";
import { canAccessPath, filterNavigationByRole, type AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OcmLogo } from "@/components/layout/ocm-logo";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";

export function AppShellClient({
  children,
  role,
  userInitials,
}: {
  children: React.ReactNode;
  role: AppRole;
  userInitials: string;
}) {
  const pathname = usePathname();
  const visibleNavItems = filterNavigationByRole(navItems, role);
  const canSearchPatients = canAccessPath(role, "/patients");
  const [requestCount, setRequestCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    fetch("/api/item-requests/count")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setRequestCount(data.count))
      .catch(() => undefined);
  }, [pathname]);
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const renderNavigation = () => (
    <nav className="space-y-1 p-3 md:p-4">
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 md:px-4 md:py-3",
              active && "bg-primary text-white shadow-soft hover:bg-primary hover:text-white"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.href === "/item-requests" && requestCount > 0 ? (
              <span className="grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-black text-white">
                {requestCount > 99 ? "99+" : requestCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-white/90 backdrop-blur lg:block">
        <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b px-6">
          <OcmLogo className="h-11 w-11" />
          <div>
            <p className="text-sm text-muted-foreground">Office of the Chief Minister</p>
            <h1 className="font-black tracking-tight">THE CLINIC</h1>
          </div>
        </Link>
        {renderNavigation()}
      </aside>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/40 opacity-0 backdrop-blur-[2px] transition lg:hidden",
          mobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none"
        )}
        aria-hidden="true"
        onClick={() => setMobileNavOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(86vw,22rem)] -translate-x-full flex-col border-r bg-white shadow-2xl transition-transform duration-200 lg:hidden",
          mobileNavOpen && "translate-x-0"
        )}
        aria-label="Mobile navigation"
        aria-hidden={!mobileNavOpen}
      >
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
            <OcmLogo className="h-10 w-10 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">Office of the Chief Minister</p>
              <h1 className="truncate font-black tracking-tight">THE CLINIC</h1>
            </div>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{renderNavigation()}</div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/85 px-4 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <OcmLogo className="h-9 w-9" />
            <span className="text-sm font-black tracking-tight">THE CLINIC</span>
          </Link>
          {canSearchPatients ? (
            <DebouncedSearchForm
              action="/patients"
              placeholder="Search patient, request, medicine..."
              className="hidden flex-1 md:block"
              inputClassName="w-full max-w-xl rounded-2xl bg-slate-50"
            />
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 md:inline-flex">Online</span>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </Button>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="icon" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" aria-label="Sign out">
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">{userInitials}</div>
          </div>
        </header>
        <main className="p-3 md:p-8">{children}</main>
      </div>
    </div>
  );
}
