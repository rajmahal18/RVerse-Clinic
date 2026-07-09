"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Menu, Network } from "lucide-react";
import { logoutAction } from "@/app/actions/workflow";
import { navItems } from "@/data/clinic";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OcmLogo } from "@/components/layout/ocm-logo";
import { DebouncedSearchForm } from "@/components/search/debounced-search-form";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-white/90 backdrop-blur lg:block">
        <Link href="/" className="flex h-16 items-center gap-3 border-b px-6">
          <OcmLogo className="h-11 w-11" />
          <div>
            <p className="text-sm text-muted-foreground">Office of the Chief Minister</p>
            <h1 className="font-black tracking-tight">THE CLINIC</h1>
          </div>
        </Link>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                  active && "bg-primary text-white shadow-soft hover:bg-primary hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border bg-teal-50 p-4 text-sm text-teal-900">
          <div className="flex items-center gap-2 font-bold">
            <Network className="h-4 w-4" /> LAN-ready mode
          </div>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/85 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <OcmLogo className="h-9 w-9" />
            <span className="text-sm font-black tracking-tight">THE CLINIC</span>
          </Link>
          <DebouncedSearchForm
            action="/patients"
            placeholder="Search patient, request, medicine..."
            className="hidden flex-1 md:block"
            inputClassName="w-full max-w-xl rounded-2xl bg-slate-50"
          />
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
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">DR</div>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
