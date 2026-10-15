const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const net = require("node:net");

async function run(invalid) {
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const value = server.address().port;
      server.close(() => resolve(value));
    });
  });
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
    env: { ...process.env, NODE_ENV: "production", AUTH_SECRET: invalid ? "" : crypto.randomBytes(32).toString("hex"),
      DATABASE_URL: "postgresql://localhost:9/synthetic", DIRECT_URL: "postgresql://localhost:9/synthetic", AUTH_COOKIE_SECURE: "true", TRUST_PROXY_HEADERS: "false" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const collect = (chunk) => { output += chunk.toString(); };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  try {
    const exit = new Promise((resolve) => child.once("exit", (code) => resolve(code)));
    if (invalid) {
      let timeout;
      const code = await Promise.race([exit, new Promise((_, reject) => { timeout = setTimeout(() => reject(Error("startup timeout")), 20000); })]).finally(() => clearTimeout(timeout));
      assert.notEqual(code, 0);
      assert.match(output, /Production requires an independent AUTH_SECRET/);
    } else {
      let response;
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        try { response = await fetch(`http://127.0.0.1:${port}/api/health/live`, { signal: AbortSignal.timeout(1000) }); if (response.status === 200) break; } catch {}
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      assert.equal(response?.status, 200);
      assert.deepEqual(await response.json(), { status: "ok" });
      const login = await fetch(`http://127.0.0.1:${port}/login`);
      assert.equal(login.status, 200);
      assert.match(login.headers.get("set-cookie"), /Secure/i);
    }
  } finally { child.kill(); }
}
(async () => {
  await run(true);
  await run(false);
  console.log("PASS: built server rejects missing production secret; valid config serves liveness/login with secure CSRF cookie (no database queries).");
})().catch((error) => { console.error("FAIL: built-server startup check (" + (error.message === "startup timeout" ? "invalid-config process did not exit" : error.code || error.name) + "); child output withheld to protect configuration."); process.exitCode = 1; });
