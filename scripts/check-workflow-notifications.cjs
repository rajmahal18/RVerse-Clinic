const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function load(filename, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function("require", "module", "exports", code)(name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/") || name.startsWith("next/")) return {};
    return require(name);
  }, module, module.exports);
  return module.exports;
}

async function main() {
  let user = { id: "staff-a", name: "Test Staff", role: "PHARMACIST", clinicId: "clinic-a" };
  let csrf = true;
  let stock = 5;
  let boxes = 2;
  let summaryRows = [{ status: "completed" }];
  const movements = [];
  const logs = [];
  const prisma = {
    inventoryItem: {
      findFirst: async ({ where }) => where.clinicId === "clinic-a" && where.id === "item-a" ? { id: "item-a", category: "MEDICINE", name: "Medicine A", unit: "pcs" } : null,
      updateMany: async ({ where, data }) => {
        assert.equal(where.clinicId, "clinic-a");
        if (stock < where.stock.gte || boxes < where.boxStock.gte) return { count: 0 };
        stock -= data.stock.decrement;
        boxes -= data.boxStock.decrement;
        return { count: 1 };
      },
    },
    inventoryMovement: { create: async ({ data }) => movements.push(data) },
    activityLog: { create: async ({ data }) => { logs.push(data); return { id: `log-${logs.length}` }; } },
    $transaction: async task => task(prisma),
  };
  const date = load("src/lib/date-time.ts", {});
  const summaryLib = load("src/lib/daily-summary.ts", { "@/lib/prisma": { prisma: { visit: { findMany: async ({ where }) => {
    assert.equal(where.patient.clinicId, "clinic-a");
    assert.equal(where.timeIn.gte.toISOString(), "2026-10-06T16:00:00.000Z");
    assert.equal(where.timeIn.lt.toISOString(), "2026-10-07T16:00:00.000Z");
    return [];
  } } } }, "@/lib/date-time": date });
  assert.throws(() => summaryLib.validSummaryDate("2026-02-30"));
  assert.throws(() => summaryLib.validSummaryDate("garbage"));
  assert.equal(summaryLib.readDailySummary({ date: "2026-10-07", rows: [{ name: "incomplete" }] }), null);
  await summaryLib.buildDailySummary("clinic-a", "2026-10-07");
  const opening = { id: "opening", createdAt: new Date("2026-09-30T00:00:00Z"), quantityChange: 50, boxQuantityChange: 3, reason: "Existing stock encoded", physicalCount: null, functionalCount: null };
  const adjustment = { id: "deduction", createdAt: new Date("2026-10-07T00:00:00Z"), quantityChange: -4, boxQuantityChange: -2, reason: "Manual adjustment", physicalCount: null, functionalCount: null };
  const itemBase = { category: "MEDICINE", name: "Test medicine", stock: 46, pcsPerBox: 10, reorderLevel: 5, unit: "pcs", createdAt: opening.createdAt, expirationDate: null, physicalCount: null, functionalCount: null };
  const ledgerItems = [{ ...itemBase, id: "boxed", boxStock: 1, movements: [opening, adjustment] }, { ...itemBase, id: "unit-only", boxStock: 0, movements: [{ ...opening, boxQuantityChange: 0 }, { ...adjustment, boxQuantityChange: 0 }] }];
  const view = load("src/lib/patient-view.ts", { "@/lib/date-time": date, "@/lib/prisma": { prisma: { inventoryItem: { findMany: async query => query.include ? ledgerItems : [] } } } });
  const ledger = await view.getInventoryLedgerData(undefined, "2026-10");
  assert.equal(ledger.rows[0].beginningBoxes, "3");
  assert.equal(ledger.rows[0].monthOutBoxes, "2");
  assert.equal(ledger.rows[0].remainingBoxes, "1");
  assert.equal(ledger.rows[0].beginningPieces, "50");
  assert.equal(ledger.rows[0].remainingPieces, "46");
  assert.equal(ledger.rows[1].beginningBoxes, "5", "Preserve historical unit-derived medicine boxes");
  assert.equal(ledger.rows[1].remainingBoxes, "4");
  const actions = load("src/app/actions/workflow.ts", {
    "@/lib/prisma": { prisma },
    "@/lib/auth": { getCurrentUser: async () => user },
    "@/lib/date-time": date,
    "@/lib/daily-summary": { validSummaryDate: summaryLib.validSummaryDate, buildDailySummary: async (clinicId, day) => { assert.equal(clinicId, "clinic-a"); return { date: day, rows: summaryRows }; } },
    "@/lib/csrf": { assertValidCsrfToken: async () => { if (!csrf) throw new Error("Invalid CSRF token"); } },
    "@/lib/activity-log": { writeActivityLog: async () => {} },
    "@/lib/action-feedback": { getActionErrorMessage: error => error.message, appendActionFeedback: (path, type, message) => `${path}?${type}=${encodeURIComponent(message)}` },
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect: path => { throw Object.assign(new Error("redirect"), { path }); } },
  });
  async function run(action, values) {
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.set(key, String(value)));
    try { await action(data); assert.fail("Expected redirect"); } catch (error) { if (!error.path) throw error; return error.path; }
  }
  const deduction = { itemId: "item-a", quantity: 3, boxQuantity: 0, reason: "Expired" };
  assert.match(await run(actions.deductInventoryQuantityAction, { ...deduction, quantity: -1 }), /error=/);
  assert.match(await run(actions.deductInventoryQuantityAction, { ...deduction, reason: "" }), /error=/);
  assert.match(await run(actions.deductInventoryQuantityAction, { ...deduction, reason: "x".repeat(501) }), /error=/);
  assert.match(await run(actions.deductInventoryQuantityAction, { ...deduction, quantity: 0 }), /error=/);
  assert.match(await run(actions.deductInventoryQuantityAction, { ...deduction, itemId: "foreign-item" }), /error=/);
  user.role = "RECORDS";
  assert.match(await run(actions.deductInventoryQuantityAction, deduction), /error=/);
  user.role = "PHARMACIST";
  csrf = false;
  assert.match(await run(actions.deductInventoryQuantityAction, deduction), /error=/);
  csrf = true;
  assert.equal(stock, 5);
  const concurrent = await Promise.all([run(actions.deductInventoryQuantityAction, deduction), run(actions.deductInventoryQuantityAction, deduction)]);
  assert.equal(concurrent.filter(path => path.includes("message=")).length, 1);
  assert.equal(concurrent.filter(path => path.includes("error=")).length, 1);
  assert.equal(stock, 2);
  assert.equal(movements.length, 1);
  assert.equal(movements[0].quantityChange, -3);
  assert.match(movements[0].reason, /Test Staff: Expired/);
  assert.match(await run(actions.deductInventoryQuantityAction, { ...deduction, quantity: 0, boxQuantity: 1 }), /message=/);
  assert.equal(boxes, 1);
  assert.equal(logs[0].userId, "staff-a");

  const day = date.formatDateKey(new Date());
  assert.match(await run(actions.submitDailySummaryAction, { date: day }), /error=/);
  user.role = "DOCTOR_NURSE";
  summaryRows = [];
  assert.match(await run(actions.submitDailySummaryAction, { date: day }), /error=/);
  summaryRows = [{ status: "in progress" }];
  assert.match(await run(actions.submitDailySummaryAction, { date: day }), /error=/);
  summaryRows = [{ status: "completed" }];
  assert.match(await run(actions.submitDailySummaryAction, { date: day }), /submission=/);
  assert.equal(logs.at(-1).module, "Daily Summary");
  assert.deepEqual(logs.at(-1).metadata.rows, summaryRows);

  const patient = { id: "patient-a", firstName: "Sample", lastName: "Patient" };
  const now = new Date();
  const calls = [];
  function query(name, result) { return async args => { calls.push(name); const scope = args.where.clinicId ?? args.where.patient?.clinicId ?? args.where.visit?.patient?.clinicId; assert.equal(scope, "clinic-a"); return result; }; }
  const apiPrisma = {
    inventoryItem: { fields: { reorderLevel: "reorderLevel" }, findMany: query("stock", [{ id: "item-a", name: "Medicine A", stock: 2, unit: "pcs", reorderLevel: 5 }]) },
    followUp: { findMany: query("schedule", [{ id: "followup-a", createdAt: now, scheduledFor: now, visit: { patient } }]) },
    referral: { findMany: query("referral", []) },
    medicineRequest: { findMany: query("release", [{ id: "release-a", releasedAt: now, itemName: "Medicine A", quantity: 1, visit: { patient } }]) },
    activityLog: { findMany: query("summary", [{ id: "summary-a", description: "Ready", createdAt: now }]) },
    visit: { findMany: async args => query(args.where.status === "COMPLETED" ? "completed" : "queue", [{ id: "visit-a", patientId: patient.id, patient, timeIn: now, timeOut: now, createdAt: now }])(args) },
  };
  const api = load("src/app/api/notifications/route.ts", { "@/lib/prisma": { prisma: apiPrisma }, "@/lib/auth": { getCurrentUser: async () => user }, "@/lib/date-time": date, "next/server": { NextResponse: { json: (body, options) => ({ body, options }) } } });
  for (const role of ["DOCTOR_NURSE", "PHARMACIST", "SUPPLY_OFFICER", "RECORDS", "ADMIN"]) {
    user.role = role;
    calls.length = 0;
    const response = await api.GET();
    assert.ok(response.body.notifications.some(notice => notice.id.startsWith("low-stock:")));
    assert.equal(calls.includes("release"), role === "DOCTOR_NURSE" || role === "ADMIN");
    assert.equal(calls.includes("schedule"), role === "DOCTOR_NURSE" || role === "ADMIN");
    assert.equal(calls.includes("queue"), role === "DOCTOR_NURSE" || role === "ADMIN");
    assert.equal(calls.includes("summary"), role === "RECORDS" || role === "ADMIN");
    assert.equal(calls.includes("completed"), role === "RECORDS" || role === "ADMIN");
    if (role === "RECORDS") assert.ok(response.body.notifications.some(notice => notice.href === "/patients/patient-a/forms/daily-patient-summary?visitId=visit-a"));
    if (role === "RECORDS") assert.ok(response.body.notifications.some(notice => notice.href === "/reports/daily-summary?submission=summary-a"));
    if (role === "DOCTOR_NURSE" || role === "RECORDS") assert.equal(response.body.notifications.find(notice => notice.id.startsWith("low-stock:")).href, undefined);
  }
  user = null;
  assert.equal((await api.GET()).options.status, 401);
  console.log("PASS: role and clinic-scoped notifications; CSRF and permissions; concurrent and box-only deductions; stock audit; daily snapshot submission and Manila dates.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
