export function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;
  const secret = process.env.AUTH_SECRET?.trim();
  if (
    !secret ||
    secret.length < 32 ||
    secret === process.env.DATABASE_URL ||
    secret === process.env.DIRECT_URL ||
    /replace-with|dev-secret|changeme/i.test(secret)
  ) {
    throw new Error(
      "Production requires an independent AUTH_SECRET of at least 32 characters. Generate a random secret and configure the service environment.",
    );
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const value = process.env[name];
    try {
      const url = new URL(value || "");
      if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2)
        throw new Error();
    } catch {
      throw new Error(
        `Production requires ${name} to be a valid PostgreSQL connection URL. See docs/ocm-deployment.md.`,
      );
    }
  }
  if (process.env.AUTH_COOKIE_SECURE === "false") {
    throw new Error(
      "Production requires HTTPS. Remove AUTH_COOKIE_SECURE=false or set it to true.",
    );
  }
  for (const name of ["AUTH_COOKIE_SECURE", "TRUST_PROXY_HEADERS"] as const) {
    if (process.env[name] && !["true", "false"].includes(process.env[name]!)) {
      throw new Error(`${name} must be true or false.`);
    }
  }
}

export function getAuthSecret() {
  if (process.env.NODE_ENV === "production") {
    validateProductionConfig();
    return process.env.AUTH_SECRET!;
  }
  return (
    process.env.AUTH_SECRET ||
    process.env.DATABASE_URL ||
    "clinic-system-layout-dev-secret"
  );
}

export const AUTH_COOKIE_SECURE =
  process.env.NODE_ENV === "production" ||
  process.env.AUTH_COOKIE_SECURE === "true";
export const TRUST_PROXY_HEADERS = process.env.TRUST_PROXY_HEADERS === "true";
