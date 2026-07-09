import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export const passwordRules = [
  { id: "length", label: "More than 8 characters", test: (value: string) => value.length > 8 },
  { id: "uppercase", label: "At least 1 uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { id: "lowercase", label: "At least 1 lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { id: "number", label: "At least 1 number", test: (value: string) => /\d/.test(value) },
  { id: "special", label: "At least 1 special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function validatePassword(value: string) {
  return passwordRules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(value),
  }));
}

export function isStrongPassword(value: string) {
  return validatePassword(value).every((rule) => rule.met);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return false;
  }

  const [scheme, salt, hash] = storedHash.split(":");

  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
