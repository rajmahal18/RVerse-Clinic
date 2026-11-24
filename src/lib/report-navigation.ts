export function safeReportReturnTo(value?: string) {
  if (!value || value.length > 3000 || !value.startsWith("/reports/monthly"))
    return undefined;
  try {
    const url = new URL(value, "https://clinic.local");
    if (
      url.origin !== "https://clinic.local" ||
      url.pathname !== "/reports/monthly"
    )
      return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

export function reportPatientHref(href: string, returnTo?: string) {
  const safe = safeReportReturnTo(returnTo);
  return safe
    ? `${href}${href.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(safe)}`
    : href;
}
