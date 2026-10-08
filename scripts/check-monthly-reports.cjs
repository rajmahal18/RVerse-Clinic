const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const cache = new Map();
let role = "ADMIN";
let reportData;
let dataCalls = 0;
const mocks = {
  "next/link": ({ children, ...props }) =>
    React.createElement("a", props, children),
  "next/navigation": {
    redirect: (location) => {
      throw Object.assign(new Error("redirect"), { location });
    },
  },
  "@/lib/auth": {
    getCurrentUser: async () => (role ? { role, clinicId: "clinic-a" } : null),
  },
  "@/components/layout/app-shell": {
    AppShell: ({ children }) => React.createElement("main", null, children),
  },
  "@/lib/monthly-report-data": {
    getMonthlyReports: async (clinicId, month, thresholds) => {
      assert.equal(clinicId, "clinic-a");
      assert.equal(month, "2026-10");
      dataCalls++;
      return reportData;
    },
  },
};
function load(filename, overrides = {}) {
  if (!Object.keys(overrides).length && cache.has(filename))
    return cache.get(filename);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
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
  if (!Object.keys(overrides).length) cache.set(filename, module.exports);
  return module.exports;
}
const date = (value) => new Date(value);
function visit(id, patientId, options = {}) {
  const timeIn = date("2026-10-07T01:00:00Z");
  return {
    id,
    patientId,
    status: "COMPLETED",
    deletedAt: null,
    timeIn,
    timeOut: date("2026-10-07T01:30:00Z"),
    bloodPressure: "140/90",
    rbs: "200",
    chiefComplaint: "Cough; Other: Headache; cough",
    requests: [{ type: "CONSULTATION" }, { type: "VACCINATION" }],
    medicines: [],
    vaccinations: [],
    referrals: [],
    followUps: [],
    satisfactionSurvey: null,
    patient: {
      firstName: "Sample",
      lastName: patientId,
      patientNumber: patientId,
      gender: "FEMALE",
      agency: "Profile agency must not be inferred",
    },
    ...options,
  };
}
function survey(id, options = {}) {
  return {
    id,
    surveyDate: date("2026-10-08T00:00:00Z"),
    createdAt: date("2026-10-08T02:00:00Z"),
    customerType: null,
    agencyName: null,
    respondentSex: null,
    respondentAge: null,
    cc1: "1. I know what a CC is and I saw this office's CC.",
    cc2: "1. Easy to see",
    cc3: "1. Helped very much",
    sqd0: "N/A",
    sqd1: "Agree",
    sqd2: null,
    sqd3: null,
    sqd4: null,
    sqd5: null,
    sqd6: null,
    sqd7: null,
    sqd8: null,
    ...options,
  };
}
const section = (report, tab, id) =>
  report[tab].find((section) => section.id === id);
const row = (report, tab, id, first) =>
  section(report, tab, id).rows.find((row) => row.cells[0] === first);
