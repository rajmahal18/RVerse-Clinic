const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");
function loader(mocks) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    new Function("require", "module", "exports", code)((name) => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith("@/") ? load(path.join("src", name.slice(2) + ".ts")) : require(name), module, module.exports);
    cache.set(file, module.exports); return module.exports;
  };
}
async function dashboardChecks() {
  const db = new PGlite(); let calls = 0, lastQuery;
  const load = loader({ "@/lib/prisma": { prisma: { $queryRaw: async (query) => { calls++; lastQuery = query; return (await db.query(query.text, query.values)).rows; } } } });
  try {
    await db.exec(`
      CREATE TABLE "Patient" (id text PRIMARY KEY, "clinicId" text, gender text, "birthDate" timestamp, "deletedAt" timestamp);
      CREATE TABLE "Visit" (id text PRIMARY KEY, "patientId" text, status text, "chiefComplaint" text, "deletedAt" timestamp);
      CREATE TABLE "VisitRequest" (id text PRIMARY KEY, "visitId" text, type text, remarks text, "deletedAt" timestamp);
      CREATE TABLE "MedicineRequest" (id text PRIMARY KEY, "visitId" text, status text, "deletedAt" timestamp);
      CREATE TABLE "VaccinationRecord" (id text PRIMARY KEY, "visitId" text, "deletedAt" timestamp);
      CREATE TABLE "Referral" (id text PRIMARY KEY, "visitId" text, "deletedAt" timestamp);
      CREATE INDEX ON "Visit" ("patientId");
      CREATE UNIQUE INDEX ON "VisitRequest" ("visitId", type);
      INSERT INTO "Patient" VALUES ('f','a','FEMALE','1990-11-23 16:00',null),('m','a','MALE','2000-02-28 16:00',null),('u','a','OTHER','2020-11-24 16:00',null),('archived','a','FEMALE','1990-01-01',now()),('other-clinic','b','MALE','1990-01-01',null);
      INSERT INTO "Visit" VALUES ('v1','f','COMPLETED','Cough; cough; Other: Headache; Other',null),('v2','m','COMPLETED','Cough; Headache',null),('v3','f','IN_PROGRESS','Headache',null),('v4','f','CANCELLED','Cough',null),('v5','archived','COMPLETED','Excluded',null),('v6','other-clinic','COMPLETED','Excluded',null),('v7','f','COMPLETED','Excluded',now()),('v8','u','QUEUED',E'Other: Headache;\n Headache\t; other',null);
      INSERT INTO "VisitRequest" VALUES ('r1','v1','CONSULTATION',null,null),('r2','v1','MEDICINES',null,null),('r3','v2','BP_CHECKING','Legacy remarks',null),('r4','v2','MEDICINES',null,null),('r5','v3','MEDICINES',null,null),('archived-request','v1','RBS_CHECKING',null,now());
      INSERT INTO "MedicineRequest" VALUES ('m1','v1','RECEIVED',null),('m2','v1','RECEIVED',null),('m3','v2','RECEIVED',null),('m4','v3','APPROVED',null);
      INSERT INTO "VaccinationRecord" VALUES ('vacc1','v1',null),('vacc2','v1',null),('archived-vacc','v2',now());
      INSERT INTO "Referral" VALUES ('archived-ref','v1',now());
    `);
    const state = load("src/lib/service-state.ts");
    await db.query('UPDATE "VisitRequest" SET remarks=$1 WHERE id=$2', [state.cancellationRemarks({ reason: "Declined", by: "Nurse", userId: "n", at: "2026-11-24T02:00:00Z", previousRemarks: null }), "r4"]);
    const { getDashboardInsights } = load("src/lib/dashboard-insight-data.ts");
    const now = new Date("2026-11-24T04:00:00Z");
    const result = await getDashboardInsights("a", now);
    assert.equal(calls, 1); assert.equal(result.visitCount, 4);
    assert.deepEqual(result.demographics, { profiles: 3, female: 1, male: 1, averageAge: 22 });
    assert.deepEqual(Object.fromEntries(result.services.map((row) => [row.label, row.visits])), { "BP Checking": 1, "Medical Consultation": 1, "Provision of Medicine": 1, "Provision of Vaccine": 1 });
    assert.deepEqual(result.complaints.map((row) => ({ ...row, label: row.label.toLowerCase() })), [{ label: "headache", visits: 4, female: 2, male: 1, unspecified: 1 }, { label: "cough", visits: 2, female: 1, male: 1, unspecified: 0 }]);
    assert.equal((await getDashboardInsights("a' OR 1=1 --", now)).visitCount, 0);
    const empty = await getDashboardInsights("missing", now); assert.equal(empty.visitCount, 0); assert.deepEqual(empty.services, []); assert.deepEqual(empty.complaints, []); assert.equal(empty.demographics.averageAge, 0);
    await db.exec(`INSERT INTO "Visit" SELECT 'bulk-'||n,'f','COMPLETED','Cough',null FROM generate_series(1,5000) n; INSERT INTO "VisitRequest" SELECT 'br-'||n,'bulk-'||n,'CONSULTATION',null,null FROM generate_series(1,5000) n;`);
    await db.exec("ANALYZE");
    const before = calls, start = performance.now(); const bulk = await getDashboardInsights("a", now); const elapsed = performance.now() - start;
    assert.equal(calls - before, 1); assert.equal(bulk.visitCount, 5004); assert.equal(bulk.services.find((row) => row.label === "Medical Consultation").visits, 5001);
    assert.ok(Buffer.byteLength(JSON.stringify(bulk)) < 5000);
    if (process.env.REVIEW_QUERY_PLAN) console.log((await db.query("EXPLAIN (ANALYZE, BUFFERS) " + lastQuery.text, lastQuery.values)).rows.map(row=>row["QUERY PLAN"]).join("\n"));
    console.log(`PASS: PostgreSQL dashboard aggregation, cancelled/archived/tenant isolation, unique service/complaint counts, Manila age boundaries, and bounded output (${bulk.visitCount} visits -> ${Buffer.byteLength(JSON.stringify(bulk))} bytes, one query, ${elapsed.toFixed(0)}ms local fixture).`);
  } finally { await db.close(); }
}
async function medicineRaceChecks() {
  const source = fs.readFileSync("src/app/actions/workflow.ts", "utf8");
  const ast = ts.createSourceFile("workflow.ts", source, ts.ScriptTarget.Latest, true);
  const names = new Set(["resolveItemRequestAction", "releaseItemRequestAction", "receiveMedicineAction", "dispenseMedicineAction", "getMedicineRequestForPatient", "isClosedVisitStatus"]);
  const extracted = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && names.has(node.name?.text)).map((node) => node.getText(ast)).join("\n");
  let request, nextStatus, writes = 0, role;
  const tx = { $queryRaw: async (query) => { if (query.join("?").includes('"MedicineRequest"')) { request.status = nextStatus; request.receivedBy = "First receiver"; } return []; }, visit: { findFirst: async () => ({ status: "IN_PROGRESS", requests: [{ type: "MEDICINES" }] }) }, medicineRequest: { findUnique: async () => structuredClone(request), update: async () => { writes++; throw Error("A stale transition wrote to the request"); } } };
  const prisma = { ...tx, $transaction: async (callback) => callback(tx) };
  const library = loader({ "@/lib/prisma": { prisma } })("src/lib/visit-cancellation.ts");
  const { UserRole, VisitStatus } = require("@prisma/client"), module = { exports: {} };
  const code = ts.transpileModule(extracted, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function("module", "exports", "prisma", "UserRole", "VisitStatus", "getLockedMedicineRequest", "runAction", "requireRole", "requiredString", "optionalString", "writeActivityLog", "revalidatePath", "redirect", code)(module, module.exports, prisma, UserRole, VisitStatus, library.getLockedMedicineRequest, async (data, path, mod, action, callback) => callback(), async () => ({ id: "user", role, clinicId: "a", name: "Staff" }), (data, key) => String(data.get(key) || ""), (data, key) => String(data.get(key) || "") || null, async () => {}, () => {}, () => {});
  function reset(status, fresh, linked = false) { writes = 0; nextStatus = fresh; role = "PHARMACIST"; request = { id: "m", visitId: linked ? "v" : null, status, inventoryItem: { clinicId: "a" }, visit: linked ? { patientId: "p", patient: { clinicId: "a" }, status: "IN_PROGRESS" } : null }; }
  const form = new FormData(); for (const [key, value] of Object.entries({ requestId: "m", medicineRequestId: "m", patientId: "p", decision: "REJECT" })) form.set(key, value);
  reset("REQUESTED", "RELEASED"); await assert.rejects(module.exports.resolveItemRequestAction(form), /no longer pending/); assert.equal(writes, 0);
  reset("APPROVED", "RECEIVED"); await assert.rejects(module.exports.releaseItemRequestAction(form), /not approved/); assert.equal(writes, 0);
  reset("APPROVED", "RECEIVED", true); await assert.rejects(module.exports.dispenseMedicineAction(form), /Approve/); assert.equal(writes, 0);
  reset("RELEASED", "RECEIVED", true); role = "NURSE"; await module.exports.receiveMedicineAction(form); assert.equal(writes, 0); assert.equal(request.receivedBy, "First receiver");
  console.log("PASS: real action handlers re-read after locks; stale reject/release/dispense cannot overwrite later statuses or stock; duplicate receipt preserves its original receiver.");
}
async function surveyDraftChecks() {
  const version = new Date("2026-11-24T04:00:00Z");
  let survey = { updatedAt: version }, draft = { updatedAt: new Date("2026-11-24T05:00:00Z"), values: { surveyVersion: ["2026-11-24T03:00:00.000Z"], sqd0: ["N/A"] } }, surveyReads = 0;
  const prisma = { visit: { findFirst: async () => ({ updatedAt: version, doctorLockedFields: [] }) }, formDraft: { findUnique: async () => structuredClone(draft) }, clientSatisfactionSurvey: { findUnique: async () => { surveyReads++; return survey; } }, visitRequest: { findMany: async () => [] } };
  const api = loader({ "@/lib/prisma": { prisma }, "@/lib/auth": { getCurrentUser: async () => ({ id: "n", clinicId: "a", role: "NURSE" }) }, "@/app/actions/workflow": {}, "next/server": { NextResponse: { json: (data) => data } } })("src/app/api/form-drafts/route.ts");
  const request = (key) => ({ nextUrl: new URL(`http://clinic.test/api/form-drafts?visitId=v&key=${key}`) });
  assert.deepEqual((await api.GET(request("survey"))).values, {}, "A stale answer version must not restore, even if that draft was autosaved later");
  draft.values.surveyVersion = [version.toISOString()]; assert.deepEqual((await api.GET(request("survey"))).values.sqd0, ["N/A"]);
  delete draft.values.surveyVersion; draft.updatedAt = new Date("2026-11-24T03:00:00Z"); assert.deepEqual((await api.GET(request("survey"))).values, {});
  const before = surveyReads; await api.GET(request("visit")); assert.equal(surveyReads, before, "Other draft modules must not gain an extra survey lookup");
  survey = null; draft.values.surveyVersion = [""]; assert.deepEqual((await api.GET(request("survey"))).values.sqd0, ["N/A"]);
  console.log("PASS: corrected surveys cannot be silently restored from stale server drafts, including later autosaves; current/new-survey drafts stay intact; unrelated drafts incur no extra lookup.");
}
(async () => { await dashboardChecks(); await medicineRaceChecks(); await surveyDraftChecks(); })().catch((error) => { console.error(error); process.exitCode = 1; });
