const base = "https://clinic.local";
export function localViewUrl(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return null;
  try {
    const url = new URL(value, base);
    if (
      url.origin !== base ||
      /^\/(?:api|login|logout)(?:\/|$)/.test(url.pathname)
    )
      return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
export function viewIdentity(value: string) {
  const url = new URL(value, base);
  for (const key of ["error", "message", "returnTo"])
    url.searchParams.delete(key);
  url.searchParams.sort();
  return `${url.pathname}${url.search}`;
}
export function viewStoragePrefix(scope: string) {
  return `clinic-view:v1:${scope}:`;
}
export function readViewValue<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
export function writeViewValue(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage is optional. */
  }
}
