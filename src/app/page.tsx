import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileHeart,
  LockKeyhole,
  PackageCheck,
  ShieldPlus,
  Stethoscope,
  Syringe,
  UsersRound,
} from "lucide-react";
import { ClinicLogo } from "@/components/layout/clinic-logo";
import { LandingRevealObserver } from "@/components/landing/landing-reveal-observer";
import { verifySessionToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/auth-constants";

const modules = [
  {
    id: "records",
    label: "Patient Records",
    icon: UsersRound,
    tone: "bg-teal-50 text-teal-700",
    summary: "Register patients, update profiles, and review consultation history.",
  },
  {
    id: "queue",
    label: "Daily Queue",
    icon: CalendarClock,
    tone: "bg-sky-50 text-sky-700",
    summary: "Track queued, in-progress, completed, and follow-up visits.",
  },
  {
    id: "consultation",
    label: "Consultation",
    icon: Stethoscope,
    tone: "bg-emerald-50 text-emerald-700",
    summary: "Record chief complaints, vital signs, diagnosis, and treatment notes.",
  },
  {
    id: "vaccination",
    label: "Vaccination",
    icon: Syringe,
    tone: "bg-blue-50 text-blue-700",
    summary: "Track vaccines given, dose details, next schedule, and remarks.",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: PackageCheck,
    tone: "bg-amber-50 text-amber-700",
    summary: "Monitor medicine batches, stock levels, expirations, and item requests.",
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileHeart,
    tone: "bg-rose-50 text-rose-700",
    summary: "Review clinic summaries, activity logs, and operational records.",
  },
];

const statusItems = [
  { label: "Queue monitoring", value: "Live", icon: Activity },
  { label: "Access control", value: "Role-based", icon: LockKeyhole },
  { label: "Record tracking", value: "Centralized", icon: ClipboardList },
  { label: "Emergency cases", value: "Flagged", icon: ShieldPlus },
];

const sections = [
  {
    id: "records",
    number: "01",
    title: "Patient Records",
    description: "Keep employee and patient profiles, measurements, visit history, and generated clinic forms in one organized record.",
    bg: "bg-[#edf4ef]",
    text: "text-slate-950",
    accent: "text-teal-700",
    items: ["Patient registry", "Visit history", "Printable clinic forms"],
  },
  {
    id: "queue",
    number: "02",
    title: "Daily Queue",
    description: "Monitor the active clinic day with clear status labels for queued, in-progress, completed, follow-up, and emergency visits.",
    bg: "bg-[#14231f]",
    text: "text-white",
    accent: "text-teal-200",
    items: ["Today's patient list", "Follow-up schedule", "Emergency case flags"],
  },
  {
    id: "consultation",
    number: "03",
    title: "Consultation",
    description: "Record clinic findings with structured fields for complaints, vital signs, diagnosis, treatment plan, and progress notes.",
    bg: "bg-[#eaf2f7]",
    text: "text-slate-950",
    accent: "text-sky-700",
    items: ["Chief complaint", "Vital signs", "Treatment notes"],
  },
  {
    id: "vaccination",
    number: "04",
    title: "Vaccination",
    description: "Maintain vaccination entries with dose information, attending staff, next-dose schedule, and patient remarks.",
    bg: "bg-[#f7f8f4]",
    text: "text-slate-950",
    accent: "text-blue-700",
    items: ["Dose records", "Next schedule", "Vaccination remarks"],
  },
  {
    id: "inventory",
    number: "05",
    title: "Inventory",
    description: "Track medicine and supply batches, stock movement, release history, and item requests from the clinic workspace.",
    bg: "bg-[#f1e7d3]",
    text: "text-slate-950",
    accent: "text-amber-700",
    items: ["Medicine batches", "Expiration monitoring", "Item request review"],
  },
  {
    id: "reports",
    number: "06",
    title: "Reports",
    description: "Use summary pages and activity logs for clinic monitoring, audit review, and day-to-day reporting.",
    bg: "bg-white",
    text: "text-slate-950",
    accent: "text-rose-700",
    items: ["Status summary", "Activity logs", "Clinic operations"],
  },
];

export default async function LandingPage() {
  const cookieStore = await cookies();
  const hasSession = Boolean(verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value));
  const accessHref = hasSession ? "/dashboard" : "/login";
  const accessLabel = hasSession ? "Open Dashboard" : "Sign In";

  return (
    <main className="landing-page min-h-screen overflow-x-hidden bg-[#f7f8f4] text-slate-950">
      <LandingRevealObserver />
      <header className="landing-header fixed inset-x-0 top-0 z-40 border-b border-slate-950/10 bg-[#f7f8f4]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[92rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <ClinicLogo className="w-60" />
          </Link>
          <nav className="ml-auto hidden items-center gap-1 border border-slate-950/10 bg-white p-1 text-sm font-bold text-slate-600 md:flex">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="landing-nav-link px-4 py-2 transition hover:bg-slate-950 hover:text-white">
                {section.title}
              </a>
            ))}
          </nav>
          <Link
            href={accessHref}
            className="landing-button ml-auto inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-teal-700 md:ml-3"
          >
            {accessLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="overflow-hidden bg-[#f7f8f4] px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[92rem] min-w-0 gap-7 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="flex min-w-0 flex-col justify-between gap-8 lg:min-h-[42rem]">
            <div>
              <div className="landing-kicker flex items-center gap-3 text-sm font-black text-teal-700">
                <span className="h-px w-12 bg-teal-700" />
                Office of the Chief Minister
              </div>
              <h2 className="landing-title mt-6 max-w-3xl text-[3.7rem] font-black leading-[0.95] text-slate-950 sm:text-[5.2rem] lg:text-[6.8rem]">
                THE CLINIC
              </h2>
              <p className="landing-copy mt-6 max-w-xl text-lg leading-8 text-slate-700">
                EMR and inventory system for patient records, daily visits, medicine requests, vaccination records, inventory, and reports.
              </p>
              <div className="landing-actions mt-7 grid gap-3 sm:grid-cols-2">
                <Link href={accessHref} className="landing-button inline-flex h-12 items-center justify-center gap-2 bg-teal-600 px-5 text-sm font-black text-white transition hover:bg-teal-700">
                  {accessLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#modules" className="landing-button inline-flex h-12 items-center justify-center border border-slate-950/20 bg-white px-5 text-sm font-black text-slate-950 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">
                  View Modules
                </a>
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            <div className="landing-photo relative w-full max-w-full aspect-[4/3] overflow-hidden border border-slate-950/10 bg-slate-200 shadow-[0_18px_48px_rgba(15,23,42,0.16)] sm:min-h-[21rem] sm:aspect-[16/11] sm:shadow-[0_24px_80px_rgba(15,23,42,0.18)] lg:aspect-[5/4]">
              <Image
                src="/icons/ocmlanding.png"
                alt="OCM Clinic staff using the clinic system"
                fill
                sizes="(min-width: 1024px) 52vw, 100vw"
                priority
                className="landing-photo-image object-cover object-[58%_center]"
              />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/88 via-slate-950/38 to-transparent sm:h-44" />
              <div className="landing-photo-badge absolute left-4 top-4 border border-white/55 bg-white/72 px-3 py-2 text-xs font-black text-slate-950 shadow-sm backdrop-blur-md">
                OCM CLINIC
              </div>
              <div className="landing-status-strip absolute bottom-0 left-0 right-0 grid min-w-0 grid-cols-2 border-t border-white/18 bg-slate-950/68 text-[11px] font-black text-white backdrop-blur-md sm:grid-cols-4 sm:text-xs">
                {statusItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="landing-status-item min-w-0 border-r border-white/14 p-2.5 last:border-r-0 sm:p-3">
                      <div className="flex items-center gap-2 text-white/72">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <p className="mt-1 text-white">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="landing-tabs sticky top-16 z-30 border-y border-slate-950/10 bg-white px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[92rem] gap-1 overflow-x-auto py-2 text-sm font-black text-slate-600">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <a key={module.id} href={`#${module.id}`} className="landing-tab inline-flex h-10 shrink-0 items-center gap-2 px-3 transition hover:bg-slate-100 hover:text-slate-950">
                <Icon className="h-4 w-4" />
                {module.label}
              </a>
            );
          })}
        </div>
      </section>

      <section className="landing-reveal bg-slate-950 px-4 py-20 text-white sm:px-6 md:py-28 lg:px-8 lg:py-36" data-landing-reveal>
        <div className="landing-reveal-inner mx-auto grid max-w-[92rem] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-sm font-black text-teal-200">System Coverage</p>
            <h3 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Clinic modules for daily office work</h3>
          </div>
          <div className="grid gap-px overflow-hidden border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <div key={module.id} className="landing-module-tile bg-slate-950 p-5">
                  <div className={`mb-5 inline-flex h-11 w-11 items-center justify-center ${module.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-black">{module.label}</h4>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{module.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className={`landing-reveal ${section.bg} ${section.text} px-4 py-24 sm:px-6 md:py-32 lg:px-8 lg:py-44`} data-landing-reveal>
          <div className="landing-reveal-inner mx-auto grid max-w-[92rem] gap-12 border-t border-current/15 pt-10 md:grid-cols-[0.34fr_0.66fr] lg:gap-16">
            <div className="flex items-start justify-between gap-4 md:block">
              <p className={`landing-section-number text-6xl font-black leading-none ${section.accent}`}>{section.number}</p>
              <p className="mt-2 text-sm font-black md:mt-8">OCM Clinic</p>
            </div>
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <div>
                <h3 className="text-4xl font-black leading-tight sm:text-6xl">{section.title}</h3>
                <p className="mt-5 max-w-2xl text-base leading-7 opacity-80">{section.description}</p>
              </div>
              <div className="grid content-start gap-2">
                {section.items.map((item) => (
                  <div key={item} className="landing-section-row flex min-h-14 items-center justify-between gap-4 border-b border-current/15 py-3 text-base font-black">
                    <span>{item}</span>
                    <ArrowRight className="landing-row-arrow h-4 w-4 shrink-0 opacity-55" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="landing-reveal bg-[#f7f8f4] px-4 py-24 sm:px-6 md:py-32 lg:px-8" data-landing-reveal>
        <div className="landing-reveal-inner mx-auto grid max-w-[92rem] gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm font-black text-teal-700">Access</p>
            <h3 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">Open the clinic workspace with an assigned account.</h3>
          </div>
          <div className="landing-access-panel border-l-4 border-teal-600 bg-white p-5">
            <p className="text-sm leading-6 text-slate-600">
              Authorized clinic staff can sign in to manage patient records, visit queues, medicine releases, inventory updates, reports, and account settings.
            </p>
            <Link href={accessHref} className="landing-button mt-5 inline-flex h-11 items-center justify-center gap-2 bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-teal-700">
              {accessLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 px-4 py-6 text-sm text-slate-300 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[92rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-60 max-w-full bg-white">
            <ClinicLogo className="w-full" />
          </div>
          <Link href={accessHref} className="landing-button inline-flex w-fit items-center gap-2 font-black text-white">
            {accessLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </footer>
    </main>
  );
}
