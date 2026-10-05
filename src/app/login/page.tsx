"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { loginAction } from "@/app/actions/workflow";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";
import { ClinicLogo } from "@/components/layout/clinic-logo";
import { safeLoginNext } from "@/lib/login-next";

function LoginDestination() {
  const searchParams = useSearchParams();
  return <input type="hidden" name="next" value={safeLoginNext(searchParams.get("next"))} />;
}

function LoginNotice() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  if (!error && !message) {
    return null;
  }

  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
      {error || message}
    </div>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)]">
        <section className="hidden border-r bg-white px-10 py-8 lg:flex lg:flex-col">
          <Link href="/" className="flex w-full max-w-sm items-center">
            <ClinicLogo variant="large" className="w-full" />
          </Link>

          <div className="mt-16 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Clinic System</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Account Access</h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
              Sign in to access patient records, consultation logs, queue monitoring, vaccination, and inventory modules.
            </p>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-3 text-sm">
            {["Patient Records", "Inventory", "Clinic Reports"].map((item) => (
              <div key={item} className="rounded-2xl border bg-slate-50 px-4 py-3 font-semibold text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <ClinicLogo variant="large" className="w-full" />
            </div>

            <div className="rounded-3xl border bg-white p-4 shadow-soft sm:p-6">
              <Suspense fallback={null}>
                <LoginNotice />
              </Suspense>

              <div className="mb-6">
                <h2 className="text-2xl font-black tracking-tight">Sign In</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use your assigned clinic system account.
                </p>
              </div>

              <form action={loginAction} className="space-y-4">
                <CsrfField />
                <Suspense fallback={null}><LoginDestination /></Suspense>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Email address</span>
                  <span className="relative block">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="email"
                      type="email"
                      autoComplete="username"
                      className="h-11 w-full rounded-2xl border bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-primary/30"
                      placeholder="name@office.gov"
                      required
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Password</span>
                  <span className="relative block">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-11 w-full rounded-2xl border bg-slate-50 pl-10 pr-10 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-primary/30"
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>

                <Button type="submit" className="h-11 w-full">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>

            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              Contact your administrator to request an account.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
