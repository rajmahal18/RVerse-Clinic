const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

let user = { clinicId: "clinic-a" };
function visit(id, time, diagnosis) {
  return { id, timeIn: new Date(time), timeOut: new Date(time), status: "COMPLETED", diagnosis, treatmentPlan: `${diagnosis} treatment`, chiefComplaint: `${diagnosis} complaint`, requests: [], medicines: [], vaccinations: [], referrals: [], followUps: [], satisfactionSurvey: null };
}
const patient = { id: "patient-a", clinicId: "clinic-a", firstName: "Sample", lastName: "Patient", birthDate: new Date("1990-10-01T00:00:00Z"), gender: "FEMALE", createdAt: new Date(), clinic: { name: "Test Clinic" }, visits: [visit("latest", "2026-10-07T07:00:00Z", "LATEST diagnosis"), visit("past", "2026-10-07T01:00:00Z", "PAST diagnosis")] };
const mocks = {
  "@/lib/auth": { getCurrentUser: async () => user },
  "@/lib/prisma": { prisma: { patient: { findFirst: async ({ where }) => user && where.id === patient.id && where.clinicId === patient.clinicId ? patient : null }, user: { findMany: async () => [] } } },
  "@/lib/patient-view": { getAvailedServiceLabels: () => [] },
  "@/lib/patient-form-number": { getPatientFormCode: async () => "FORM-A" },
  "next/link": ({ children, ...props }) => React.createElement("a", props, children),
  "next/navigation": { notFound: () => { throw new Error("NOT_FOUND"); } },
  "@/components/layout/app-shell": { AppShell: ({ children }) => React.createElement("main", null, children) },
};
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function("require", "module", "exports", code)(name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/")) {
      const base = path.join("src", name.slice(2));
      return load(fs.existsSync(`${base}.tsx`) ? `${base}.tsx` : `${base}.ts`);
    }
    return require(name);
  }, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}

async function main() {
  const forms = load("src/lib/clinic-forms.ts");
  const past = await forms.getClinicFormData("patient-a", "past");
  const latest = await forms.getClinicFormData("patient-a");
  assert.equal(past.selectedVisit.id, "past");
  assert.equal(past.selectedVisit.diagnosis, "PAST diagnosis");
  assert.equal(latest.selectedVisit.id, "latest");
  assert.equal(await forms.getClinicFormData("patient-a", "foreign-visit"), null);
  assert.equal(await forms.getClinicFormData("patient-a", ""), null);
  assert.notEqual(forms.clinicFormFilename("medical-certificate", past), forms.clinicFormFilename("medical-certificate", latest), "Same-day visits need different PDF filenames");
  assert.equal(forms.clinicFormFilename("medicine-log", past), forms.clinicFormFilename("medicine-log", latest), "Patient-wide medicine log remains patient scoped");

  const Template = load("src/components/clinic-forms/form-templates.tsx").ClinicFormTemplate;
  const certificate = renderToStaticMarkup(React.createElement(Template, { form: "medical-certificate", data: past }));
  assert.ok(certificate.includes("PAST diagnosis"));
  assert.ok(certificate.includes("PAST diagnosis treatment"));
  assert.ok(!certificate.includes("LATEST diagnosis"));

  const FormsPage = load("src/app/patients/[id]/forms/page.tsx").default;
  const Preview = load("src/app/patients/[id]/forms/[form]/page.tsx").default;
  const list = await FormsPage({ params: Promise.resolve({ id: "patient-a" }), searchParams: Promise.resolve({ visitId: "past" }) });
  const listHtml = renderToStaticMarkup(list);
  for (const form of forms.clinicForms) assert.ok(listHtml.includes(`/forms/${form.slug}?visitId=past`), `Selected visit lost for ${form.slug}`);
  assert.ok(listHtml.includes('value="past" selected=""'));
  const preview = await Preview({ params: Promise.resolve({ id: "patient-a", form: "medical-certificate" }), searchParams: Promise.resolve({ visitId: "past" }) });
  const previewHtml = renderToStaticMarkup(preview);
  assert.ok(previewHtml.includes('/patients/patient-a/forms?visitId=past'));
  assert.ok(previewHtml.includes("PAST diagnosis"));
  const History = load("src/components/patients/visit-history-viewer.tsx").VisitHistoryViewer;
  const historyHtml = renderToStaticMarkup(React.createElement(History, { patientId: "patient-a", visits: [{ id: "past", timeIn: "Oct 7, 2026, 9:00 AM", status: "Completed", requests: [], medicines: [], vaccinations: [], followUps: [], referrals: [], labResults: [] }] }));
  assert.ok(historyHtml.includes('/patients/patient-a/forms?visitId=past'));
  await assert.rejects(Preview({ params: Promise.resolve({ id: "patient-a", form: "medical-certificate" }), searchParams: Promise.resolve({ visitId: "foreign" }) }), /NOT_FOUND/);

  const visits = patient.visits;
  patient.visits = [];
  await assert.rejects(Preview({ params: Promise.resolve({ id: "patient-a", form: "medical-certificate" }) }), /NOT_FOUND/);
  const empty = renderToStaticMarkup(await FormsPage({ params: Promise.resolve({ id: "patient-a" }) }));
  assert.ok(empty.includes("Requires visit"));
  patient.visits = visits;
  user = { clinicId: "clinic-b" };
  assert.equal(await forms.getClinicFormData("patient-a", "past"), null);
  user = null;
  assert.equal(await forms.getClinicFormData("patient-a", "past"), null);

  if (process.argv.includes("--browser")) {
    const { chromium } = require("playwright-core");
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
    try {
      const css = fs.readdirSync(".next/static/css").filter(name => name.endsWith(".css")).map(name => fs.readFileSync(path.join(".next/static/css", name), "utf8")).join("\n");
      const page = await browser.newPage();
      for (const width of [320, 375, 768, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        for (const html of [listHtml, previewHtml]) {
          await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`);
          const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
          assert.ok(size.scroll <= size.width, `Visit forms overflow at ${width}px: ${JSON.stringify(size)}`);
          assert.equal(await page.locator('select[name="visitId"]').inputValue(), "past");
        }
      }
      await page.emulateMedia({ media: "print" });
      assert.equal(await page.locator('select[name="visitId"]').isVisible(), false);
      assert.ok(await page.getByText("PAST diagnosis", { exact: true }).isVisible());
      assert.equal(await page.getByText("LATEST diagnosis", { exact: true }).count(), 0);
      const pdf = await page.pdf({ preferCSSPageSize: true });
      assert.equal(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length, 1);
      console.log("PASS: visit selection and certificate preview at 320/375/768/1280px; one-page past-visit certificate PDF; selector excluded from print.");
    } finally { await browser.close(); }
  }
  console.log("PASS: past/latest visit isolation, selection preserved through forms and back links, invalid visit rejected, same-day filenames, no-visit and clinic access safeguards.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
