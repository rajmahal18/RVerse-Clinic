const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) =>
      Object.hasOwn(mocks, name)
        ? mocks[name]
        : name.startsWith("@/") || name.startsWith("next/")
          ? {}
          : require(name),
    module,
    module.exports,
  );
  return module.exports;
}
const { archiveFilter } = load("src/lib/archive-filter.ts");
let actor = { id: "admin-a", clinicId: "clinic-a", role: "ADMIN" };
let state,
  failAudit = false,
  csrf = true;
const delegateModels = {
  user: "User",
  patient: "Patient",
  visit: "Visit",
  inventoryItem: "InventoryItem",
  visitRequest: "VisitRequest",
  medicineRequest: "MedicineRequest",
  labResult: "LabResult",
  vaccinationRecord: "VaccinationRecord",
  referral: "Referral",
  followUp: "FollowUp",
  clientSatisfactionSurvey: "ClientSatisfactionSurvey",
  activityLog: "ActivityLog",
  inventoryMovement: "InventoryMovement",
  clinicServiceSetting: "ClinicServiceSetting",
};
function reset() {
  actor = { id: "admin-a", clinicId: "clinic-a", role: "ADMIN" };
  failAudit = false;
  csrf = true;
  state = Object.fromEntries(
    Object.values(delegateModels).map((model) => [model, []]),
  );
  state.User = [
    {
      id: "admin-a",
      clinicId: "clinic-a",
      role: "ADMIN",
      isActive: true,
      passwordHash: "secret-hash",
      sessionVersion: 0,
    },
    {
      id: "admin-b",
      clinicId: "clinic-a",
      role: "ADMIN",
      isActive: true,
      passwordHash: "secret-hash",
      sessionVersion: 0,
    },
    {
      id: "nurse-a",
      clinicId: "clinic-a",
      role: "NURSE",
      isActive: true,
      sessionVersion: 0,
    },
  ];
  state.Patient = [
    { id: "patient-a", clinicId: "clinic-a", lastName: "Sample" },
    { id: "foreign", clinicId: "clinic-b" },
  ];
  state.Visit = [
    { id: "visit-a", patientId: "patient-a", status: "COMPLETED" },
  ];
  state.InventoryItem = [
    {
      id: "batch-a",
      clinicId: "clinic-a",
      stock: 10,
      boxStock: 0,
      name: "Medicine",
      category: "MEDICINE",
    },
  ];
  state.MedicineRequest = [
    {
      id: "issued",
      visitId: "visit-a",
      inventoryItemId: "batch-a",
      quantity: 4,
      status: "RECEIVED",
    },
  ];
  state.VisitRequest = [
    { id: "service-a", visitId: "visit-a", type: "MEDICINES" },
    { id: "service-b", visitId: "visit-a", type: "CONSULTATION" },
  ];
  state.LabResult = [{ id: "lab-a", visitId: "visit-a", type: "HEMATOLOGY" }];
  for (const rows of Object.values(state))
    for (const row of rows) row.deletedAt = null;
}
function relation(model, row, key) {
  const lists = model === "Patient" ? { visits: "Visit" } : model === "Visit" ? { followUps: "FollowUp", vaccinations: "VaccinationRecord", requests: "VisitRequest" } : {};
  if (lists[key]) return { model: lists[key], rows: state[lists[key]].filter(child => model === "Patient" ? child.patientId === row.id : child.visitId === row.id) };
  if (key === "patient")
    return {
      model: "Patient",
      row: state.Patient.find((r) => r.id === row.patientId),
    };
  if (key === "visit")
    return {
      model: "Visit",
      row: state.Visit.find((r) => r.id === row.visitId),
    };
  if (key === "inventoryItem")
    return {
      model: "InventoryItem",
      row: state.InventoryItem.find((r) => r.id === row.inventoryItemId),
    };
  return null;
}
function matches(model, row, where = {}) {
  if (!row) return false;
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (key === "AND") {
      if (
        !(Array.isArray(value) ? value : [value]).every((w) =>
          matches(model, row, w),
        )
      )
        return false;
      continue;
    }
    if (key === "OR") {
      if (!value.some((w) => matches(model, row, w))) return false;
      continue;
    }
    const rel = relation(model, row, key);
    if (rel?.rows) {
      if (value.some && !rel.rows.some(child => matches(rel.model, child, value.some))) return false;
      if (value.none && rel.rows.some(child => matches(rel.model, child, value.none))) return false;
      continue;
    }
    if (rel) {
      if (!matches(rel.model, rel.row, value)) return false;
      continue;
    }
    const actual = row[key] ?? null;
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("not" in value && actual === value.not) return false;
      if ("gte" in value && actual < value.gte) return false;
      if ("in" in value && !value.in.includes(actual)) return false;
      if ("equals" in value && actual !== value.equals) return false;
    } else if (actual !== value) return false;
  }
  return true;
}
function update(row, data) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("increment" in value) row[key] = (row[key] ?? 0) + value.increment;
      else if ("decrement" in value)
        row[key] = (row[key] ?? 0) - value.decrement;
      else row[key] = value;
    } else row[key] = value;
  }
}
let onRowLock = null;
const prisma = {
  $queryRaw: async (strings) => { if(onRowLock) onRowLock(strings.join("")); return []; },
  $transaction: async (fn) => {
    const before = structuredClone(state);
    try {
      return await fn(prisma);
    } catch (e) {
      state = before;
      throw e;
    }
  },
};
for (const [delegate, model] of Object.entries(delegateModels)) {
  prisma[delegate] = {};
  for (const action of [
    "findFirst",
    "findFirstOrThrow",
    "findUnique",
    "findUniqueOrThrow",
    "findMany",
    "count",
    "update",
    "updateMany",
    "create",
    "upsert",
  ])
    prisma[delegate][action] = async (args) =>
      archiveFilter(
        {
          model,
          action,
          args: structuredClone(args ?? {}),
          dataPath: [],
          runInTransaction: true,
        },
        async (params) => {
          const { action, args } = params;
          let rows = state[model].filter((row) =>
            matches(model, row, args.where),
          );
          if (args.orderBy) rows = [...rows].reverse();
          if (action === "count") return rows.length;
          if (action === "findMany") {
            if (model === "InventoryItem" && args.include?.movements) {
              return Promise.all(rows.map(async row => ({ ...structuredClone(row), movements: await prisma.inventoryMovement.findMany({ where: { ...args.include.movements.where, inventoryItemId: row.id } }) })));
            }
            return structuredClone(rows);
          }
          if (action.startsWith("find")) {
            if (!rows[0] && action.endsWith("OrThrow"))
              throw Error("Record not found");
            const row = structuredClone(rows[0] ?? null);
            if (row && model === "Visit" && args.include) {
              if (args.include.patient)
                row.patient = state.Patient.find((p) => p.id === row.patientId);
              for (const [field, delegate] of Object.entries({
                requests: "visitRequest",
                medicines: "medicineRequest",
                vaccinations: "vaccinationRecord",
                referrals: "referral",
                followUps: "followUp",
              }))
                if (args.include[field])
                  row[field] = await prisma[delegate].findMany({
                    where: { ...args.include[field].where, visitId: row.id },
                  });
            }
            return row;
          }
          if (action === "create") {
            if (model === "ActivityLog" && failAudit)
              throw Error("Audit unavailable");
            const row = {
              id: `${model}-${state[model].length}`,
              createdAt: new Date(),
              ...(model === "ActivityLog" ? { status: "SUCCESS" } : {}),
              ...args.data,
            };
            state[model].push(row);
            return structuredClone(row);
          }
          if (action === "upsert") {
            const match = state[model].find((r) =>
              args.where.clinicId_type
                ? r.clinicId === args.where.clinicId_type.clinicId &&
                  r.type === args.where.clinicId_type.type
                : r.visitId === args.where.visitId,
            );
            if (match) {
              update(match, args.update);
              return structuredClone(match);
            }
            const row = { id: "setting", ...args.create };
            state[model].push(row);
            return structuredClone(row);
          }
          if (action === "update" && !rows.length)
            throw Error("Record not found");
          for (const row of action === "update" ? rows.slice(0, 1) : rows)
            update(row, args.data);
          return action === "update"
            ? structuredClone(rows[0])
            : { count: rows.length };
        },
      );
}
const actions = load("src/app/actions/record-management.ts", {
  "@/lib/prisma": { prisma },
  "@/lib/auth": { getCurrentUser: async () => actor },
  "@/lib/csrf": {
    assertValidCsrfToken: async () => {
      if (!csrf) throw Error("CSRF invalid");
    },
  },
  "@/lib/action-feedback": { getActionErrorMessage: (e) => e.message },
  "next/cache": { revalidatePath: () => {} },
  "next/navigation": {
    redirect: (path) => {
      throw Error(`REDIRECT:${path}`);
    },
  },
});
async function run(kind, id, values = {}, error) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    kind,
    recordId: id,
    reason: "Duplicate entry",
    acknowledge: "true",
    ...values,
  }))
    form.set(key, String(value));
  let result;
  try {
    await actions.manageRecordAction(form);
  } catch (e) {
    result = decodeURIComponent(e.message.replaceAll("+", " "));
  }
  assert.match(result || "", /^REDIRECT:/);
  if (error) assert.ok(result.includes(error), result);
  else assert.ok(!result.includes("error="), result);
}
async function main() {
  reset();
  actor.role = "NURSE";
  await run("Patient", "patient-a", {}, "Only admin");
  assert.equal(state.Patient[0].deletedAt, null);
  reset();
  csrf = false;
  await run("Patient", "patient-a", {}, "CSRF");
  reset();
  await run("Patient", "foreign", {}, "unavailable");
  assert.equal(state.Patient[1].deletedAt, null);
  state.Visit.push({id:"foreign-visit",patientId:"foreign",status:"COMPLETED",deletedAt:null});
  state.MedicineRequest.push({id:"foreign-medicine",visitId:"foreign-visit",inventoryItemId:"batch-a",quantity:1,status:"RECEIVED",deletedAt:null});
  await run("MedicineRequest","foreign-medicine",{stockHandling:"record-only"},"unavailable");
  await run("Patient", "patient-a", { reason: "" }, "reason");
  await run("Patient", "patient-a", { acknowledge: "false" }, "confirm");
  reset();
  failAudit = true;
  await run("Patient", "patient-a", {}, "Audit unavailable");
  assert.equal(state.Patient[0].deletedAt, null);
  reset();
  await run("Patient", "patient-a");
  assert.ok(state.Patient[0].deletedAt);
  assert.equal((await prisma.visit.findMany({})).length, 0);
  assert.equal((await prisma.medicineRequest.findMany({})).length, 0);
  assert.equal(state.MedicineRequest.length, 1);
  assert.equal(state.InventoryItem[0].stock, 10);
  await run("Visit", "visit-a", { operation: "restore" }, "unavailable");
  await run("Patient", "patient-a", { operation: "restore" });
  assert.equal((await prisma.visit.findMany({})).length, 1);
  await run("Visit", "visit-a");
  assert.equal(state.Visit[0].status, "COMPLETED");
  assert.equal((await prisma.labResult.findMany({})).length, 0);
  await run("Visit", "visit-a", { operation: "restore" });
  assert.equal((await prisma.labResult.findMany({})).length, 1);
  reset();
  await run("VisitRequest", "service-a", {}, "linked");
  await run("VisitRequest", "service-b");
  assert.ok(state.Visit[0].updatedAt instanceof Date, "Removing a service must invalidate the parent visit's edit version");
  assert.equal((await prisma.visitRequest.findMany({})).length, 1);
  assert.equal(state.VisitRequest.length, 2);
  reset();
  state.Visit[0].status = "IN_PROGRESS";
  await run("Visit", "visit-a");
  state.Visit.push({ id: "new-visit", patientId: "patient-a", status: "QUEUED", deletedAt: null });
  await run("Visit", "visit-a", { operation: "restore" }, "already has an active visit");
  assert.ok(state.Visit[0].deletedAt);
  reset();
  await run("MedicineRequest", "issued", { stockHandling: "record-only" });
  await run("VisitRequest", "service-a");
  await run("MedicineRequest", "issued", { operation: "restore" }, "Restore the removed service");
  await run("VisitRequest", "service-a", { operation: "restore" });
  await run("MedicineRequest", "issued", { operation: "restore" });
  assert.equal(state.InventoryItem[0].stock, 10);
  reset();
  await run("MedicineRequest", "issued", {}, "Choose whether");
  await run("MedicineRequest", "issued", { stockHandling: "record-only" });
  assert.equal(state.InventoryItem[0].stock, 10);
  assert.equal(state.InventoryMovement.length, 0);
  await run("MedicineRequest", "issued", { operation: "restore" });
  assert.equal(state.InventoryItem[0].stock, 10);
  reset();
  await run("MedicineRequest", "issued", { stockHandling: "returned" });
  assert.equal(state.InventoryItem[0].stock, 14);
  assert.equal(state.InventoryMovement[0].quantityChange, 4);
  assert.equal((await prisma.medicineRequest.findMany({})).length, 0);
  await run(
    "MedicineRequest",
    "issued",
    { stockHandling: "returned" },
    "unavailable",
  );
  assert.equal(state.InventoryItem[0].stock, 14);
  state.InventoryItem[0].stock = 2;
  await run(
    "MedicineRequest",
    "issued",
    { operation: "restore" },
    "Insufficient",
  );
  assert.equal(state.InventoryItem[0].stock, 2);
  assert.ok(state.MedicineRequest[0].deletedAt);
  state.InventoryItem[0].stock = 14;
  await run("MedicineRequest", "issued", { operation: "restore" });
  assert.equal(state.InventoryItem[0].stock, 10);
  assert.equal(state.InventoryMovement[1].quantityChange, -4);
  reset();
  await run("LabResult", "lab-a");
  assert.equal(state.LabResult.length, 1);
  assert.equal(await prisma.labResult.count({}), 0);
  await run("Visit", "visit-a");
  await run(
    "LabResult",
    "lab-a",
    { operation: "restore" },
    "Restore the patient",
  );
  reset();
  await run("InventoryItem", "batch-a");
  assert.equal(state.InventoryItem[0].stock, 10);
  assert.equal((await prisma.inventoryItem.findMany({})).length, 0);
  assert.equal(state.MedicineRequest[0].inventoryItemId, "batch-a");
  await run("InventoryItem", "batch-a", { operation: "restore" });
  assert.equal((await prisma.inventoryItem.findMany({})).length, 1);
  reset();
  await run("User", "admin-a", {}, "own account");
  await run("User", "admin-b");
  assert.equal(state.User[1].isActive, false);
  assert.equal(state.User[1].sessionVersion, 1);
  assert.equal(state.ActivityLog[0].metadata.before.passwordHash, undefined);
  await run("User", "admin-b", { operation: "restore" });
  assert.equal(state.User[1].isActive, false);
  assert.equal(state.User[1].sessionVersion, 2);
  reset();
  onRowLock = sql => { if(sql.includes('"MedicineRequest"')) { state.MedicineRequest[0].quantity=6; state.InventoryItem[0].stock=8; onRowLock=null; } };
  await run("MedicineRequest","issued",{stockHandling:"returned"});
  assert.equal(state.InventoryItem[0].stock,14,"Void must re-read the corrected quantity after acquiring row locks");
  assert.equal(state.InventoryMovement[0].quantityChange,6);
  // Check compound unique filters and nested report relations/counts.
  const compound = await archiveFilter(
    {
      model: "VisitRequest",
      action: "findUnique",
      args: { where: { visitId_type: { visitId: "v", type: "REFERRAL" } } },
      dataPath: [],
      runInTransaction: false,
    },
    async (p) => p,
  );
  assert.equal(compound.action, "findFirst");
  assert.equal(compound.args.where.AND[0].visitId, "v");
  assert.equal(compound.args.where.AND[0].visitId_type, undefined);
  const nested = await archiveFilter(
    {
      model: "Patient",
      action: "findMany",
      args: {
        include: {
          visits: {
            include: { medicines: true, labResults: true, requests: true },
          },
          _count: true,
        },
      },
      dataPath: [],
      runInTransaction: false,
    },
    async (p) => p,
  );
  assert.match(
    JSON.stringify(nested.args.include.visits.include.medicines.where),
    /deletedAt/,
  );
  assert.match(
    JSON.stringify(nested.args.include._count.select.visits.where),
    /deletedAt/,
  );
  const archived = await archiveFilter(
    {
      model: "Patient",
      action: "findMany",
      args: { where: { clinicId: "a", deletedAt: { not: null } } },
      dataPath: [],
      runInTransaction: false,
    },
    async (p) => p,
  );
  assert.equal(archived.args.where.clinicId, "a");
  assert.deepEqual(archived.args.where.deletedAt, { not: null });
  reset();
  let form = new FormData();
  form.set("type", "REFERRAL");
  form.set("isActive", "false");
  form.set("reason", "Temporarily unavailable");
  try {
    await actions.setClinicServiceAction(form);
  } catch (error) {
    assert.ok(!error.message.includes("error="), error.message);
  }
  const serviceLib = load("src/lib/service-settings.ts", {
    "@/lib/prisma": { prisma },
    "@/lib/clinic-services": load("src/lib/clinic-services.ts"),
  });
  assert.equal(
    (await serviceLib.clinicServiceOptions("clinic-a")).some(
      (s) => s.value === "REFERRAL",
    ),
    false,
  );
  assert.equal(
    (await serviceLib.clinicServiceOptions("clinic-a", ["REFERRAL"])).some(
      (s) => s.value === "REFERRAL",
    ),
    true,
  );
  await assert.rejects(
    () => serviceLib.requireAvailableServices("clinic-a", ["REFERRAL"]),
    /inactive/,
  );
  await serviceLib.requireAvailableServices(
    "clinic-a",
    ["REFERRAL"],
    ["REFERRAL"],
  );
  actor.role = "NURSE";
  form.set("isActive", "true");
  try {
    await actions.setClinicServiceAction(form);
  } catch (error) {
    assert.ok(
      decodeURIComponent(error.message.replaceAll("+", " ")).includes(
        "Only admin",
      ),
    );
  }
  assert.equal(state.ClinicServiceSetting[0].isActive, false);
  reset();
  state.Visit[0].status = "IN_PROGRESS";
  actor.role = "NURSE";
  const services = load("src/lib/clinic-services.ts");
  const workflow = load("src/app/actions/workflow.ts", {
    "@/lib/prisma": { prisma },
    "@/lib/auth": { getCurrentUser: async () => actor },
    "@/lib/csrf": { assertValidCsrfToken: async () => {} },
    "@/lib/clinic-services": services,
    "@/lib/date-time": load("src/lib/date-time.ts"),
    "@/lib/activity-log": { writeActivityLog: async () => {} },
    "@/lib/action-feedback": {
      getActionErrorMessage: (e) => e.message,
      appendActionFeedback: (path, key, message) =>
        path + "?" + key + "=" + encodeURIComponent(message),
    },
    "next/cache": { revalidatePath: () => {} },
    "next/navigation": {
      redirect: (path) => {
        throw Error("REDIRECT:" + path);
      },
    },
  });
  form = new FormData();
  for (const [key, value] of Object.entries({
    patientId: "patient-a",
    visitId: "visit-a",
    surveyDate: "2026-11-18",
    officeVisited: "Clinic",
    serviceAvailed: "MANUAL WRONG SERVICE",
    respondentSex: "Female",
    respondentAge: "34",
    cc1: "1",
    cc2: "1",
    cc3: "1",
    ...Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => ["sqd" + i, "Agree"]),
    ),
  }))
    form.set(key, value);
  try {
    await workflow.submitSatisfactionSurveyAction(form);
  } catch (error) {
    assert.ok(
      !error.message.includes("error="),
      decodeURIComponent(error.message),
    );
  }
  assert.equal(
    state.ClientSatisfactionSurvey[0].serviceAvailed,
    "Medical Consultation, Provision of Medicine",
  );
  reset();
  const views = load("src/lib/patient-view.ts", { "@/lib/prisma": { prisma }, "@/lib/date-time": load("src/lib/date-time.ts") });
  state.FollowUp.push({ id: "voided-follow-up", visitId: "visit-a", status: "SCHEDULED", deletedAt: new Date() });
  assert.equal((await views.getFollowUpPatientTableRows()).totalCount, 0, "A voided scheduled follow-up must not keep a patient in the follow-up list");
  state.VaccinationRecord.push({ id: "voided-vaccine", visitId: "visit-a", vaccine: "Flu", deletedAt: new Date() });
  assert.equal((await views.getVaccinationPatientTableRows()).totalCount, 0, "A voided vaccination must not keep a patient in the vaccination list");
  state.InventoryMovement.push({ id: "historical-issue", inventoryItemId: "batch-a", quantityChange: -3, reason: "Dispensed medicine", createdAt: new Date(Date.now() - 86400000) });
  const stockBefore = await views.getMedicineReportData("MONTHLY", "clinic-a");
  await run("InventoryItem", "batch-a");
  const stockAfter = await views.getMedicineReportData("MONTHLY", "clinic-a");
  assert.equal(stockAfter.totals.stockOut, 3, "Archiving a batch must not erase its historical issued quantities");
  assert.deepEqual(stockAfter.totals, stockBefore.totals);
  const info = load("src/lib/patient-medical-info.ts");
  assert.deepEqual(
    info.maintenanceLines("\u2022 Medicine A\nMedicine B, 5 mg"),
    ["Medicine A", "Medicine B, 5 mg"],
  );
  assert.deepEqual(
    info.parseVaccineHistory(
      JSON.stringify([
        { vaccine: "COVID 19", dose: "Booster 1", date: "2026-11-18" },
      ]),
    ),
    [{ vaccine: "COVID 19", dose: "Booster 1", date: "2026-11-18" }],
  );
  assert.throws(
    () =>
      info.parseVaccineHistory(
        JSON.stringify([{ vaccine: "Flu", dose: "1", date: "2026-02-30" }]),
      ),
    /valid vaccination/,
  );
  console.log(
    "PASS: admin/CSRF/clinic gates, required confirmation, audit rollback, parent archive filtering and restore order, soft service removal, explicit medicine stock handling, return/restore stock ledger, account-session revocation, preserved account names without password hashes, compound unique filters, nested report filtering, and medical-history validation.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
