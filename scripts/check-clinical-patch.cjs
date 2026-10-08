const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");
function load(filename, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
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
async function main() {
  const diagnosisLib = load("src/lib/diagnoses.ts");
  let diagnoses = [];
  let catalog = [
    {
      id: "disease-a",
      clinicId: "clinic-a",
      name: "Sample disease",
      isActive: true,
    },
  ];
  const fields = load("src/lib/visit-fields.ts");
  assert.throws(() => fields.requireVital({}), /at least one/);
  for (const [key, value] of Object.entries({
    bloodPressure: "120/80",
    temperature: "36.5",
    pulseRate: "78",
    respiratoryRate: "18",
    rbs: "105",
  }))
    fields.requireVital({ [key]: value });
  for (const value of [" ", "abc", "0", "-1", "Infinity"])
    assert.equal(fields.validVital("temperature", value), false);
  assert.equal(
    fields.printChiefComplaint("Cough; Other: custom complaint; Other"),
    "Cough; custom complaint",
  );
  assert.equal(fields.canEditVisitField("NURSE", "progressNotes", []), false);
  assert.equal(
    fields.canEditVisitField("NURSE", "bloodPressure", ["bloodPressure"]),
    false,
  );
  assert.equal(
    fields.canEditVisitField("ADMIN", "bloodPressure", ["bloodPressure"]),
    true,
  );
  let user = {
    id: "nurse-a",
    name: "Nurse A",
    clinicId: "clinic-a",
    role: "NURSE",
  };
  let csrf = true;
  let visit;
  let draft;
  let requests = [{ type: "CONSULTATION" }];
  const logs = [];
  const prisma = {
    visit: {
      findUnique: async ({ where }) =>
        where.id === visit.id ? { ...visit } : null,
      update: async ({ data }) => {
        Object.assign(visit, data);
        return { ...visit };
      },
    },
    visitRequest: {
      findMany: async ({ where }) =>
        where.OR
          ? requests.filter((r) =>
              ["MEDICINES", "REFERRAL", "VACCINATION"].includes(r.type),
            )
          : requests.filter((r) => where.type.in.includes(r.type)),
      deleteMany: async ({ where }) => {
        requests = requests.filter((r) => where.type.notIn.includes(r.type));
      },
      createMany: async ({ data }) => {
        requests.push(...data);
      },
      findFirst: async () =>
        requests.find((r) => r.type === "VACCINATION") ?? null,
      create: async ({ data }) => {
        requests.push(data);
      },
    },
    formDraft: {
      upsert: async ({ create }) => {
        draft = create;
      },
      updateMany: async () => {
        if (draft) draft.values = {};
      },
    },
    diseaseCatalog: {
      findMany: async ({ where }) =>
        catalog.filter(
          (d) => d.clinicId === where.clinicId && where.id.in.includes(d.id),
        ),
      findFirst: async ({ where }) =>
        catalog.find(
          (d) =>
            d.clinicId === where.clinicId &&
            (where.id
              ? d.id === where.id
              : d.name.toLowerCase() === where.name.equals.toLowerCase()),
        ) ?? null,
      update: async ({ where, data }) =>
        Object.assign(
          catalog.find((d) => d.id === where.id),
          data,
        ),
      create: async ({ data }) => {
        const d = { id: "disease-new", isActive: true, ...data };
        catalog.push(d);
        return d;
      },
    },
    visitDiagnosis: {
      findMany: async () => diagnoses,
      deleteMany: async () => {
        diagnoses = [];
      },
      createMany: async ({ data }) => {
        diagnoses = data;
      },
    },
    vaccinationRecord: {
      create: async ({ data }) => ({
        id: "vaccine-a",
        ...data,
        visit: { patient: visit.patient },
      }),
    },
    $queryRaw: async () => [],
    $transaction: async (fn) => fn(prisma),
  };
  const actions = load("src/app/actions/workflow.ts", {
    "@/lib/prisma": { prisma },
    "@/lib/auth": { getCurrentUser: async () => user },
    "@/lib/csrf": {
      assertValidCsrfToken: async () => {
        if (!csrf) throw new Error("CSRF invalid");
      },
    },
    "@/lib/activity-log": {
      writeActivityLog: async (log) => {
        logs.push(log);
      },
    },
    "@/lib/visit-fields": fields,
    "@/lib/diagnoses": diagnosisLib,
    "@/lib/action-feedback": {
      getActionErrorMessage: (e) => e.message,
      appendActionFeedback: (path, key, message) =>
        `${path}?${key}=${encodeURIComponent(message)}`,
    },
    "next/navigation": {
      redirect: (path) => {
        throw new Error(`REDIRECT:${path}`);
      },
    },
    "next/cache": { revalidatePath: () => {} },
  });
  function reset() {
    visit = {
      id: "visit-a",
      patientId: "patient-a",
      patient: {
        clinicId: "clinic-a",
        firstName: "Sample",
        lastName: "Patient",
      },
      status: "QUEUED",
      nurseOnDuty: "Nurse A",
      doctorLockedFields: [],
      bloodPressure: null,
      progressNotes: null,
      diagnosis: null,
      treatmentPlan: null,
      physicalExam: null,
      intakeNotes: null,
      diagnosisNotes: null,
      readyForDoctorAt: null,
      diagnosesStructured: false,
      progressNotesDoneAt: null,
      treatmentDoneAt: null,
      deletedAt: null,
    };
    diagnoses = [];
    draft = null;
    requests = [{ type: "CONSULTATION" }];
  }
  function form(values = {}) {
    const data = new FormData();
    for (const [key, value] of Object.entries({
      patientId: "patient-a",
      visitId: "visit-a",
      status: "IN_PROGRESS",
      requestTypes: "CONSULTATION",
      ...values,
    }))
      data.set(key, value);
    return data;
  }
  async function run(action, values, expectedError) {
    try {
      await action(form(values));
      assert.fail("Expected redirect");
    } catch (error) {
      assert.ok(error.message.startsWith("REDIRECT:"), error.message);
      if (expectedError)
        assert.ok(
          decodeURIComponent(error.message).includes(expectedError),
          error.message,
        );
      else
        assert.ok(
          !error.message.includes("?error="),
          decodeURIComponent(error.message),
        );
    }
  }
  reset();
  await run(actions.startVisitAction, {}, "at least one");
  assert.equal(visit.status, "QUEUED");
  await run(
    actions.updateVisitStatusAction,
    { status: "IN_PROGRESS" },
    "at least one",
  );
  await run(
    actions.startVisitAction,
    { bloodPressure: "invalid" },
    "valid blood pressure",
  );
  await run(actions.startVisitAction, { bloodPressure: "120/80" });
  assert.equal(visit.status, "IN_PROGRESS");
  await run(
    actions.startVisitAction,
    { bloodPressure: "120/80" },
    "already been started",
  );
  await run(
    actions.updateVisitAction,
    {
      status: "IN_PROGRESS",
      requestTypes: "CONSULTATION",
      progressNotes: "Nurse tampering",
    },
    "owned by the doctor",
  );
  assert.equal(visit.progressNotes, null);
  user = { ...user, id: "doctor-a", name: "Doctor A", role: "DOCTOR" };
  await run(actions.updateVisitAction, {
    status: "IN_PROGRESS",
    requestTypes: "CONSULTATION",
    progressNotes: "Doctor notes",
    bloodPressure: "125/80",
    diagnosis: "Rule out: Sample disease",
  });
  assert.ok(visit.doctorLockedFields.includes("bloodPressure"));
  assert.equal(visit.nurseOnDuty, "Nurse A");
  user = { ...user, id: "nurse-a", name: "Nurse A", role: "NURSE" };
  await run(
    actions.updateVisitAction,
    {
      status: "IN_PROGRESS",
      requestTypes: "CONSULTATION",
      bloodPressure: "130/90",
    },
    "owned by the doctor",
  );
  assert.equal(visit.bloodPressure, "125/80");
  const before = JSON.stringify(visit);
  assert.deepEqual(
    await actions.autosaveVisitDraftAction(
      form({ progressNotes: "Tampered draft", chiefComplaint: "Cough" }),
    ),
    { ok: true },
  );
  assert.equal(JSON.stringify(visit), before);
  assert.equal(draft.values.progressNotes, undefined);
  assert.deepEqual(draft.values.chiefComplaint, ["Cough"]);
  csrf = false;
  assert.deepEqual(
    await actions.autosaveVisitDraftAction(form({ chiefComplaint: "X" })),
    { ok: false },
  );
  csrf = true;
  user = { ...user, role: "DOCTOR" };
  await run(
    actions.markDoctorSectionDoneAction,
    { doctorSection: "treatmentPlan" },
    "Enter the section details",
  );
  await run(actions.markDoctorSectionDoneAction, {
    doctorSection: "progressNotes",
    progressNotes: "Doctor notes",
  });
  assert.ok(visit.progressNotesDoneAt);
  assert.equal(visit.treatmentDoneAt, null);
  const done = visit.progressNotesDoneAt;
  await run(actions.markDoctorSectionDoneAction, {
    doctorSection: "progressNotes",
    progressNotes: "Doctor notes",
  });
  assert.equal(visit.progressNotesDoneAt, done);
  await run(actions.updateVisitAction, {
    status: "IN_PROGRESS",
    requestTypes: "CONSULTATION",
    progressNotes: "Revised notes",
  });
  assert.equal(visit.progressNotesDoneAt, null);
  user = { ...user, role: "NURSE" };
  await run(
    actions.markDoctorSectionDoneAction,
    { doctorSection: "progressNotes" },
    "Only doctors",
  );
  await run(actions.addVaccinationRecordAction, {
    vaccine: "Sample vaccine",
    dose: "Booster",
  });
  assert.ok(requests.some((r) => r.type === "VACCINATION"));
  user = { ...user, role: "ADMIN" };
  await run(actions.updateVisitAction, {
    status: "IN_PROGRESS",
    requestTypes: "CONSULTATION",
    bloodPressure: "120/80",
  });
  assert.equal(visit.bloodPressure, "120/80");
  assert.ok(logs.some((log) => log.metadata?.changes?.bloodPressure));
  await run(actions.deleteAppointmentAction, {}, "Only queued or cancelled");
  reset();
  user.role = "NURSE";
  await run(actions.deleteAppointmentAction, {}, "permission");
  assert.equal(visit.deletedAt, null);
  user.role = "ADMIN";
  await run(actions.deleteAppointmentAction, {});
  assert.ok(visit.deletedAt);
  assert.equal(visit.status, "CANCELLED");
  reset();
  visit.patient.clinicId = "clinic-b";
  await run(actions.startVisitAction, { bloodPressure: "120/80" }, "not found");

  reset();
  visit.status = "IN_PROGRESS";
  visit.bloodPressure = "120/80";
  user.role = "NURSE";
  await run(actions.notifyDoctorAction, {}, "chief complaint");
  await run(actions.notifyDoctorAction, {
    chiefComplaint: "Cough",
    intakeNotes: "Started yesterday",
  });
  assert.ok(visit.readyForDoctorAt);
  user.role = "DOCTOR";
  await run(actions.markDoctorSectionDoneAction, {
    doctorSection: "progressNotes",
    progressNotes: "Doctor assessment",
    requestTypes: "BP_CHECKING",
  });
  assert.ok(requests.some((r) => r.type === "BP_CHECKING"));
  assert.ok(!requests.some((r) => r.type === "CONSULTATION"));
  await run(actions.updateVisitAction, {
    diagnosisSelections: JSON.stringify([
      { diseaseId: "disease-a", status: "TO_CONSIDER" },
    ]),
    diagnosisNotes: "Legacy finding preserved",
    physicalExam:
      "Essentially normal P.E. findings at the time of examination.",
  });
  assert.equal(diagnoses[0].diseaseId, "disease-a");
  assert.equal(diagnoses[0].status, "TO_CONSIDER");
  assert.equal(visit.diagnosesStructured, true);
  assert.match(visit.diagnosis, /Legacy finding preserved/);
  await run(
    actions.updateVisitAction,
    {
      diagnosisSelections: JSON.stringify([
        { diseaseId: "foreign", status: "CONFIRMED" },
      ]),
    },
    "unavailable",
  );
  user.role = "NURSE";
  await run(
    actions.updateVisitAction,
    { diagnosisSelections: "[]" },
    "Only doctors",
  );
  await run(actions.addDiseaseAction, { name: "New disease" }, "permission");
  user.role = "ADMIN";
  await run(actions.addDiseaseAction, { name: "New disease" });
  await run(actions.addDiseaseAction, { name: "new disease" }, "already");
  await run(actions.deleteDiseaseAction, { diseaseId: "disease-a" });
  assert.equal(catalog[0].isActive, false);
  assert.equal(diagnoses[0].diseaseName, "Sample disease");
  user.role = "DOCTOR";
  await run(actions.updateVisitAction, {
    diagnosisSelections: JSON.stringify([
      { diseaseId: "disease-a", status: "RULE_OUT" },
    ]),
  });
  assert.equal(diagnoses[0].status, "RULE_OUT");
  diagnoses = [];
  await run(
    actions.updateVisitAction,
    {
      diagnosisSelections: JSON.stringify([
        { diseaseId: "disease-a", status: "CONFIRMED" },
      ]),
    },
    "unavailable",
  );
  assert.throws(
    () =>
      diagnosisLib.parseDiagnosisSelections('[{"diseaseId":"a","status":""}]'),
    /valid status/,
  );
  assert.throws(
    () =>
      diagnosisLib.parseDiagnosisSelections(
        '[{"diseaseId":"a","status":"CONFIRMED"},{"diseaseId":"a","status":"RULE_OUT"}]',
      ),
    /duplicate/,
  );

  const db = new PGlite();
  try {
    for (const folder of fs
      .readdirSync("prisma/migrations")
      .filter((n) => fs.existsSync(`prisma/migrations/${n}/migration.sql`))
      .sort())
      await db.exec(
        fs.readFileSync(`prisma/migrations/${folder}/migration.sql`, "utf8"),
      );
    assert.ok(
      (
        await db.query(
          "SELECT column_name FROM information_schema.columns WHERE table_name='Visit' AND column_name='doctorLockedFields'",
        )
      ).rows.length,
    );
    assert.ok(
      (
        await db.query(
          "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid=pg_type.oid WHERE typname='UserRole' AND enumlabel='DOCTOR'",
        )
      ).rows.length,
    );
  } finally {
    await db.close();
  }
  console.log(
    "PASS: vital gates, nurse/doctor permissions and locks, draft isolation/CSRF, done signals, vaccine service linking, admin deletion, clinic isolation, and all SQL migrations.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
