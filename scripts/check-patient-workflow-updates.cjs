const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith("@/") || name.startsWith("next/")) return {};
      return require(name);
    },
    module,
    module.exports,
  );
  return module.exports;
}
let user = { id: "admin", clinicId: "clinic-a", role: "ADMIN", name: "Admin" };
let state;
let failAudit = false;
const now = new Date("2026-11-18T02:00:00Z");
function reset() {
  failAudit = false;
  user.role = "ADMIN";
  state = {
    visit: {
      id: "visit-a",
      patientId: "patient-a",
      patient: { clinicId: "clinic-a" },
      status: "COMPLETED",
      updatedAt: now,
      chiefComplaint: null,
      doctorLockedFields: [],
      timeOut: now,
    },
    requests: [{ type: "CONSULTATION" }],
    medicines: [],
    inventory: [
      {
        id: "batch-a",
        clinicId: "clinic-a",
        category: "MEDICINE",
        name: "Paracetamol",
        stock: 50,
        isRequestable: true,
        expirationDate: null,
      },
      {
        id: "batch-b",
        clinicId: "clinic-a",
        category: "MEDICINE",
        name: "Ibuprofen",
        stock: 50,
        isRequestable: true,
        expirationDate: null,
      },
    ],
    logs: [],
    movements: [],
  };
}
const prisma = {
  $queryRaw: async () => [],
  $transaction: async (fn) => {
    const before = structuredClone(state);
    try {
      return await fn(prisma);
    } catch (error) {
      state = before;
      throw error;
    }
  },
  visit: {
    findUnique: async () => structuredClone(state.visit),
    update: async ({ data }) => Object.assign(state.visit, data),
  },
  visitRequest: {
    findMany: async ({ where }) =>
      where.OR
        ? state.requests.filter(
            (r) => r.type === "MEDICINES" && state.medicines.length,
          )
        : structuredClone(state.requests),
    deleteMany: async ({ where }) => {
      state.requests = state.requests.filter((r) =>
        where.type.notIn.includes(r.type),
      );
    },
    upsert: async ({ create }) => {
      if (!state.requests.some((r) => r.type === create.type))
        state.requests.push(create);
    },
  },
  inventoryItem: {
    findUnique: async ({ where }) =>
      state.inventory.find((i) => i.id === where.id),
    findFirst: async ({ where }) =>
      state.inventory.find(
        (i) => i.id === where.id && i.clinicId === where.clinicId,
      ),
    update: async ({ where, data }) =>
      Object.assign(
        state.inventory.find((i) => i.id === where.id),
        data,
      ),
    updateMany: async ({ where, data }) => {
      const item = state.inventory.find(
        (i) => i.id === where.id && i.clinicId === where.clinicId,
      );
      if (!item || (where.stock && item.stock < where.stock.gte))
        return { count: 0 };
      item.stock -= data.stock.decrement;
      return { count: 1 };
    },
  },
  medicineRequest: {
    findMany: async () => structuredClone(state.medicines),
    create: async ({ data }) => {
      const m = { id: `request-${state.medicines.length}`, ...data };
      state.medicines.push(m);
      return m;
    },
    update: async ({ where, data }) =>
      Object.assign(
        state.medicines.find((m) => m.id === where.id),
        data,
      ),
  },
  activityLog: {
    create: async ({ data }) => {
      if (failAudit) throw Error("Audit unavailable");
      state.logs.push(data);
      return data;
    },
  },
  inventoryMovement: { create: async ({ data }) => state.movements.push(data) },
  formDraft: { updateMany: async () => ({ count: 0 }) },
  labResult: { findMany: async () => [] },
  vaccinationRecord: { findMany: async () => [] },
  referral: { findMany: async () => [] },
  clientSatisfactionSurvey: { findUnique: async () => null },
};
const fields = load("src/lib/visit-fields.ts");
const actions = load("src/app/actions/workflow.ts", {
  "@/lib/prisma": { prisma },
    "@/lib/service-settings": { requireAvailableServices: async()=>{}, requireServiceForVisit: async()=>{} },
  "@/lib/auth": { getCurrentUser: async () => user },
  "@/lib/csrf": { assertValidCsrfToken: async () => {} },
  "@/lib/visit-fields": fields,
  "@/lib/date-time": {
    formatDateKey: (date) => new Date(date).toISOString().slice(0, 10),
  },
  "@/lib/activity-log": { writeActivityLog: async () => {} },
  "@/lib/action-feedback": {
    getActionErrorMessage: (e) => e.message,
    appendActionFeedback: (path, key, message) =>
      `${path}?${key}=${encodeURIComponent(message)}`,
  },
  "next/cache": { revalidatePath: () => {} },
  "next/navigation": {
    redirect: (path) => {
      throw Error(`REDIRECT:${path}`);
    },
  },
});
async function run(action, values, error) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    patientId: "patient-a",
    visitId: "visit-a",
    version: now.toISOString(),
    correctionReason: "Missing complaint",
    requestTypes: "CONSULTATION",
    ...values,
  }))
    form.set(key, String(value));
  let result;
  try {
    await action(form);
  } catch (e) {
    result = decodeURIComponent(e.message);
  }
  assert.match(result || "", /^REDIRECT:/);
  if (error) assert.ok(result.includes(error), result);
  else assert.ok(!result.includes("?error="), result);
}
async function checkExistingDatabaseMigration() {
  const { PGlite } = require("@electric-sql/pglite");
  const db = new PGlite();
  try {
    const migrations = fs
      .readdirSync("prisma/migrations")
      .filter((name) =>
        fs.existsSync(`prisma/migrations/${name}/migration.sql`),
      )
      .sort();
    const last = migrations.pop();
    for (const name of migrations)
      await db.exec(
        fs.readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"),
      );
    await db.exec(`INSERT INTO "Clinic" (id,name,"updatedAt") VALUES ('legacy-clinic','Legacy clinic',now());
      INSERT INTO "InventoryItem" (id,"clinicId",name,category,unit,stock,"batchKey","updatedAt") VALUES ('legacy-batch','legacy-clinic','Legacy medicine','MEDICINE','pcs',37,'legacy-key',now());
      INSERT INTO "Patient" (id,"patientNumber","clinicId","lastName","firstName","birthDate",gender,"updatedAt") VALUES ('legacy-patient','P-001','legacy-clinic','Sample','Patient','1990-01-01','FEMALE',now());
      INSERT INTO "Visit" (id,"patientId","timeIn",status,"updatedAt") VALUES ('legacy-visit','legacy-patient',now(),'COMPLETED',now());`);
    await db.exec(
      fs.readFileSync(`prisma/migrations/${last}/migration.sql`, "utf8"),
    );
    assert.deepEqual(
      (
        await db.query(
          'SELECT stock, "isRequestable" FROM "InventoryItem" WHERE id=\'legacy-batch\'',
        )
      ).rows,
      [{ stock: 37, isRequestable: true }],
    );
    assert.deepEqual(
      (
        await db.query(
          'SELECT status, "chiefComplaint" FROM "Visit" WHERE id=\'legacy-visit\'',
        )
      ).rows,
      [{ status: "COMPLETED", chiefComplaint: null }],
    );
  } finally {
    await db.close();
  }
}

