const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) =>
      Object.hasOwn(mocks, name)
        ? mocks[name]
        : name.startsWith("@/")
          ? load(path.join("src", name.slice(2) + ".ts"), mocks)
          : require(name),
    module,
    module.exports,
  );
  return module.exports;
}
const serviceState = load("src/lib/service-state.ts");
const services = load("src/lib/clinic-services.ts");
let state,
  failAudit = false;
let queue = Promise.resolve();
const nurse = {
  id: "nurse-a",
  role: "NURSE",
  name: "Test Nurse",
  clinicId: "clinic-a",
};
function reset(types = ["MEDICINES", "CONSULTATION"]) {
  failAudit = false;
  state = {
    id: "visit-a",
    patientId: "patient-a",
    patient: { clinicId: "clinic-a", deletedAt: null },
    deletedAt: null,
    status: "IN_PROGRESS",
    timeOut: null,
    updatedAt: new Date(),
    requests: types.map((type, i) => ({
      id: `service-${i}`,
      type,
      remarks: null,
    })),
    medicines: types.includes("MEDICINES")
      ? [
          {
            id: "medicine-a",
            status: "REQUESTED",
            remarks: "Original instruction",
          },
        ]
      : [],
    vaccinations: [],
    referrals: [],
    labResults: [],
    logs: [],
    movements: [],
    stock: 10,
  };
}
const prisma = {
  $queryRaw: async () => [],
  $transaction(callback) {
    const run = queue.then(async () => {
      const before = structuredClone(state);
      try {
        return await callback(prisma);
      } catch (error) {
        state = before;
        throw error;
      }
    });
    queue = run.catch(() => {});
    return run;
  },
  visit: {
    findFirst: async ({ where }) =>
      where.id === state.id &&
      (!where.patientId || where.patientId === state.patientId) &&
      where.patient.clinicId === state.patient.clinicId &&
      !state.deletedAt &&
      !state.patient.deletedAt
        ? structuredClone(state)
        : null,
    update: async ({ data }) => {
      Object.assign(state, data);
      return structuredClone(state);
    },
  },
  visitRequest: {
    update: async ({ where, data }) =>
      Object.assign(
        state.requests.find((row) => row.id === where.id),
        data,
      ),
  },
  medicineRequest: {
    update: async ({ where, data }) =>
      Object.assign(
        state.medicines.find((row) => row.id === where.id),
        data,
      ),
  },
  inventoryMovement: { count: async () => state.movements.length },
  activityLog: {
    create: async ({ data }) => {
      if (failAudit) throw Error("Audit unavailable");
      state.logs.push(data);
    },
  },
};
const library = load("src/lib/visit-cancellation.ts", {
  "@/lib/prisma": { prisma },
});
const input = (extra = {}) => ({
  patientId: "patient-a",
  visitId: "visit-a",
  serviceId: "service-0",
  reason: "Patient declined the medicine",
  ...extra,
});
function reportVisit(visit) {
  return {
    ...visit,
    timeIn: new Date("2026-11-24T02:00:00Z"),
    patient: {
      ...visit.patient,
      firstName: "Test",
      lastName: "Patient",
      patientNumber: "P-001",
      gender: "FEMALE",
      agency: null,
    },
    followUps: [],
    satisfactionSurvey: null,
  };
}
async function main() {
  reset();
  await library.cancelVisitService(nurse, input());
  assert.equal(state.status, "IN_PROGRESS");
  assert.equal(state.timeOut, null);
  assert.equal(state.medicines[0].status, "CANCELLED");
  assert.equal(state.stock, 10);
  const cancellation = serviceState.serviceCancellation(state.requests[0]);
  assert.equal(cancellation.by, nurse.name);
  assert.equal(cancellation.reason, input().reason);
  assert.equal(cancellation.userId, nurse.id);
  assert.equal(
    state.logs[0].metadata.changes.visitStatus.before,
    "IN_PROGRESS",
  );
  assert.equal(state.logs[0].metadata.changes.visitStatus.after, "IN_PROGRESS");
  assert.equal(serviceState.serviceCancellation(state.requests[1]), null);
  assert.ok(state.medicines[0].remarks.includes("Original instruction"));
  assert.ok(state.medicines[0].remarks.includes(input().reason));
  await assert.rejects(
    library.requireActiveMedicineVisit(prisma, state.id, nurse.clinicId),
    /cancelled/,
  );
  await assert.rejects(
    library.cancelVisitService(nurse, input()),
    /already been cancelled/,
  );
  const completedVisit = {
    ...state,
    status: "COMPLETED",
    medicines: [{ status: "RECEIVED" }],
  };
  assert.deepEqual(services.getAvailedServiceLabels(completedVisit), [
    "Medical Consultation",
  ]);
  const { buildMonthlyReports } = load("src/lib/monthly-reports.ts");
  const partialReport = buildMonthlyReports(
    [reportVisit(completedVisit)],
    [],
    "2026-11",
  );
  assert.equal(partialReport.summary.completedVisits, 1);
  assert.ok(
    !JSON.stringify(
      partialReport.accomplishment.find((section) => section.id === "catered")
        ?.rows ?? [],
    ).includes("Provision of Medicine"),
  );
  reset(["MEDICINES"]);
  await library.cancelVisitService(nurse, input());
  assert.equal(state.status, "COMPLETED");
  assert.ok(state.timeOut);
  assert.equal(serviceState.closedWithoutService(state), true);
  assert.deepEqual(services.getAvailedServiceLabels(state), []);
  const emptyReport = buildMonthlyReports([reportVisit(state)], [], "2026-11");
  assert.equal(emptyReport.summary.visits, 1);
  assert.equal(emptyReport.summary.completedVisits, 0);
  assert.equal(emptyReport.summary.completedPatients, 0);
  assert.equal(emptyReport.summary.averageMinutes, null);
  const daily = load("src/lib/daily-summary.ts", {
    "@/lib/prisma": {
      prisma: { visit: { findMany: async () => [reportVisit(state)] } },
    },
  });
  const dailySummary = await daily.buildDailySummary("clinic-a", "2026-11-24");
  assert.equal(
    dailySummary.rows[0].status,
    serviceState.closedWithoutServiceLabel,
  );
  assert.equal(dailySummary.rows[0].services, "No service provided");
  await assert.rejects(
    library.requireActiveMedicineVisit(prisma, state.id, nurse.clinicId),
    /closed/,
  );
  for (const role of ["NURSE", "DOCTOR_NURSE", "RECORDS", "PHARMACIST"]) {
    reset();
    await assert.rejects(
      library.cancelVisitService(
        { ...nurse, role },
        input({ entireVisit: true }),
      ),
      /Only an admin|permission/,
    );
    assert.equal(state.logs.length, 0);
  }
  for (const role of ["ADMIN", "DOCTOR"]) {
    reset();
    await library.cancelVisitService(
      { ...nurse, role },
      input({ entireVisit: true }),
    );
    assert.equal(state.status, "CANCELLED");
    assert.equal(serviceState.closedWithoutService(state), false);
    assert.equal(state.logs[0].action, "Cancel entire visit");
  }
  for (const reason of ["", " ", "x".repeat(1001)]) {
    reset();
    await assert.rejects(
      library.cancelVisitService(nurse, input({ reason })),
      /reason/,
    );
    assert.equal(state.status, "IN_PROGRESS");
  }
  for (const status of ["RELEASED", "RECEIVED"]) {
    reset();
    state.medicines[0].status = status;
    await assert.rejects(
      library.cancelVisitService(nurse, input()),
      /released or received/,
    );
    assert.equal(state.logs.length, 0);
  }
  reset();
  state.movements.push({ quantityChange: -1 });
  await assert.rejects(
    library.cancelVisitService(nurse, input()),
    /stock release/,
  );
  reset(["VACCINATION"]);
  state.vaccinations.push({ id: "vaccine-a" });
  await assert.rejects(
    library.cancelVisitService(nurse, input()),
    /recorded work/,
  );
  reset(["BP_CHECKING"]);
  state.bloodPressure = "120/80";
  await assert.rejects(
    library.cancelVisitService(nurse, input()),
    /recorded result/,
  );
  reset();
  await assert.rejects(
    library.cancelVisitService({ ...nurse, clinicId: "another" }, input()),
    /not found/,
  );
  assert.equal(state.logs.length, 0);
  reset();
  state.deletedAt = new Date();
  await assert.rejects(library.cancelVisitService(nurse, input()), /not found/);
  reset();
  failAudit = true;
  await assert.rejects(
    library.cancelVisitService(nurse, input()),
    /Audit unavailable/,
  );
  assert.equal(state.medicines[0].status, "REQUESTED");
  assert.equal(state.requests[0].remarks, null);
  assert.equal(state.logs.length, 0);
  reset();
  const results = await Promise.allSettled([
    library.cancelVisitService(nurse, input()),
    library.cancelVisitService(nurse, input()),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(state.logs.length, 1);
  reset();
  const cancelledFirst = library.cancelVisitService(nurse, input());
  const releaseAfter = prisma.$transaction(async (tx) => {
    await library.requireActiveMedicineVisit(tx, state.id, nurse.clinicId);
    state.stock--;
  });
  await cancelledFirst;
  await assert.rejects(releaseAfter, /cancelled/);
  assert.equal(state.stock, 10);
  reset();
  await prisma.$transaction(async (tx) => {
    await library.requireActiveMedicineVisit(tx, state.id, nurse.clinicId);
    state.medicines[0].status = "RELEASED";
    state.stock--;
  });
  await assert.rejects(
    library.cancelVisitService(nurse, input()),
    /released or received/,
  );
  assert.equal(state.stock, 9);
  reset();
  state.status = "CANCELLED";
  await assert.rejects(
    library.cancelVisitService(nurse, input()),
    /already closed/,
  );
  assert.equal(serviceState.serviceCancellation(state.requests[0]), null);
  assert.equal(
    serviceState.serviceCancellation({ remarks: "Existing free-text remarks" }),
    null,
  );
  assert.equal(
    serviceState.serviceCancellation({
      remarks: "[CLINIC_SERVICE_CANCELLED_V1]invalid",
    }),
    null,
  );
  let csrf = true,
    actor = nurse;
  const { cancelServiceAction } = load(
    "src/app/actions/service-cancellation.ts",
    {
      "@/lib/auth": { getCurrentUser: async () => actor },
      "@/lib/csrf": {
        assertValidCsrfToken: async () => {
          if (!csrf) throw Error("CSRF invalid");
        },
      },
      "@/lib/visit-cancellation": library,
      "next/cache": { revalidatePath() {} },
    },
  );
  const payload = (scope = "service") => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      ...input(),
      reason: "Confirmed with patient",
      scope,
    }))
      form.set(key, value);
    return form;
  };
  reset();
  csrf = false;
  assert.equal((await cancelServiceAction(payload())).ok, false);
  assert.equal(state.logs.length, 0);
  csrf = true;
  actor = null;
  assert.equal((await cancelServiceAction(payload())).ok, false);
  actor = nurse;
  assert.equal((await cancelServiceAction(payload("visit"))).ok, false);
  assert.equal(state.logs.length, 0);
  assert.equal((await cancelServiceAction(payload())).ok, true);
  assert.equal(state.status, "IN_PROGRESS");
  assert.equal(state.logs.length, 1);
  console.log(
    "PASS: service-only cancellation, required reason, nurse/whole-visit permissions, patient/clinic scope, original remarks, pending-medicine cancellation, stock/issued-work safeguards, atomic audit rollback, concurrent attempts, cancellation/release ordering, no-service closure, report labels, and legacy compatibility.",
  );
  if (process.argv.includes("--browser")) await browserChecks();
}

