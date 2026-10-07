"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Notice = { id: string; title: string; detail: string; href?: string; at: string };

export function Notifications({ hasExpiry, onExpiry }: { hasExpiry: boolean; onExpiry: () => void }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState<Notice | null>(null);
  const [unread, setUnread] = useState(0);
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
    const delivered = new Set<string>();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const data: { notifications: Notice[]; userId: string } = await response.json();
        if (cancelled) return;
        setNotices(data.notifications);
        const key = `clinic-notifications:${data.userId}`;
        let seen: string[] = [];
        try { seen = JSON.parse(localStorage.getItem(key) || "[]"); if (!Array.isArray(seen)) seen = []; } catch { seen = []; }
        const fresh = data.notifications.filter(notice => !seen.includes(notice.id) && !delivered.has(notice.id));
        data.notifications.forEach(notice => delivered.add(notice.id));
        if (fresh.length) {
          setPopup(fresh.length === 1 ? fresh[0] : { id: "group", title: `${fresh.length} new notifications`, detail: fresh.slice(0, 3).map(notice => notice.title).join(" • "), at: new Date().toISOString() });
          setUnread(count => count + fresh.length);
          try { localStorage.setItem(key, JSON.stringify([...new Set([...data.notifications.map(notice => notice.id), ...seen])].slice(0, 500))); } catch { /* Notifications remain available without browser storage. */ }
          clearTimeout(timer);
          timer = setTimeout(() => setPopup(null), 9000);
        }
      } catch { /* Retry on the next poll. */ }
      finally { refreshing = false; }
    }
    void refresh();
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(timer); window.removeEventListener("focus", onFocus); };
  }, []);
  function show() { setOpen(true); setPopup(null); setUnread(0); }
  function overlay(content: React.ReactNode) {
    return typeof document === "undefined" ? content : createPortal(content, document.body);
  }
  return <>
    <Button type="button" variant="ghost" size="icon" className="relative" onClick={show} aria-label="Open notifications"><Bell className="h-5 w-5" />{unread > 0 || hasExpiry ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" /> : null}</Button>
    {overlay(<>
    {popup ? <div role="status" className="no-print fixed right-3 top-20 z-[80] w-[calc(100vw-1.5rem)] max-w-sm rounded-xl border border-teal-200 bg-white p-4 shadow-xl"><div className="flex items-start gap-2"><button type="button" onClick={show} className="min-w-0 flex-1 text-left"><p className="font-bold text-slate-900">{popup.title}</p><p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-sm text-slate-600">{popup.detail}</p><p className="mt-2 text-xs font-semibold text-teal-700">View notifications</p></button><button type="button" onClick={() => setPopup(null)} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div></div> : null}
    {open ? <div className="no-print fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onClick={() => setOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="notifications-title" className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between border-b p-4"><h2 id="notifications-title" className="font-bold text-slate-900">Notifications</h2><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close notifications"><X className="h-5 w-5" /></Button></div><div className="overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{hasExpiry ? <button type="button" className="w-full border-b py-4 text-left text-sm font-semibold text-amber-700" onClick={() => { setOpen(false); onExpiry(); }}>Review medicine expiration alerts</button> : null}{notices.map(notice => <article key={notice.id} className="border-b py-4 last:border-0"><h3 className="text-sm font-bold text-slate-900">{notice.title}</h3><p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">{notice.detail}</p>{notice.href ? <Link href={notice.href} onClick={() => setOpen(false)} className="mt-2 inline-block text-sm font-semibold text-teal-700">View details</Link> : null}</article>)}{!notices.length && !hasExpiry ? <p className="py-8 text-center text-sm text-slate-500">No notifications.</p> : null}</div></section></div> : null}
    </>)}
  </>;
}
