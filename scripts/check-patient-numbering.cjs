const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");

function taggedQuery(strings, values) {
  return { sql: strings.map((text, index) => text + (index < values.length ? `$${index + 1}` : "")).join(""), values };
}

function adapter(db) {
  return {
    $executeRaw: async (strings, ...values) => {
      const query = taggedQuery(strings, values);
      await db.query(query.sql, query.values);
      return 0;
    },
    $queryRaw: async (strings, ...values) => {
      const query = taggedQuery(strings, values);
      return (await db.query(query.sql, query.values)).rows;
    },
    $transaction: (callback) => db.transaction((tx) => callback(adapter(tx))),
  };
}

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE "Patient" (
      "id" TEXT PRIMARY KEY, "clinicId" TEXT NOT NULL,
      "patientNumber" TEXT UNIQUE NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL
    );
    INSERT INTO "Patient" VALUES
      ('patient-b','clinic-one','OLD-B','2026-09-10T00:00:00Z'),
      ('patient-a','clinic-one','OLD-A','2026-08-10T00:00:00Z'),
      ('patient-c','clinic-two','OLD-C','2026-09-10T00:00:00Z');`);
    const before = (await db.query('SELECT * FROM "Patient" ORDER BY "id"')).rows;
    await db.exec(fs.readFileSync("prisma/migrations/20261005090000_patient_form_number/migration.sql", "utf8"));
    assert.deepEqual((await db.query('SELECT * FROM "Patient" ORDER BY "id"')).rows, before);
    assert.deepEqual((await db.query('SELECT * FROM "PatientFormNumber" ORDER BY "number"')).rows, [
      { patientId: "patient-a", number: 1 }, { patientId: "patient-b", number: 2 }, { patientId: "patient-c", number: 3 },
    ]);
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync("src/lib/patient-form-number.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    new Function("require", "module", "exports", code)((name) => {
      if (name === "@/lib/prisma") return { prisma: adapter(db) };
      if (name === "@/lib/date-time") return { APP_TIME_ZONE: "Asia/Shanghai" };
      throw new Error(`Unexpected module: ${name}`);
    }, module, module.exports);
    const { getPatientFormCode, findPatientByFormCode, getPatientCodeForDisplay } = module.exports;
    assert.equal(await getPatientCodeForDisplay("patient-b", new Date("2026-09-10T00:00:00Z")), "TC202609-0002");
    assert.equal(await getPatientFormCode("patient-b", new Date("2026-09-10T00:00:00Z")), "TC202609-0002");
    await db.exec(`INSERT INTO "Patient" VALUES
      ('patient-e','clinic-one','OLD-E','2026-10-03T00:00:00Z'),
      ('patient-d','clinic-one','OLD-D','2026-09-30T16:00:00Z');`);
    const codes = await Promise.all([
      getPatientFormCode("patient-e", new Date("2026-10-03T00:00:00Z")),
      getPatientFormCode("patient-d", new Date("2026-09-30T16:00:00Z")),
      getPatientFormCode("patient-e", new Date("2026-10-03T00:00:00Z")),
    ]);
    assert.deepEqual(codes, ["TC202610-0005", "TC202610-0004", "TC202610-0005"]);
    assert.equal(await findPatientByFormCode("tc202609-0002", "clinic-one"), "patient-b");
    assert.equal(await findPatientByFormCode("TC202609-0002", "clinic-two"), null);
    assert.equal(await findPatientByFormCode("TC202610-0002", "clinic-one"), null);
    await db.exec(`DELETE FROM "Patient" WHERE "id"='patient-e';
      INSERT INTO "Patient" VALUES ('patient-f','clinic-one','OLD-F','2026-11-01T00:00:00Z');`);
    assert.equal(await getPatientFormCode("patient-f", new Date("2026-11-01T00:00:00Z")), "TC202611-0006");
    assert.equal(await getPatientFormCode("patient-b", new Date("2026-09-10T00:00:00Z")), "TC202609-0002");
    assert.equal(await findPatientByFormCode("TC202610-0005", "clinic-one"), null);
    await db.exec('DROP TABLE "PatientFormNumber"');
    assert.equal(await getPatientCodeForDisplay("patient-b", new Date("2026-09-10T00:00:00Z")), null);
    console.log("PASS: additive migration, registration order, parallel requests, reprints, month rollover, clinic scope, and deleted-number retention (isolated PostgreSQL).");
  } finally {
    await db.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
