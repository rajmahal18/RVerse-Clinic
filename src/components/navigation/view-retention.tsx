"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useFeedbackRouter as useRouter } from "@/components/navigation/use-feedback-router";
import {
  localViewUrl,
  readViewValue,
  viewIdentity,
  viewStoragePrefix,
  writeViewValue,
} from "@/lib/view-retention";

const Scope = createContext<string | null>(null);
const changed = "clinic:view-changed";
export function ViewRetentionProvider({
  scope,
  children,
}: {
  scope: string;
  children: ReactNode;
}) {
  return (
    <Scope.Provider value={scope}>
      <Suspense fallback={null}>
        <NavigationRetention scope={scope} />
      </Suspense>
      {children}
    </Scope.Provider>
  );
}

// Only opt-in view state belongs here; clinical forms keep their existing draft handling.
export function useRetainedViewState<T>(
  name: string,
  initial: T,
  restoreDefault?: () => T,
): [T, Dispatch<SetStateAction<T>>] {
  const scope = useContext(Scope);
  const [value, setValue] = useState(initial);
  const initialRef = useRef(initial);
  const restoreDefaultRef = useRef(restoreDefault);
  restoreDefaultRef.current = restoreDefault;
  const keyRef = useRef<string | null>(null);
  useEffect(() => {
    function restore() {
      const key = scope
        ? `${viewStoragePrefix(scope)}state:${viewIdentity(location.pathname + location.search)}:${name}`
        : "";
      if (key === keyRef.current) return;
      keyRef.current = key;
      const fallback = restoreDefaultRef.current?.() ?? initialRef.current;
      const saved = key ? readViewValue(key, fallback) : fallback;
      setValue(
        fallback === null
          ? saved === null || typeof saved === "string"
            ? saved
            : fallback
          : typeof saved === typeof fallback
            ? saved
            : fallback,
      );
    }
    restore();
    window.addEventListener(changed, restore);
    return () => window.removeEventListener(changed, restore);
  }, [name, scope]);
  const update = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue((previous) => {
      const result =
        typeof next === "function"
          ? (next as (current: T) => T)(previous)
          : next;
      if (keyRef.current) writeViewValue(keyRef.current, result);
      return result;
    });
  }, []);
  return [value, update];
}

