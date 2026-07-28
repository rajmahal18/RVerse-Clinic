"use client";

import { useEffect } from "react";

export function LandingRevealObserver() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-landing-reveal]"));
    const anchorLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".landing-page a[href^='#']"));

    const handleAnchorClick = (event: MouseEvent) => {
      const link = event.currentTarget as HTMLAnchorElement;
      const hash = link.hash;

      if (!hash) {
        return;
      }

      const target = document.querySelector<HTMLElement>(hash);

      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", hash);
    };

    anchorLinks.forEach((link) => link.addEventListener("click", handleAnchorClick));

    if (!elements.length) {
      return () => {
        anchorLinks.forEach((link) => link.removeEventListener("click", handleAnchorClick));
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -16% 0px",
        threshold: 0.18,
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      anchorLinks.forEach((link) => link.removeEventListener("click", handleAnchorClick));
    };
  }, []);

  return null;
}
