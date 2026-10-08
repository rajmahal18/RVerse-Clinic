const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
let role = "NURSE";
const visit = {
  id: "active",
  updatedAt: "2026-10-08T00:00:00Z",
  statusCode: "QUEUED",
  status: "Queued",
  timeIn: "Oct 8, 2026",
  doctorLockedFields: [],
  diagnoses: [],
  diagnosesStructured: false,
  diagnosis: "Legacy finding",
  diagnosisNotes: "",
  physicalExam: "",
  bloodPressure: "120/80",
  progressNotes: "Doctor notes",
  intakeNotes: "Initial history",
  requests: [
    { id: "request", type: "CONSULTATION", label: "Medical Consultation" },
  ],
  medicines: [],
  vaccinations: [],
  followUps: [],
  referrals: [],
  labResults: [],
  satisfactionSurvey: null,
};
const old = {
  ...visit,
  id: "old",
  statusCode: "COMPLETED",
  status: "Completed",
  progressNotes: "Historical assessment",
};
const patient = {
  id: "patient-a",
  clinicId: "clinic-a",
  firstName: "Sample",
  lastName: "Patient",
  gender: "Female",
  age: 36,
  visitHistory: [visit, old],
  latestVisit: visit,
};
const cache = new Map();
const mocks = {
  "next/link": ({ children, ...props }) =>
    React.createElement("a", props, children),
  "next/navigation": {
    notFound: () => {
      throw new Error("NOT_FOUND");
    },
  },
  "@/lib/auth": {
    getCurrentUser: async () => ({ role, name: "Staff", clinicId: "clinic-a" }),
  },
  "@/lib/prisma": {
    prisma: {
      diseaseCatalog: {
        findMany: async () => [
          { id: "disease-a", name: "Client-provided disease", isActive: true },
        ],
      },
    },
  },
  "@/lib/patient-view": {
    getPatientWorkflowProfile: async () => patient,
    getInventoryOptions: async () => [],
    getVaccineOptions: async () => [],
  },
  "@/app/actions/workflow": {},
  "@/components/security/csrf-field": { CsrfField: () => null },
};
function load(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith("@/")) {
        const base = path.join("src", name.slice(2));
        return load(
          fs.existsSync(base + ".tsx") ? base + ".tsx" : base + ".ts",
        );
      }
      return require(name);
    },
    module,
    module.exports,
  );
  cache.set(filename, module.exports);
  return module.exports;
}
async function main() {
  const Profile = load(
    "src/components/patients/patient-profile.tsx",
  ).PatientProfile;
  const queued = renderToStaticMarkup(
    await Profile({ id: patient.id, visitId: "old" }),
  );
  assert.ok(queued.includes("Historical assessment"));
  assert.ok(queued.includes("HISTORY"));
  assert.ok(!queued.includes("LABORATORY"));
  visit.statusCode = "IN_PROGRESS";
  visit.status = "In progress";
  const nurse = renderToStaticMarkup(await Profile({ id: patient.id }));
  assert.ok(nurse.includes("Ready for doctor / Notify doctor"));
  assert.match(nurse, /<textarea[^>]*id="progressNotes"[^>]*disabled=""/);
  role = "DOCTOR";
  const doctor = renderToStaticMarkup(await Profile({ id: patient.id }));
  assert.ok(!doctor.includes("Ready for doctor / Notify doctor"));
  assert.ok(!/<textarea[^>]*id="progressNotes"[^>]*disabled=""/.test(doctor));
  assert.ok(doctor.includes("Client-provided disease"));
  assert.ok(doctor.includes("Legacy finding"));
  assert.ok(!doctor.includes('value="CONFIRMED" selected=""'));
  if (process.argv.includes("--browser")) {
    const { chromium } = require("playwright-core");
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
      headless: true,
    });
    try {
      const css = fs
        .readdirSync(".next/static/css")
        .filter((n) => n.endsWith(".css"))
        .map((n) => fs.readFileSync(path.join(".next/static/css", n), "utf8"))
        .join("\n");
      const page = await browser.newPage();
      for (const width of [320, 375, 768, 1280])
        for (const html of [queued, nurse, doctor]) {
          await page.setViewportSize({ width, height: 900 });
          await page.setContent(`<style>${css}</style>${html}`);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `Profile overflow at ${width}px`,
          );
        }
    } finally {
      await browser.close();
    }
  }
  console.log(
    "PASS: historical notification target while queued, nurse/doctor intake ownership, client-only disease choices, preserved legacy text, and optional full-profile mobile layouts.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