function NavigationRetention({ scope }: { scope: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const query = params.toString();
  useEffect(() => {
    const prefix = viewStoragePrefix(scope);
    try {
      sessionStorage.setItem("clinic-view:active-scope", scope);
    } catch {
      /* Storage is optional. */
    }
    const cleanParams = new URLSearchParams(query);
    cleanParams.delete("error");
    cleanParams.delete("message");
    const cleanQuery = cleanParams.toString();
    const current = pathname + (cleanQuery ? `?${cleanQuery}` : "");
    const identity = viewIdentity(current);
    const key = `${prefix}scroll:${identity}`;
    writeViewValue(`${prefix}last:${pathname}`, current);
    window.dispatchEvent(new Event(changed));
    let restoring = true;
    let signingOut = false;
    let second = 0;
    let timer = 0;
    const saved = readViewValue<number>(key, 0);
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        // Monthly reports already restore their expanded tables and scroll together.
        if (
          pathname !== "/reports/monthly" &&
          !location.hash &&
          Number.isFinite(saved) &&
          saved > 0
        )
          window.scrollTo({ top: saved, behavior: "instant" });
        observedScroll = window.scrollY;
        restoring = false;
      });
    });
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let observedScroll = window.scrollY;
    let writtenScroll = saved;
    const detailKey = prefix + 'details:' + identity;
    const rawDetails = readViewValue<Record<string, boolean>>(detailKey, {});
    let detailStates: Record<string, boolean> = rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails) ? rawDetails : {};
    function details() {
      const seen = new Map<string, number>();
      return [...document.querySelectorAll<HTMLDetailsElement>('main details:not([data-retention-managed])')]
        .filter(element => !element.closest('form, [role="dialog"]'))
        .map((element, index) => {
          const base = element.id ? 'id:' + element.id : 'summary:' + (element.querySelector(':scope > summary')?.textContent?.trim() || 'details');
          const occurrence = seen.get(base) || 0; seen.set(base, occurrence + 1);
          return { element, id: base + ':' + occurrence, legacy: element.id || index };
        });
    }
    function saveScroll() {
      if (pathname === "/reports/monthly" || signingOut || restoring || observedScroll === writtenScroll) return;
      writeViewValue(key, observedScroll); writtenScroll = observedScroll;
    }
    function saveDetails() {
      if (signingOut || restoring) return;
      let modified = false;
      for (const { element, id } of details()) {
        if (detailStates[id] !== element.open) { detailStates[id] = element.open; modified = true; }
      }
      if (modified) writeViewValue(detailKey, detailStates);
    }
    function save() {
      if (signingOut || restoring) return;
      if (viewIdentity(location.pathname + location.search) === identity) {
        observedScroll = window.scrollY; saveDetails();
      }
      saveScroll();
    }
    function onScroll() {
      if (pathname === "/reports/monthly" || signingOut || restoring) return;
      observedScroll = window.scrollY;
      if (!scrollTimer) scrollTimer = setTimeout(() => { scrollTimer = null; saveScroll(); }, 120);
    }
    function onToggle(event: Event) {
      if (event.target instanceof HTMLDetailsElement) saveDetails();
    }
    timer = window.setTimeout(() => {
      for (const { element, id, legacy } of details()) {
        const state = detailStates[id] ?? readViewValue(prefix + 'details:' + identity + ':' + legacy, element.open);
        if (typeof state === 'boolean') element.open = state;
        detailStates[id] = element.open;
      }
    }, 0);
    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href, location.origin);
      if (url.origin !== location.origin) return;
      let target = localViewUrl(url.pathname + url.search + url.hash);
      if (!target) return;
      save();
      const back = link.dataset.retainedBack;
      if (back) {
        const origin = readViewValue<string | null>(
          `${prefix}origin:${pathname}`,
          null,
        );
        const safe = origin && localViewUrl(origin);
        if (
          safe &&
          (back === "source" ||
            new URL(safe, location.origin).pathname === url.pathname)
        )
          target = safe;
        else if (!url.search && !url.hash)
          target =
            localViewUrl(
              readViewValue(`${prefix}last:${url.pathname}`, target),
            ) || target;
      } else if (
        (link.hasAttribute("data-retain-navigation") ||
          (url.pathname !== pathname &&
            (url.pathname.split("/").filter(Boolean).length === 1 ||
              url.pathname.startsWith("/reports/")))) &&
        !url.search &&
        !url.hash
      ) {
        target =
          localViewUrl(
            readViewValue(`${prefix}last:${url.pathname}`, target),
          ) || target;
      }
      if (
        !back &&
        !link.hasAttribute("data-retain-navigation") &&
        url.pathname !== pathname
      )
        writeViewValue(`${prefix}origin:${url.pathname}`, current);
      if (target !== url.pathname + url.search + url.hash) {
        event.preventDefault();
        event.stopPropagation();
        router.push(target);
      }
    }
    function clearOnLogout(event: SubmitEvent) {
      if (event.submitter?.getAttribute("aria-label") !== "Sign out") return;
      signingOut = true;
      try {
        Object.keys(sessionStorage)
          .filter(
            (name) =>
              name.startsWith(prefix) ||
              name.startsWith("clinic-report:") ||
              name === "clinic-view:active-scope",
          )
          .forEach((name) => sessionStorage.removeItem(name));
      } catch {
        /* Storage is optional. */
      }
    }
    document.addEventListener("click", click, true);
    document.addEventListener("submit", clearOnLogout, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("toggle", onToggle, true);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      clearTimeout(timer);
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", clearOnLogout, true);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("toggle", onToggle, true);
      if (scrollTimer) clearTimeout(scrollTimer);
      window.removeEventListener("pagehide", save);
    };
  }, [pathname, query, router, scope]);
  return null;
}
