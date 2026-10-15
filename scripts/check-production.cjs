const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const crypto = require("node:crypto");

function loadTs(file, mocks = {}, env = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", "process", code)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports, { env },
  );
  return module.exports;
}

async function main() {
  const valid = {
    NODE_ENV: "production", AUTH_SECRET: crypto.randomBytes(32).toString("hex"),
    DATABASE_URL: "postgresql://localhost:9/test", DIRECT_URL: "postgresql://localhost:9/test",
  };
  const config = (env) => loadTs("src/lib/security-config.ts", {}, env);
  config(valid).validateProductionConfig();
  assert.equal(config(valid).AUTH_COOKIE_SECURE, true);
  for (const change of [
    { AUTH_SECRET: undefined }, { AUTH_SECRET: "short" }, { AUTH_SECRET: valid.DATABASE_URL },
    { AUTH_SECRET: "replace-with-a-long-random-secret" }, { DATABASE_URL: undefined },
    { DATABASE_URL: "https://example.test" }, { DIRECT_URL: undefined },
    { AUTH_COOKIE_SECURE: "false" }, { TRUST_PROXY_HEADERS: "yes" },
  ]) assert.throws(() => config({ ...valid, ...change }).validateProductionConfig());
  assert.equal(config({ NODE_ENV: "development" }).AUTH_COOKIE_SECURE, false);
  config({ NODE_ENV: "development" }).validateProductionConfig();
  assert.equal(config({ NODE_ENV: "development" }).getAuthSecret(), "clinic-system-layout-dev-secret");
  const invalidConfig = config({ ...valid, AUTH_SECRET: undefined });
  assert.throws(() => loadTs("next.config.ts", { "./src/lib/security-config": invalidConfig }));
  const prodConfig = config(valid);
  const auth = loadTs("src/lib/auth.ts", {
    "next/headers": {}, "@/lib/auth-constants": {}, "@/lib/security-config": prodConfig, "@/lib/prisma": {},
  });
  const edge = loadTs("src/lib/auth-edge.ts", {
    "@/lib/auth-constants": {}, "@/lib/security-config": prodConfig,
  });
  const token = auth.createSessionToken({ userId: "synthetic", email: "test@example.test", role: "ADMIN", sessionVersion: 0 });
  assert.equal(auth.verifySessionToken(token).userId, "synthetic");
  assert.equal((await edge.verifyMiddlewareSession(token)).userId, "synthetic");
  assert.equal(auth.verifySessionToken(token + "tampered"), null);
  assert.equal(await edge.verifyMiddlewareSession(token + "tampered"), null);
  for (const trust of [false, true]) {
    const csrf = loadTs("src/lib/csrf.ts", {
      "next/headers": {
        cookies: async () => ({ get: () => undefined }),
        headers: async () => new Headers({ host: "clinic.test", origin: "https://spoof.test", "x-forwarded-host": "spoof.test", "x-forwarded-proto": "https" }),
      },
      "@/lib/csrf-constants": { CSRF_COOKIE_NAME: "csrf", CSRF_FIELD_NAME: "csrf" },
      "@/lib/security-config": { AUTH_COOKIE_SECURE: true, TRUST_PROXY_HEADERS: trust },
    });
    if (trust) await csrf.assertValidCsrfToken(new FormData());
    else await assert.rejects(csrf.assertValidCsrfToken(new FormData()));
  }
  const live = loadTs("src/app/api/health/live/route.ts");
  assert.equal(live.GET().status, 200);
  for (const fail of [false, true]) {
    const ready = loadTs("src/app/api/health/ready/route.ts", {
      "@/lib/prisma": { prisma: { $queryRaw: async () => { if (fail) throw Error("private diagnostic"); return [{ value: 1 }]; } } },
    });
    const response = await ready.GET();
    assert.equal(response.status, fail ? 503 : 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), { status: fail ? "unavailable" : "ok" });
  }
  // Execute the real bootstrap body with a mock client: no database connection.
  const bootstrap = fs.readFileSync("scripts/upsert-admin.mjs", "utf8").replace(/^import .*;\r?\n/gm, "");
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const scenario of ["missing", "weak", "existing", "new"]) {
    let clients = 0, creates = 0, clinicWrites = 0;
    const tx = {
      user: { findUnique: async () => scenario === "existing" ? { id: "synthetic" } : null,
        create: async (args) => { assert.equal(args.data.role, "ADMIN"); assert.match(args.data.passwordHash, /^scrypt:/); creates++; } },
      clinic: { upsert: async () => { clinicWrites++; return { id: "main-clinic" }; } },
    };
    class MockPrisma {
      constructor() { clients++; }
      async $transaction(fn) { return fn(tx); }
      async $disconnect() {}
    }
    const processMock = {
      env: scenario === "missing" ? {} : { SEED_ADMIN_EMAIL: "test@example.test", SEED_ADMIN_NAME: "Test", SEED_ADMIN_PASSWORD: scenario === "weak" ? "short" : crypto.randomBytes(24).toString("hex") },
      exit(code) { assert.equal(code, 1); throw Error("expected validation exit"); },
    };
    try {
      await new AsyncFunction("PrismaClient", "UserRole", "randomBytes", "scryptSync", "process", "console", bootstrap)(
        MockPrisma, { ADMIN: "ADMIN" }, crypto.randomBytes, crypto.scryptSync, processMock, { log() {}, error() {} },
      );
    } catch (error) { assert.equal(error.message, "expected validation exit"); }
    assert.equal(creates, scenario === "new" ? 1 : 0);
    assert.equal(clinicWrites, scenario === "new" ? 1 : 0);
    if (["missing", "weak"].includes(scenario)) assert.equal(clients, 0);
    if (scenario === "existing") assert.equal(processMock.exitCode, 1);
  }
  console.log("PASS: production validation, startup guard, development cookies, Node/Edge sessions, CSRF proxy boundary, health responses, and safe admin bootstrap (mock database).");
}
main().catch(() => { console.error("FAIL: production regression check. Inspect locally without sharing environment values."); process.exitCode = 1; });
