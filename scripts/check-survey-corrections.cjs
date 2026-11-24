const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => mocks[name] ?? require(name),
    module,
    module.exports,
  );
  return module.exports;
}
const questions = load("src/lib/survey-questions.ts", {});
let role = "ADMIN",
  csrf = true,
  found = true,
  failLog = false;
let answer = "N/A",
  logs = [];
let visitVersion = 0;
const { correctSurveyAnswerAction } = load(
  "src/app/actions/survey-corrections.ts",
  {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth": {
      getCurrentUser: async () =>
        role ? { id: "admin", role, clinicId: "clinic-a" } : null,
    },
    "@/lib/csrf": {
      assertValidCsrfToken: async () => {
        if (!csrf) throw new Error("CSRF");
      },
    },
    "@/lib/survey-questions": questions,
    "@/lib/prisma": {
      prisma: {
        $transaction: async (callback) => {
          const previous = answer,
            oldLogs = [...logs], oldVersion = visitVersion;
          try {
            return await callback({
              $queryRaw: async () => [],
              visit: { update: async () => { visitVersion++; return {}; } },
              clientSatisfactionSurvey: {
                findFirst: async ({ where }) => {
                  assert.equal(where.visit.patient.clinicId, "clinic-a");
                  assert.equal(where.visit.deletedAt, null);
                  assert.equal(where.visit.patient.deletedAt, null);
                  return found
                    ? {
                        visitId: "visit",
                        visit: {
                          patientId: "patient",
                          patient: { firstName: "Ana", lastName: "Cruz" },
                        },
                      }
                    : null;
                },
                updateMany: async ({ where, data }) => {
                  if (where.sqd0 !== answer) return { count: 0 };
                  answer = data.sqd0;
                  return { count: 1 };
                },
              },
              activityLog: {
                create: async ({ data }) => {
                  if (failLog) throw new Error("Log failed");
                  logs.push(data);
                },
              },
            });
          } catch (error) {
            answer = previous;
            logs = oldLogs;
            visitVersion = oldVersion;
            throw error;
          }
        },
      },
    },
  },
);
function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    surveyId: "survey",
    question: "sqd0",
    previousAnswer: "N/A",
    answer: "Strongly Agree",
    reason: "Confirmed with respondent",
    ...overrides,
  }))
    data.set(key, value);
  return data;
}
async function main() {
  for (const value of [null, "NURSE", "RECORDS", "DOCTOR"]) {
    role = value;
    assert.equal((await correctSurveyAnswerAction(form())).ok, false);
  }
  role = "ADMIN";
  csrf = false;
  assert.equal((await correctSurveyAnswerAction(form())).ok, false);
  csrf = true;
  for (const values of [
    { reason: "" },
    { reason: "x".repeat(1001) },
    { question: "visitId" },
    { answer: "invalid" },
    { answer: "N/A" },
  ])
    assert.equal((await correctSurveyAnswerAction(form(values))).ok, false);
  found = false;
  assert.equal((await correctSurveyAnswerAction(form())).ok, false);
  found = true;
  assert.equal(
    (await correctSurveyAnswerAction(form({ previousAnswer: "Agree" }))).ok,
    false,
  );
  failLog = true;
  assert.equal((await correctSurveyAnswerAction(form())).ok, false);
  assert.equal(answer, "N/A");
  assert.equal(logs.length, 0);
  assert.equal(visitVersion, 0);
  failLog = false;
  assert.equal((await correctSurveyAnswerAction(form())).ok, true);
  assert.equal(answer, "Strongly Agree");
  assert.equal(logs.length, 1);
  assert.equal(visitVersion, 1, "A correction must invalidate stale completed-visit editors");
  assert.equal(logs[0].userId, "admin");
  assert.equal(logs[0].metadata.reason, "Confirmed with respondent");
  assert.deepEqual(logs[0].metadata.changes.sqd0, {
    before: "N/A",
    after: "Strongly Agree",
  });
  assert.equal((await correctSurveyAnswerAction(form())).ok, false);
  assert.equal(logs.length, 1);
  console.log(
    "PASS: admin-only survey correction, CSRF, clinic scope, answer/reason validation, stale-answer protection, atomic audit logging, and before/after details.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