async function browserChecks() {
  const os = require("node:os"),
    { chromium } = require("playwright-core");
  const workspace = process.cwd(),
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "clinic-service-cancel-"));
  let browser;
  try {
    const webpack = require("next/dist/compiled/webpack/webpack");
    webpack.init();
    fs.writeFileSync(
      path.join(tempRoot, "loader.cjs"),
      `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "router.js"),
      "const router={refresh:()=>window.refreshServerView()};exports.useRouter=()=>router;",
    );
    fs.writeFileSync(
      path.join(tempRoot, "actions.js"),
      `exports.cancelServiceAction=async data=>{window.calls.push(Object.fromEntries(data));await new Promise(resolve=>window.finishCancellation=resolve);if(window.fail)return {ok:false,message:'Medicine has already been released. Ask an admin to review it.'};window.cancelledId=data.get('serviceId');return {ok:true}};`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "entry.js"),
      `const React=require('react'),{createRoot}=require('react-dom/client');const {VisitServices}=require('@/components/patients/service-cancellation');const {InteractionFeedback}=require('@/components/navigation/interaction-feedback');const h=React.createElement;window.calls=[];window.fail=false;function Demo(){const [cancelled,setCancelled]=React.useState('');const [admin,setAdmin]=React.useState(false);window.refreshServerView=()=>setCancelled(window.cancelledId);const cancellation={reason:'Patient declined the medicine',by:'Test Nurse',userId:'nurse-a',at:'2026-11-24T02:00:00Z',previousRemarks:null};return h(React.Fragment,null,h('main',{className:'mx-auto max-w-3xl p-3 sm:p-6 space-y-4'},h('h1',{className:'text-lg font-bold'},'Visit services'),h('p',{className:'text-sm text-slate-500'},'Visit status: In progress'),h(VisitServices,{patientId:'patient-a',visitId:'visit-a',canCancel:true,canCancelVisit:admin,services:[{id:'medicine-service',label:'Provision of Medicine',cancellation:cancelled==='medicine-service'?cancellation:null},{id:'bp-service',label:'BP Checking'}]}),h('button',{onClick:()=>setAdmin(!admin)},'Switch role')),h(InteractionFeedback));}createRoot(document.getElementById('root')).render(h(Demo));`,
    );
    await new Promise((resolve, reject) => {
      const compiler = webpack.webpack({
        mode: "production",
        context: workspace,
        entry: path.join(tempRoot, "entry.js"),
        output: { path: tempRoot, filename: "bundle.js" },
        resolve: {
          alias: {
            "@/app/actions/service-cancellation$": path.join(
              tempRoot,
              "actions.js",
            ),
            "next/navigation$": path.join(tempRoot, "router.js"),
            "@": path.join(workspace, "src"),
          },
          modules: [path.join(workspace, "node_modules")],
          extensions: [".tsx", ".ts", ".js"],
        },
        module: {
          rules: [{ test: /\.tsx?$/, use: path.join(tempRoot, "loader.cjs") }],
        },
        optimization: { minimize: false },
      });
      compiler.run((error, stats) =>
        compiler.close(() =>
          error || stats.hasErrors()
            ? reject(
                error || Error(stats.toString({ all: false, errors: true })),
              )
            : resolve(),
        ),
      );
    });
    require("node:child_process").execFileSync(
      process.execPath,
      [
        require.resolve("tailwindcss/lib/cli.js"),
        "-i",
        "src/app/globals.css",
        "-o",
        path.join(tempRoot, "styles.css"),
      ],
      { cwd: workspace, stdio: "pipe" },
    );
    browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
      headless: true,
    });
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error(error.message);
    });
    page.setDefaultTimeout(10000);
    await page.route("http://clinic.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><html><body></body></html>",
      }),
    );
    await page.goto("http://clinic.test");
    for (const width of [320, 375, 768, 1280]) {
      console.log(`Checking cancellation controls at ${width}px.`);
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>',
      );
      await page.addStyleTag({ path: path.join(tempRoot, "styles.css") });
      await page.addScriptTag({ path: path.join(tempRoot, "bundle.js") });
      await page
        .getByRole("button", {
          name: "Cancel Provision of Medicine",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Cancel entire visit", exact: true })
          .count(),
        0,
      );
      await page
        .getByRole("button", {
          name: "Cancel Provision of Medicine",
          exact: true,
        })
        .click();
      const modal = page.getByRole("dialog", {
        name: "Cancel Provision of Medicine",
        exact: true,
      });
      await modal.waitFor();
      await modal
        .getByRole("button", { name: "Confirm cancellation", exact: true })
        .click();
      assert.equal(await page.evaluate(() => window.calls.length), 0);
      await modal
        .getByLabel("Reason for cancellation")
        .fill("Patient declined the medicine");
      await modal
        .getByRole("button", { name: "Confirm cancellation", exact: true })
        .click();
      await page.waitForFunction(() => window.calls.length === 1);
      assert.equal(await page.evaluate(() => window.calls[0].scope), "service");
      assert.equal(
        await page.evaluate(() => window.calls[0].serviceId),
        "medicine-service",
      );
      assert.equal(
        await page.evaluate(() => window.calls[0].reason),
        "Patient declined the medicine",
      );
      assert.equal(
        await modal
          .getByRole("button", { name: "Cancelling…", exact: true })
          .isDisabled(),
        true,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.evaluate(() => window.finishCancellation());
      await modal.waitFor({ state: "detached" });
      await page.getByText("Service cancelled", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByText("Reason: Patient declined the medicine", { exact: true })
          .isVisible(),
        true,
      );
      assert.equal(
        await page
          .getByText("Visit status: In progress", { exact: true })
          .isVisible(),
        true,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Cancel BP Checking", exact: true })
          .isVisible(),
        true,
      );
      assert.equal(
        await page
          .getByRole("button", {
            name: "Cancel Provision of Medicine",
            exact: true,
          })
          .count(),
        0,
      );
      if (width === 375 || width === 1280)
        await page.screenshot({
          path: path.join(
            workspace,
            ".next",
            `service-cancellation-${width}.png`,
          ),
          fullPage: true,
        });
      await page
        .getByRole("button", { name: "Cancel BP Checking", exact: true })
        .click();
      await page
        .getByLabel("Reason for cancellation")
        .fill("Request entered by mistake");
      await page.evaluate(() => (window.fail = true));
      await page
        .getByRole("button", { name: "Confirm cancellation", exact: true })
        .click();
      await page.waitForFunction(() => window.calls.length === 2);
      await page.evaluate(() => window.finishCancellation());
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Confirm cancellation", exact: true })
          .isEnabled(),
        true,
      );
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
      assert.equal(await page.evaluate(() => document.body.style.overflow), "");
      await page
        .getByRole("button", { name: "Switch role", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Cancel entire visit", exact: true })
        .click();
      const entire = page.getByRole("dialog", {
        name: "Cancel entire visit",
        exact: true,
      });
      await entire.waitFor();
      assert.equal(
        await entire
          .getByText("This cancels the entire visit.", { exact: false })
          .isVisible(),
        true,
      );
      await entire
        .getByRole("button", { name: "Keep visit", exact: true })
        .click();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: compact service rows, nurse/admin actions, required reason, service-scoped payload, pending feedback, preserved other services, inline cancellation history, retry/Escape/scroll recovery, and no overflow at 320–1280px.",
    );
  } finally {
    if (browser) await browser.close();
    assert.equal(
      path.dirname(path.resolve(tempRoot)),
      path.resolve(os.tmpdir()),
    );
    assert.ok(path.basename(tempRoot).startsWith("clinic-service-cancel-"));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