async function main() {
  const lib = load("src/lib/monthly-reports.ts");
  assert.equal(
    lib.reportMonth("2026-10").start.toISOString(),
    "2026-09-30T16:00:00.000Z",
  );
  assert.equal(
    lib.reportMonth("2026-10").end.toISOString(),
    "2026-10-31T16:00:00.000Z",
  );
  assert.equal(
    lib.reportMonth("2024-02").end.toISOString(),
    "2024-02-29T16:00:00.000Z",
  );
  for (const value of ["2026-00", "2026-13", "abc", "2026-1"])
    assert.throws(() => lib.reportMonth(value));
  for (const value of ["-1", "0", "Infinity", "abc", "2001"])
    assert.throws(() => lib.reportThresholds({ rbs: value }));
  const visits = [
    visit("a1", "a", {
      satisfactionSurvey: survey("s1", {
        respondentAge: 19,
        respondentSex: "Female",
        customerType: "Employee",
        agencyName: "DOH",
      }),
    }),
    visit("a2", "a", {
      timeOut: date("2026-10-07T02:00:00Z"),
      vaccinations: [{}],
      chiefComplaint: "COUGH",
      bloodPressure: "120/80",
      rbs: "100",
      satisfactionSurvey: survey("s2", {
        surveyDate: date("2026-10-09T00:00:00Z"),
        respondentAge: 20,
        respondentSex: "Male",
        customerType: "Employee",
        agencyName: "doh",
      }),
    }),
    visit("b1", "b", {
      timeOut: null,
      bloodPressure: "120/90",
      rbs: "11.1 mmol/L",
      patient: {
        firstName: "Sample",
        lastName: "b",
        patientNumber: "b",
        gender: "MALE",
        agency: null,
      },
      satisfactionSurvey: survey("s3", {
        respondentAge: 34,
        customerType: "Dependent",
      }),
    }),
    visit("c1", "c", {
      status: "IN_PROGRESS",
      timeOut: null,
      bloodPressure: "140/70",
      rbs: "200 mg/dL",
      medicines: [{ status: "RECEIVED" }],
      satisfactionSurvey: survey("s4", {
        respondentAge: 35,
        respondentSex: "Female",
        agencyName: "DOH",
      }),
    }),
    visit("q1", "q", { status: "QUEUED" }),
    visit("cancelled", "x", {
      status: "CANCELLED",
      satisfactionSurvey: survey("cx"),
    }),
    visit("deleted", "y", {
      deletedAt: new Date(),
      satisfactionSurvey: survey("dy"),
    }),
    visit("before", "z", { timeIn: date("2026-09-30T15:59:59Z") }),
    visit("end", "z", { timeIn: date("2026-10-31T16:00:00Z") }),
  ];
  const priorVisitSurvey = visit("prior", "d", {
    timeIn: date("2026-09-01T00:00:00Z"),
    timeOut: date("2026-09-01T00:45:00Z"),
    satisfactionSurvey: survey("s5", {
      surveyDate: null,
      createdAt: date("2026-10-10T01:00:00Z"),
      respondentAge: 65,
    }),
  });
  const futureSurvey = visit("future-survey", "e", {
    satisfactionSurvey: survey("future", {
      surveyDate: date("2026-11-01T00:00:00Z"),
    }),
  });
  reportData = lib.buildMonthlyReports(
    visits,
    [...visits, priorVisitSurvey, futureSurvey],
    "2026-10",
  );
  assert.deepEqual(reportData.summary, {
    visits: 5,
    completedVisits: 3,
    completedPatients: 2,
    averageMinutes: 45,
    surveys: 5,
    surveyPatients: 4,
    undatedSurveys: 1,
    withoutAvailedService: 0,
  });
  assert.deepEqual(
    row(
      reportData,
      "accomplishment",
      "requested",
      "Medical Consultation",
    ).cells.slice(1),
    [4, 3, 1, 0, 5],
  );
  assert.deepEqual(
    row(reportData, "accomplishment", "catered", "Medical Consultation").cells,
    ["Medical Consultation", 2, 3],
  );
  assert.deepEqual(
    row(reportData, "accomplishment", "catered", "Provision of Vaccine").cells,
    ["Provision of Vaccine", 1, 1],
  );
  assert.ok(
    section(reportData, "accomplishment", "turnaround").description.includes(
      "1 excluded",
    ),
  );
  const vitals = section(reportData, "accomplishment", "vitals").rows;
  assert.deepEqual(vitals[0].cells.slice(1), [3, 3, 3]);
  assert.deepEqual(vitals[1].cells.slice(1), [2, 2, 2]);
  assert.equal(vitals[2].cells[1], 2);
  assert.deepEqual(
    row(reportData, "accomplishment", "complaints", "Cough").cells.slice(1),
    [3, 4],
  );
  assert.equal(
    section(reportData, "accomplishment", "complaints").rows.length,
    2,
  );
  assert.deepEqual(
    row(
      reportData,
      "satisfaction",
      "survey-gender",
      "Medical Consultation",
    ).cells.slice(1),
    [4, 1, 1, 2, 5],
  );
  const ages = section(reportData, "satisfaction", "survey-age").rows.filter(
    (r) => r.cells[0] === "Medical Consultation",
  );
  assert.deepEqual(
    ages.map((r) => r.cells[2]),
    [0, 2, 1, 0, 1, 0],
  );
  assert.equal(
    ages.reduce((n, r) => n + r.cells[2], 0),
    4,
  );
  assert.deepEqual(
    row(reportData, "satisfaction", "customer-type", "Employee").cells.slice(1),
    [1, 2],
  );
  assert.deepEqual(
    row(reportData, "satisfaction", "agencies", "DOH").cells.slice(1),
    [2, 1, 1, 0, 3],
  );
  assert.equal(
    row(reportData, "satisfaction", "agencies", "Did not specify").cells[1],
    2,
  );
  const responses = section(reportData, "satisfaction", "responses").rows;
  assert.equal(responses.find((r) => r.id === "sqd0").cells[1], 5);
  assert.equal(
    responses
      .find((r) => r.id === "sqd0")
      .details.find((d) => d.label === "N/A").value,
    "5 responses",
  );
  assert.equal(
    responses
      .find((r) => r.id === "sqd0")
      .details.find((d) => d.label === "Strongly Agree").value,
    "0 responses",
  );
  assert.deepEqual(
    responses.find((r) => r.id === "sqd2").cells.slice(1),
    [0, 5],
  );
  const allAges = [19, 20, 34, 35, 49, 50, 64, 65, null].map((age, index) =>
    visit("age" + index, "age" + index, {
      satisfactionSurvey: survey("age-s" + index, { respondentAge: age }),
    }),
  );
  const ageBoundary = lib.buildMonthlyReports([], allAges, "2026-10");
  assert.deepEqual(
    section(ageBoundary, "satisfaction", "survey-age")
      .rows.filter((r) => r.cells[0] === "Medical Consultation")
      .map((r) => r.cells[2]),
    [1, 2, 2, 2, 1, 1],
  );
  const strange = lib.buildMonthlyReports(
    [
      visit("bad", "bad", {
        timeOut: date("2026-10-07T00:00:00Z"),
        bloodPressure: "unknown",
        rbs: "9".repeat(400),
        requests: [],
      }),
    ],
    [],
    "2026-10",
  );
  assert.equal(strange.summary.averageMinutes, null);
  assert.equal(
    section(strange, "accomplishment", "vitals").rows[0].cells[1],
    0,
  );
  assert.equal(
    section(strange, "accomplishment", "vitals").rows[1].cells[1],
    0,
  );
  assert.equal(
    section(strange, "accomplishment", "catered").rows.length,
    0,
    "No automatic consultation fallback",
  );
  assert.equal(
    section(strange, "accomplishment", "requested").rows[0].cells[0],
    "No service specified",
  );
  const strict = lib.buildMonthlyReports(visits, [], "2026-10", {
    systolic: 160,
    diastolic: 100,
    rbs: 250,
  });
  assert.equal(section(strict, "accomplishment", "vitals").rows[0].cells[1], 0);
  assert.equal(section(strict, "accomplishment", "vitals").rows[1].cells[1], 0);
  const empty = lib.buildMonthlyReports([], [], "2026-10");
  assert.equal(empty.summary.averageMinutes, null);
  assert.equal(empty.summary.surveys, 0);
  const csv = lib.reportCsv("Monthly", "October", [
    {
      title: "Test",
      description: 'line "quoted"',
      columns: ["Value"],
      rows: [
        {
          id: "x",
          cells: [' =HYPERLINK("x")'],
          details: [{ label: "@formula", value: "safe, value" }],
        },
      ],
    },
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("' =HYPERLINK"));
  assert.ok(csv.includes("'@formula"));
  assert.ok(csv.includes('"safe, value"'));
  const queries = [];
  const prisma = {
    visit: {
      findMany: (query) => {
        queries.push(query);
        return Promise.resolve([]);
      },
    },
    $transaction: async (operations, options) => {
      assert.equal(options.isolationLevel, "RepeatableRead");
      return Promise.all(operations);
    },
  };
  const data = load("src/lib/monthly-report-data.ts", {
    "@/lib/prisma": { prisma },
  });
  await data.getMonthlyReports("clinic-a", "2026-10", lib.defaultThresholds);
  assert.equal(queries.length, 2);
  for (const query of queries) {
    assert.equal(query.where.patient.clinicId, "clinic-a");
    assert.equal(query.where.deletedAt, null);
    assert.equal(query.where.status.not, "CANCELLED");
    assert.equal(query.select.progressNotes, undefined);
  }
  assert.equal(
    queries[0].where.timeIn.gte.toISOString(),
    "2026-09-30T16:00:00.000Z",
  );
  assert.equal(
    queries[1].where.satisfactionSurvey.is.OR[0].surveyDate.lt.toISOString(),
    "2026-10-31T16:00:00.000Z",
  );
  const Page = load("src/app/reports/monthly/page.tsx").default;
  const rendered = {};
  for (const tab of ["accomplishment", "satisfaction"]) {
    rendered[tab] = renderToStaticMarkup(
      await Page({ searchParams: Promise.resolve({ month: "2026-10", tab }) }),
    );
    assert.ok(rendered[tab].includes("October 2026"));
  }
  const beforeCalls = dataCalls;
  const invalid = renderToStaticMarkup(
    await Page({ searchParams: Promise.resolve({ month: "2026-13" }) }),
  );
  assert.ok(invalid.includes('role="alert"'));
  assert.equal(dataCalls, beforeCalls);
  role = "PHARMACIST";
  await assert.rejects(
    Page({ searchParams: Promise.resolve({ month: "2026-10" }) }),
    (e) => e.location === "/reports",
  );
  role = null;
  await assert.rejects(
    Page({ searchParams: Promise.resolve({ month: "2026-10" }) }),
    (e) => e.location === "/login",
  );
  role = "ADMIN";
  await surveyActionChecks();
  if (process.argv.includes("--browser"))
    await browserChecks(rendered, reportData);
  console.log(
    "PASS: Manila month boundaries, distinct vs repeat patients, service delivery evidence, turnaround exclusions, threshold flags, top complaints, all survey/age/customer/agency breakdowns, tenant-scoped queries, role guards, and safe CSV.",
  );
}

async function surveyActionChecks() {
  let existing = null;
  let csrf = true;
  let writes = 0;
  let clinicId = "clinic-a";
  const prisma = {
    visit: {
      findUnique: async () => ({
        id: "visit-a",
        patientId: "patient-a",
        status: "IN_PROGRESS",
        deletedAt: null,
        patient: { clinicId, firstName: "Sample", lastName: "Patient" },
      }),
    },
    medicineRequest: { count: async () => 0 },
    clientSatisfactionSurvey: {
      findUnique: async () => existing,
      upsert: async ({ create, update }) => {
        writes++;
        existing = {
          id: "survey-a",
          ...(existing ? { ...existing, ...update } : create),
        };
        return existing;
      },
    },
  };
  const actions = load("src/app/actions/workflow.ts", {
    "@/lib/prisma": { prisma },
    "@/lib/csrf": {
      assertValidCsrfToken: async () => {
        if (!csrf) throw new Error("Invalid CSRF");
      },
    },
    "@/lib/activity-log": { writeActivityLog: async () => {} },
    "next/cache": { revalidatePath() {} },
    "@/lib/daily-summary": {},
  });
  async function submit(extra = {}) {
    const data = new FormData();
    const values = {
      patientId: "patient-a",
      visitId: "visit-a",
      surveyDate: "2026-10-08",
      officeVisited: "Clinic",
      clientType: "Citizen",
      serviceAvailed: "Medical Consultation",
      customerType: "Employee",
      agencyName: "DOH",
      respondentSex: "Female",
      respondentAge: "35",
    };
    for (const key of [
      "cc1",
      "cc2",
      "cc3",
      "sqd0",
      "sqd1",
      "sqd2",
      "sqd3",
      "sqd4",
      "sqd5",
      "sqd6",
      "sqd7",
      "sqd8",
    ])
      values[key] = "Agree";
    Object.assign(values, extra);
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    try {
      await actions.submitSatisfactionSurveyAction(data);
      assert.fail("Expected redirect");
    } catch (error) {
      if (!error.location) throw error;
      return error.location;
    }
  }
  assert.equal(await submit(), "/patients/patient-a");
  assert.equal(existing.clientType, "Citizen");
  assert.equal(existing.customerType, "Employee");
  assert.equal(existing.agencyName, "DOH");
  assert.equal(existing.respondentAge, 35);
  assert.equal(
    await submit({ customerType: "Dependent" }),
    "/patients/patient-a",
  );
  assert.equal(existing.customerType, "Dependent");
  assert.equal(
    await submit({
      customerType: "",
      agencyName: "",
      respondentAge: "",
      respondentSex: "",
    }),
    "/patients/patient-a",
  );
  assert.equal(existing.customerType, null);
  assert.equal(existing.agencyName, null);
  assert.equal(existing.respondentAge, null);
  assert.equal(existing.respondentSex, null);
  const before = writes;
  assert.ok((await submit({ customerType: "Government" })).includes("error="));
  assert.equal(writes, before);
  assert.ok((await submit({ agencyName: "x".repeat(181) })).includes("error="));
  assert.equal(writes, before);
  assert.ok((await submit({ respondentAge: "-1" })).includes("error="));
  assert.equal(writes, before);
  csrf = false;
  assert.ok((await submit()).includes("error="));
  csrf = true;
  assert.equal(writes, before);
  clinicId = "clinic-b";
  assert.ok((await submit()).includes("error="));
  clinicId = "clinic-a";
  assert.equal(writes, before);
  role = "PHARMACIST";
  assert.ok((await submit()).includes("error="));
  role = "ADMIN";
  assert.equal(writes, before);
  console.log(
    "PASS: survey customer/agency fields persist separately, clearing demographics preserves unknowns, validation, CSRF, tenant isolation, and unauthorized writes.",
  );
}

async function browserChecks(rendered, reportData) {
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
      .filter((name) => name.endsWith(".css"))
      .map((name) =>
        fs.readFileSync(path.join(".next/static/css", name), "utf8"),
      )
      .join("\n");
    const page = await browser.newPage();
    for (const [tab, html] of Object.entries(rendered))
      for (const width of [320, 375, 768, 1280]) {
        await page.setViewportSize({ width, height: 850 });
        await page.setContent(
          `<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`,
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${tab} overflow at ${width}`,
        );
      }
    await page.emulateMedia({ media: "print" });
    assert.equal(
      await page.getByRole("button", { name: "Print / PDF" }).isVisible(),
      false,
    );
    assert.equal(await page.locator("#responses table").isVisible(), true);
    assert.equal(await page.locator("#survey-age table").isVisible(), true);
    assert.equal(
      await page.locator("#responses .report-mobile-rows").isVisible(),
      false,
    );
    assert.ok(
      await page
        .getByText("Strongly Agree", { exact: true })
        .first()
        .isVisible(),
    );
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    assert.ok(pdf.length > 5000);
    console.log(
      "PASS: both monthly report tabs at 320/375/768/1280px, print tables and response breakdowns, and PDF generation.",
    );
    await interactionChecks(browser, css, reportData);
  } finally {
    await browser.close();
  }
}

async function interactionChecks(browser, css, reportData) {
  const os = require("node:os");
  const webpack = require("next/dist/compiled/webpack/webpack");
  webpack.init();
  const workspace = process.cwd();
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "clinic-monthly-interactions-"),
  );
  try {
    const fixture = {
      id: "many",
      title: "Patient detail test",
      description: "Test report pagination and exports.",
      columns: ["Patient", "Visits"],
      rows: Array.from({ length: 25 }, (_, index) => ({
        id: "p" + index,
        cells: ["Patient " + String(index + 1).padStart(2, "0"), 1],
        details: [
          {
            label: "Patient " + (index + 1),
            value: "Recorded visit",
            href: "/patients/p" + index + "?visitId=v" + index,
          },
        ],
      })),
    };
    const loader = path.join(tempRoot, "loader.cjs");
    fs.writeFileSync(
      loader,
      `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "link.js"),
      'const React=require("react");module.exports=({children,...props})=>React.createElement("a",props,children);',
    );
    fs.writeFileSync(
      path.join(tempRoot, "entry.js"),
      `
      const React=require('react');const {createRoot}=require('react-dom/client');
      const {ReportTable}=require(${JSON.stringify(path.join(workspace, "src/components/reports/report-table.tsx"))});
      const {ReportExport}=require(${JSON.stringify(path.join(workspace, "src/components/reports/report-export.tsx"))});
      const section=${JSON.stringify(fixture)};window.print=()=>{window.printedTitle=document.title};
      createRoot(document.getElementById('root')).render(React.createElement('div',{className:'monthly-report-screen mx-auto min-w-0 max-w-5xl p-4 pb-28'},React.createElement(ReportExport,{title:'Monthly test',month:'October 2026',sections:[section],filename:'monthly-test-2026-10'}),React.createElement(ReportTable,{section})));
    `,
    );
    await new Promise((resolve, reject) => {
      const compiler = webpack.webpack({
        mode: "production",
        context: workspace,
        entry: path.join(tempRoot, "entry.js"),
        output: { path: tempRoot, filename: "bundle.js" },
        resolve: {
          modules: [path.join(workspace, "node_modules")],
          alias: {
            "@": path.join(workspace, "src"),
            "next/link$": path.join(tempRoot, "link.js"),
          },
          extensions: [".tsx", ".ts", ".js"],
        },
        module: { rules: [{ test: /\.tsx?$/, use: loader }] },
        optimization: { minimize: false },
      });
      compiler.run((error, stats) =>
        compiler.close(() =>
          error || stats.hasErrors()
            ? reject(
                error ||
                  new Error(stats.toString({ all: false, errors: true })),
              )
            : resolve(),
        ),
      );
    });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [320, 375, 768, 1280]) {
      await page.emulateMedia({ media: "screen" });
      await page.setViewportSize({ width, height: 850 });
      await page.setContent(
        `<!doctype html><html><head><title>Original report title</title><style>${css}</style></head><body><div id="root"></div></body></html>`,
      );
      await page.addScriptTag({ path: path.join(tempRoot, "bundle.js") });
      await page.getByLabel("Search Patient detail test").waitFor();
      assert.equal(
        await page.getByRole("button", { name: /^Patient 25/ }).count(),
        0,
      );
      await page.getByRole("button", { name: /^Patient 01/ }).click();
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      assert.equal(
        await page.getByRole("dialog").getByRole("link").getAttribute("href"),
        "/patients/p0?visitId=v0",
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
      assert.equal(await page.evaluate(() => document.body.style.overflow), "");
      await page.getByLabel("Search Patient detail test").fill("Patient 25");
      assert.equal(
        await page.getByRole("button", { name: /^Patient 25/ }).count(),
        1,
      );
      assert.equal(
        await page.getByRole("button", { name: /^Patient 01/ }).count(),
        0,
      );
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "CSV", exact: true }).click();
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), "monthly-test-2026-10.csv");
      const csv = fs.readFileSync(await download.path(), "utf8");
      assert.ok(csv.includes("Patient 01"));
      assert.ok(
        csv.includes("Patient 25"),
        "CSV must include all rows, independent of screen search or pagination",
      );
      await page.emulateMedia({ media: "print" });
      assert.equal(await page.locator("#many .monthly-report-row").count(), 25);
      assert.equal(
        await page.locator("#many .monthly-report-row").first().isVisible(),
        true,
      );
      assert.equal(
        await page.locator("#many .monthly-report-row").last().isVisible(),
        true,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "CSV", exact: true })
          .isVisible(),
        false,
      );
      await page.emulateMedia({ media: "screen" });
      await page.getByLabel("Search Patient detail test").fill("");
      await page.getByRole("button", { name: /Show more/ }).click();
      assert.equal(
        await page.getByRole("button", { name: /^Patient 25/ }).count(),
        1,
      );
      await page.getByRole("button", { name: "Print / PDF" }).click();
      assert.equal(
        await page.evaluate(() => window.printedTitle),
        "monthly-test-2026-10",
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      "PASS: hydrated report search/pagination, patient modal/links, Escape/scroll recovery, complete CSV/print despite filtered screen, and no overflow at 320/375/768/1280px.",
    );
  } finally {
    const resolved = path.resolve(tempRoot);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(
      path.basename(resolved).startsWith("clinic-monthly-interactions-"),
    );
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