async function main() {
  await checkExistingDatabaseMigration();
  reset();
  await run(actions.correctCompletedVisitAction, { chiefComplaint: "Cough" });
  assert.equal(state.visit.chiefComplaint, "Cough");
  assert.equal(state.visit.status, "COMPLETED");
  assert.deepEqual(state.visit.timeOut, now);
  assert.equal(state.logs[0].metadata.changes.chiefComplaint.before, null);
  assert.equal(state.logs[0].metadata.changes.chiefComplaint.after, "Cough");
  reset();
  user.role = "NURSE";
  await run(
    actions.correctCompletedVisitAction,
    { chiefComplaint: "Cough" },
    "permission",
  );
  assert.equal(state.visit.chiefComplaint, null);
  reset();
  state.visit.patient.clinicId = "another";
  await run(
    actions.correctCompletedVisitAction,
    { chiefComplaint: "Cough" },
    "not found",
  );
  assert.equal(state.visit.chiefComplaint, null);
  reset();
  await run(
    actions.correctCompletedVisitAction,
    { version: "stale", chiefComplaint: "Cough" },
    "changed",
  );
  assert.equal(state.visit.chiefComplaint, null);
  reset();
  failAudit = true;
  await run(
    actions.correctCompletedVisitAction,
    { chiefComplaint: "Cough" },
    "Audit unavailable",
  );
  assert.equal(state.visit.chiefComplaint, null);
  reset();
  state.medicines = [
    {
      id: "issued",
      visitId: "visit-a",
      inventoryItemId: "batch-a",
      quantity: 10,
      status: "RECEIVED",
    },
  ];
  await run(actions.correctCompletedVisitAction, {
    "medicine:issued:quantity": 12,
  });
  assert.equal(state.inventory[0].stock, 48);
  assert.equal(state.movements[0].quantityChange, -2);
  assert.equal(state.medicines[0].status, "RECEIVED");
  reset();
  state.medicines = [
    {
      id: "issued",
      visitId: "visit-a",
      inventoryItemId: "batch-a",
      quantity: 10,
      status: "RECEIVED",
    },
  ];
  await run(actions.correctCompletedVisitAction, {
    "medicine:issued:quantity": 8,
  });
  assert.equal(state.inventory[0].stock, 52);
  assert.equal(state.movements[0].quantityChange, 2);
  reset();
  state.medicines = [
    {
      id: "issued",
      visitId: "visit-a",
      inventoryItemId: "batch-a",
      quantity: 10,
      status: "RECEIVED",
    },
  ];
  await run(
    actions.correctCompletedVisitAction,
    { "medicine:issued:quantity": 100 },
    "Insufficient",
  );
  assert.equal(state.inventory[0].stock, 50);
  assert.equal(state.medicines[0].quantity, 10);
  reset();
  state.visit.status = "IN_PROGRESS";
  user.role = "NURSE";
  const lines = {
    "line:0:inventoryItemId": "batch-a",
    "line:0:quantity": 2,
    "line:0:frequencyMode": "ONCE_DAILY",
    "line:0:durationMode": "DAYS",
    "line:0:durationValue": 2,
    "line:1:inventoryItemId": "batch-b",
    "line:1:quantity": 3,
    "line:1:frequencyMode": "AS_NEEDED",
    "line:1:durationMode": "AS_NEEDED",
  };
  await run(actions.requestMedicineAction, lines);
  assert.equal(state.medicines.length, 2);
  assert.equal(state.logs.length, 2);
  assert.equal(state.inventory[0].stock, 50);
  await run(actions.requestMedicineAction, lines);
  assert.equal(
    state.medicines.length,
    4,
    "Additional requests are allowed while previous requests are pending",
  );
  reset();
  state.visit.status = "IN_PROGRESS";
  state.inventory[1].isRequestable = false;
  await run(actions.requestMedicineAction, lines, "hidden");
  assert.equal(
    state.medicines.length,
    0,
    "Batch submission rolls back every line",
  );
  assert.equal(state.logs.length, 0);
  reset();
  await run(actions.setMedicineVisibilityAction, {
    itemId: "batch-a",
    isRequestable: false,
  });
  assert.equal(state.inventory[0].isRequestable, false);
  assert.equal(state.inventory[0].stock, 50);
  user.role = "NURSE";
  await run(
    actions.setMedicineVisibilityAction,
    { itemId: "batch-a", isRequestable: true },
    "permission",
  );
  assert.equal(state.inventory[0].isRequestable, false);
  console.log(
    "PASS: admin-only corrections, clinic isolation, stale edit rejection, atomic audit logging, issued stock adjustments, multiple requests, repeat requests, hidden-batch rejection and pharmacist visibility permissions.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
