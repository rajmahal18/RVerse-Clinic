"use client";
import Link from "@/components/navigation/app-link";
import { useEffect, useState, type ComponentProps } from "react";
import {
  localViewUrl,
  readViewValue,
  viewStoragePrefix,
} from "@/lib/view-retention";

export function RetainedBackLink({
  href,
  source = false,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  source?: boolean;
}) {
  const [target, setTarget] = useState(href);
  useEffect(() => {
    setTarget(href);
    try {
      const scope = sessionStorage.getItem("clinic-view:active-scope");
      if (!scope) return;
      const prefix = viewStoragePrefix(scope);
      const fallback = new URL(href, location.origin);
      const origin = readViewValue<string | null>(
        `${prefix}origin:${location.pathname}`,
        null,
      );
      const safe = origin && localViewUrl(origin);
      if (
        safe &&
        (source ||
          new URL(safe, location.origin).pathname === fallback.pathname)
      )
        setTarget(safe);
      else if (!fallback.search && !fallback.hash)
        setTarget(
          localViewUrl(
            readViewValue(`${prefix}last:${fallback.pathname}`, href),
          ) || href,
        );
    } catch {
      /* The original Back link remains available. */
    }
  }, [href, source]);
  return (
    <Link
      {...props}
      href={target}
      data-retained-back={source ? "source" : "parent"}
    />
  );
}
