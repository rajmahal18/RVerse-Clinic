"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, LogOut, Menu, X } from "lucide-react";
import { logoutAction } from "@/app/actions/workflow";
import { navItems } from "@/data/clinic";
import { canAccessPath, filterNavigationByRole, type AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OcmLogo } from "@/components/layout/ocm-logo";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";
import { CsrfField } from "@/components/security/csrf-field";

export function AppShellClient({
  children,
  role,
  userInitials,
  medicineExpiry,
}: {
  children: React.ReactNode;
  role: AppRole;
  userInitials: string;
  medicineExpiry: { expired: number; expiringSoon: number };
}) {
  const pathname = usePathname();
  const visibleNavItems = filterNavigationByRole(navItems, role);
  const canSearchPatients = canAccessPath(role, "/patients");
  const [requestCount, setRequestCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expiryModalOpen, setExpiryModalOpen] = useState(false);
  const hasMedicineExpiryAlert = medicineExpiry.expired > 0 || medicineExpiry.expiringSoon > 0;

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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => hasMedicineExpiryAlert && setExpiryModalOpen(true)}
              aria-label={hasMedicineExpiryAlert ? "Open medicine expiration alert" : "Notifications"}
            >
              <Bell className="h-5 w-5" />
              {hasMedicineExpiryAlert ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /> : null}
            </Button>
            <form action={logoutAction}>
              <CsrfField />
              <Button type="submit" variant="ghost" size="icon" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" aria-label="Sign out">
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">{userInitials}</div>
          </div>
        </header>
        {hasMedicineExpiryAlert ? (
          <div className="mx-3 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-sm font-semibold md:mx-8 md:mt-4">
            <span className="font-black text-slate-800">Medicine expiry:</span>
            {medicineExpiry.expired > 0 ? <span className="text-rose-700">{medicineExpiry.expired} expired</span> : null}
            {medicineExpiry.expiringSoon > 0 ? <span className="text-amber-700">{medicineExpiry.expiringSoon} expiring within 30 days</span> : null}
            <div className="ml-auto flex items-center gap-3">
              <button type="button" className="text-primary" onClick={() => setExpiryModalOpen(true)}>
                Details
              </button>
              <Link href="/inventory" className="text-primary">
                View inventory
              </Link>
            </div>
          </div>
        ) : null}
        <main className="p-3 md:p-8">{children}</main>
      </div>
      {expiryModalOpen && hasMedicineExpiryAlert ? (
        <div className="fixed inset-0 z-[70] grid place-items-end bg-slate-950/40 p-0 md:place-items-center md:p-4" onClick={() => setExpiryModalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="medicine-expiry-title"
            className="w-full overflow-hidden rounded-t-2xl border bg-white shadow-2xl md:max-w-md md:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b bg-rose-50 px-4 py-3">
              <div className="flex min-w-0 gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-rose-700 ring-1 ring-rose-200">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="medicine-expiry-title" className="font-black text-slate-900">Medicine Expiration</h2>
                  <p className="text-sm text-slate-600">Review medicine batches that are expired or expiring soon.</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setExpiryModalOpen(false)} aria-label="Close medicine expiration alert">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid gap-3 p-4">
              {medicineExpiry.expired > 0 ? (
                <div className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {medicineExpiry.expired} expired medicine batch{medicineExpiry.expired === 1 ? "" : "es"}
                </div>
              ) : null}
              {medicineExpiry.expiringSoon > 0 ? (
                <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                  {medicineExpiry.expiringSoon} medicine batch{medicineExpiry.expiringSoon === 1 ? "" : "es"} expiring within 30 days
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t bg-white p-4">
              <Button type="button" variant="outline" onClick={() => setExpiryModalOpen(false)}>Close</Button>
              <Button asChild>
                <Link href="/inventory">View Inventory</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
