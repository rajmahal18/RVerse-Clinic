"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date-time";

type Notice = { id: string; title: string; detail: string; href?: string; at: string };
export function Notifications({
  hasExpiry,
  onExpiry,
}: {
  hasExpiry: boolean;
  onExpiry: () => void;
}) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const storageKey = useRef("");
  const unread = notices.filter((n) => !read.includes(n.id)).length;
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => {
    let cancelled = false;
    let refreshing = false;
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const data: { notifications: Notice[]; userId: string } = await response.json();
        if (cancelled) return;
        if (!storageKey.current) {
          storageKey.current = `clinic-notifications-read:${data.userId}`;
          try {
            const ids = JSON.parse(
              localStorage.getItem(storageKey.current) || "[]",
            );
            if (Array.isArray(ids))
              setRead(ids.filter((id) => typeof id === "string"));
          } catch {
            /* Keep in-memory read state when storage is unavailable. */
          }
        }
        setNotices(data.notifications);
      } catch {
        /* Retry on the next poll. */
      } finally {
        refreshing = false;
      }
    }
    void refresh();
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  function markRead(ids: string[]) {
    setRead((current) => {
      const next = [...new Set([...ids, ...current])].slice(0, 1000);
      try {
        localStorage.setItem(storageKey.current, JSON.stringify(next));
      } catch {
        /* Read state remains usable in memory. */
      }
      return next;
    });
  }
  const visible =
    filter === "unread" ? notices.filter((n) => !read.includes(n.id)) : notices;
  const panel = open ? (
    <div
      className="no-print fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 sm:items-start sm:justify-end sm:p-4 sm:pt-20"
      onClick={() => setOpen(false)}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4">
          <h2
            id="notifications-title"
            className="text-lg font-bold text-slate-900"
          >
            Notifications
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 pb-3">
          {["all", "unread"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === tab ? "bg-teal-50 text-teal-700" : "text-slate-500"}`}
            >
              {tab === "all" ? "All" : `Unread (${unread})`}
            </button>
          ))}
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-teal-700"
            onClick={() => markRead(notices.map((n) => n.id))}
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          {hasExpiry ? (
            <button
              type="button"
              className="w-full px-4 py-4 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50"
              onClick={() => {
                setOpen(false);
                onExpiry();
              }}
            >
              Review medicine expiration alerts
            </button>
          ) : null}
          {visible.map((notice) => {
            const unreadNotice = !read.includes(notice.id);
            const content = (
              <>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">
                    {notice.title}
                  </span>
                  <span className="mt-1 block whitespace-pre-line break-words text-sm text-slate-600">
                    {notice.detail}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${unreadNotice ? "font-semibold text-teal-700" : "text-slate-400"}`}
                  >
                    {formatDateTime(new Date(notice.at))}
                  </span>
                </span>
                {unreadNotice ? (
                  <span
                    aria-label="Unread"
                    className="mt-3 h-2 w-2 shrink-0 rounded-full bg-teal-600"
                  />
                ) : notice.href ? (
                  <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-slate-400" />
                ) : null}
              </>
            );
            const className = `flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-100 ${unreadNotice ? "bg-teal-50/40" : "bg-white"}`;
            return notice.href ? (
              <Link
                key={notice.id}
                href={notice.href}
                className={className}
                onClick={() => {
                  markRead([notice.id]);
                  setOpen(false);
                }}
              >
                {content}
              </Link>
            ) : (
              <button
                key={notice.id}
                type="button"
                className={className}
                onClick={() => markRead([notice.id])}
              >
                {content}
              </button>
            );
          })}
          {!visible.length ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {filter === "unread"
                ? "You're all caught up."
                : "No notifications."}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  ) : null;
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label={`Open notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : hasExpiry ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
        ) : null}
      </Button>
      {typeof document !== "undefined"
        ? createPortal(panel, document.body)
        : panel}
    </>
  );
}
