"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, UserRound, XCircle } from "lucide-react";
import { createAccountAction, loginAction } from "@/app/actions/workflow";
import { Button } from "@/components/ui/button";
import { OcmLogo } from "@/components/layout/ocm-logo";

type AuthMode = "sign-in" | "create-account";

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
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isCreateAccount = mode === "create-account";
  const passwordRules = [
    { label: "More than 8 characters", met: password.length > 8 },
    { label: "At least 1 uppercase letter", met: /[A-Z]/.test(password) },
    { label: "At least 1 lowercase letter", met: /[a-z]/.test(password) },
    { label: "At least 1 number", met: /\d/.test(password) },
    { label: "At least 1 special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordMeetsRules = passwordRules.every((rule) => rule.met);
  const passwordsMatch = !isCreateAccount || (confirmPassword.length > 0 && password === confirmPassword);
  const canSubmit = passwordMeetsRules && passwordsMatch;

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)]">
        <section className="hidden border-r bg-white px-10 py-8 lg:flex lg:flex-col">
          <Link href="/" className="flex w-fit items-center gap-3">
            <OcmLogo className="h-12 w-12" />
            <div>
              <p className="text-sm text-slate-500">Office of the Chief Minister</p>
              <h1 className="text-xl font-black tracking-tight">THE CLINIC</h1>
            </div>
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
              <OcmLogo className="h-12 w-12" />
              <div>
                <p className="text-sm text-slate-500">Office of the Chief Minister</p>
                <h1 className="font-black tracking-tight">THE CLINIC</h1>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-4 shadow-soft sm:p-6">
              <Suspense fallback={null}>
                <LoginNotice />
              </Suspense>

              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode("sign-in")}
                  className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                    mode === "sign-in" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("create-account")}
                  className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                    isCreateAccount ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Create account
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-black tracking-tight">{isCreateAccount ? "Create Account" : "Sign In"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isCreateAccount
                    ? "Create an account for clinic system access. Account approval can be handled after role assignments are confirmed."
                    : "Use your assigned clinic system account."}
                </p>
              </div>

              <form action={isCreateAccount ? createAccountAction : loginAction} className="space-y-4">
                {isCreateAccount ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Full name</span>
                    <span className="relative block">
                      <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        name="name"
                        className="h-11 w-full rounded-2xl border bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-primary/30"
                        placeholder="Enter full name"
                        required
                      />
                    </span>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Email address</span>
                  <span className="relative block">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="email"
                      type="email"
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
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
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

                <div className="rounded-2xl border bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Password Requirements</p>
                  <div className="grid gap-2">
                    {passwordRules.map((rule) => (
                      <div key={rule.label} className={`flex items-center gap-2 text-sm ${rule.met ? "text-emerald-700" : "text-slate-500"}`}>
                        {rule.met ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isCreateAccount ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Confirm password</span>
                    <span className="relative block">
                      <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        name="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="h-11 w-full rounded-2xl border bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-primary/30"
                        placeholder="Confirm password"
                        required
                      />
                    </span>
                    <span className={`mt-2 flex items-center gap-2 text-sm ${passwordsMatch ? "text-emerald-700" : "text-slate-500"}`}>
                      {passwordsMatch ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      Passwords match
                    </span>
                  </label>
                ) : null}

                <Button type="submit" className="h-11 w-full" disabled={!canSubmit}>
                  {isCreateAccount ? "Create Account" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>

            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              Role-based access will be configured after the client confirms user roles and module visibility.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
