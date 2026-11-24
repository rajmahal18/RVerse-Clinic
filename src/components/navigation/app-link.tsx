"use client";
import NextLink, { useLinkStatus } from "next/link";
import { forwardRef, useEffect, useRef, type ComponentProps } from "react";
import { beginRequest } from "@/lib/request-feedback";

const usePendingLinkStatus = useLinkStatus ?? (() => ({ pending: false }));
function LinkFeedback() {
  const { pending } = usePendingLinkStatus();
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!pending) return;
    const link = marker.current?.closest("a");
    link?.setAttribute("aria-busy", "true");
    if (link) link.dataset.requestPending = "true";
    const finish = beginRequest("Opening page…");
    return () => {
      link?.removeAttribute("aria-busy");
      if (link) delete link.dataset.requestPending;
      finish();
    };
  }, [pending]);
  return <span ref={marker} hidden aria-hidden="true" />;
}
const AppLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(
  function AppLink({ children, ...props }, ref) {
    return (
      <NextLink {...props} ref={ref}>
        {children}
        <LinkFeedback />
      </NextLink>
    );
  },
);
export default AppLink;
