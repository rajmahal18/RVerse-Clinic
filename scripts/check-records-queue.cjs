const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

// Exercise the real query/action code with synthetic users and database mocks.
// No live database or session is accessed.
function load(filename, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function("require", "module", "exports", code)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/") || name.startsWith("next/")) return {};
    return require(name);
  }, module, module.exports);
  return module.exports;
}

async function main() {
  let user = { id: "records-user", name: "Records Staff", role: "RECORDS", clinicId: "clinic-a" };
  let patientExists = true;
  let openVisit = null;
  const queries = [];
  const creates = [];
  const logs = [];
  const prisma = {
    patient: {
      findMany: async (query) => { queries.push(query); return []; },
      findFirst: async (query) => {
        assert.equal(query.where.clinicId, user.clinicId);
        return patientExists ? { id: "patient-a" } : null;
      },
    },
    visit: {
      findFirst: async () => openVisit,
      create: async (query) => {
        creates.push(query);
        return { id: "visit-a", patient: { clinicId: user.clinicId, lastName: "Sample", firstName: "Patient" } };
      },
    },
  };
  const mocks = {
    "@/lib/prisma": { prisma },
    "@/lib/auth": { getCurrentUser: async () => user },
    "@/lib/date-time": { getDayRange: () => ({ start: new Date("2026-10-06T00:00:00Z"), end: new Date("2026-10-07T00:00:00Z") }) },
    "@/lib/csrf": { assertValidCsrfToken: async () => {} },
    "@/lib/activity-log": { writeActivityLog: async (log) => logs.push(log) },
    "@/lib/action-feedback": { getActionErrorMessage: (error) => error.message, appendActionFeedback: (path, type, message) => `${path}?${type}=${encodeURIComponent(message)}` },
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect: (path) => { throw Object.assign(new Error("redirect"), { path }); } },
  };
  const view = load("src/lib/patient-view.ts", mocks);
  for (const clinicId of ["clinic-a", "clinic-b"]) {
    user.clinicId = clinicId;
    queries.length = 0;
    await view.getTodaysPatientQueueSections(2, 3, 25, "Sample");
    assert.equal(queries.length, 2);
    for (const query of queries) {
      assert.equal(query.where.clinicId, clinicId, "Both queues must use the signed-in clinic");
      assert.ok(query.where.OR.length, "Search must remain active");
    }
  }
  user = null;
  queries.length = 0;
  const empty = await view.getTodaysPatientQueueSections();
  assert.equal(queries.length, 0, "Unauthenticated requests must not query patients");
  assert.equal(empty.todaysQueue.totalCount, 0);
  assert.equal(empty.previousQueue.totalCount, 0);

  const actions = load("src/app/actions/workflow.ts", mocks);
  const form = new FormData();
  form.set("patientId", "patient-a");
  form.set("requestTypes", "CONSULTATION");
  for (const role of ["RECORDS", "ADMIN", "DOCTOR", "NURSE", "DOCTOR_NURSE"]) {
    user = { id: "user-a", name: "Sample Staff", role, clinicId: "clinic-a" };
    creates.length = 0;
    await assert.rejects(actions.createVisitAction(form), (error) => {
      assert.equal(error.path, "/patients/patient-a");
      return true;
    });
    assert.equal(creates.length, 1);
    assert.equal(creates[0].data.status, "QUEUED");
    assert.equal(creates[0].data.nurseOnDuty, ["RECORDS", "ADMIN", "DOCTOR"].includes(role) ? null : user.name);
  }
  for (const role of ["PHARMACIST", "SUPPLY_OFFICER"]) {
    user.role = role;
    creates.length = 0;
    await assert.rejects(actions.createVisitAction(form), (error) => error.path.includes("permission"));
    assert.equal(creates.length, 0);
  }
  user.role = "RECORDS";
  patientExists = false;
  await assert.rejects(actions.createVisitAction(form), (error) => error.path.includes("not%20found"));
  assert.equal(creates.length, 0, "Patients outside the clinic must not be queued");
  patientExists = true;
  openVisit = { id: "existing-visit" };
  await assert.rejects(actions.createVisitAction(form), (error) => error.path.includes("open%20visit"));
  assert.equal(creates.length, 0, "Existing open visits must still prevent duplicate appointments");
  assert.ok(logs.some((log) => log.action === "Queue visit" && log.status !== "FAILED"));
  console.log("PASS: both queues scoped by clinic; search and unauthenticated handling; Records NOD unassigned; clinical roles preserved; unauthorized roles, foreign patients, and duplicate appointments blocked.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
