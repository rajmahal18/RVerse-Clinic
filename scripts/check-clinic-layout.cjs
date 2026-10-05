const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { chromium } = require("playwright-core");

const cache = new Map();
const mocks = {
  "next/link": ({ children, ...props }) => React.createElement("a", props, children),
  "next/image": ({ src, priority, ...props }) => React.createElement("img", {
    ...props, src: `data:image/png;base64,${fs.readFileSync(path.join("public", src)).toString("base64")}`,
  }),
  "next/navigation": { useSearchParams: () => new URLSearchParams(), usePathname: () => "/patients", useRouter: () => ({ replace() {} }) },
  "@/app/actions/workflow": { loginAction: "/login", logoutAction: "/logout" },
  "@/components/security/csrf-field": { CsrfField: () => null },
};
function load(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)((name) => {
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
  const chrome = process.env.CHROME_PATH || [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium",
  ].find((filename) => fs.existsSync(filename));
  if (!chrome) throw new Error("Set CHROME_PATH to an installed Chromium browser.");
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const css = fs.readdirSync(".next/static/css").filter((name) => name.endsWith(".css"))
      .map((name) => fs.readFileSync(path.join(".next/static/css", name), "utf8")).join("\n");
    const page = await browser.newPage();
    const render = async (element, width) => {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${renderToStaticMarkup(element)}</body></html>`);
      await page.evaluate(() => Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => {}))));
    };
    const assertNoOverflow = async (label) => {
      const dimensions = await page.evaluate(() => ({ width: window.innerWidth, document: document.documentElement.scrollWidth }));
      assert.ok(dimensions.document <= dimensions.width, `${label}: ${JSON.stringify(dimensions)}`);
    };
    const Login = load("src/app/login/page.tsx").default;
    const Shell = load("src/components/layout/app-shell-client.tsx").AppShellClient;
    for (const width of [320, 375, 768, 1280]) {
      await render(React.createElement(Login), width);
      await assertNoOverflow(`Login ${width}`);
      assert.equal(await page.getByRole("button", { name: "Sign In", exact: true }).count(), 1);
      assert.equal(await page.getByText("Create account", { exact: true }).count(), 0);
      await render(React.createElement(Shell, {
        role: "ADMIN", userInitials: "SA", medicineExpiry: { expired: 0, expiringSoon: 0 },
      }, React.createElement("p", null, "Patient Profile")), width);
      await assertNoOverflow(`Shell ${width}`);
      const visibleLogos = await page.locator('img[alt="Bangsamoro seal"]').evaluateAll((images) => images
        .filter((image) => image.getBoundingClientRect().width && image.getBoundingClientRect().x >= 0)
        .map((image) => ({ width: image.getBoundingClientRect().width, text: image.parentElement.lastElementChild.getBoundingClientRect().width })));
      assert.ok(visibleLogos.some((logo) => logo.width >= 32 && logo.text >= 70), `Logo too small at ${width}`);
    }

    // Render actual form templates with synthetic data; no patient database is used.
    mocks["@/lib/date-time"] = { formatLongDate: () => "October 5, 2026" };
    const Form = load("src/components/clinic-forms/form-templates.tsx").ClinicFormTemplate;
    const data = {
      patient: { fullName: "Sample Patient", ageSex: "33/F", shortBirthDate: "08/03/1993", allergy: "None", designation: "Administrative Officer", officeDivision: "Office Division" },
      clinic: { address: "Clinic office address", email: "clinic@example.gov" },
      issued: { ordinalDay: "5th", month: "October", year: "2026" },
      signatory: { nurseName: "CLINIC NURSE", nursePosition: "The Clinic Nurse", physicianName: "CLINIC PHYSICIAN", physicianPosition: "Medical Officer V" },
      patientFormCode: "TC202609-0001", medicineLog: [], visits: [], vaccinations: [], selectedVisit: null, latestVisit: null,
    };
    for (const count of [0, 30, 31, 61]) {
      data.medicineLog = Array.from({ length: count }, (_, index) => ({ id: `row-${index}`, date: "10/05/2026", timeRequested: "10:45 AM", item: "Paracetamol 500 mg", quantity: "30", releasedBy: "Clinic Staff", receivedBy: "Patient", timeReceived: "10:48 AM" }));
      await render(React.createElement("main", { className: "clinic-print-screen" }, React.createElement(Form, { form: "medicine-log", data })), 375);
      await assertNoOverflow(`Medicine Log ${count}`);
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      const pages = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length;
      assert.equal(pages, Math.max(1, Math.ceil(count / 30)), `Medicine Log print pages for ${count} records`);
    }
    await render(React.createElement("main", { className: "clinic-print-screen" }, React.createElement(Form, { form: "medical-allowance", data })), 1280);
    assert.ok((await page.locator(".allowance-underline").textContent()).includes("SAMPLE PATIENT"));
    assert.equal(await page.locator(".clinic-revision").textContent(), data.patientFormCode);
    const allowancePdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    assert.equal(allowancePdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length, 1);
    for (const form of ["employee-information", "assessment-monitoring", "daily-patient-summary", "medical-certificate", "referral-form", "doctors-order", "client-satisfaction-survey"]) {
      await render(React.createElement("main", { className: "clinic-print-screen" }, React.createElement(Form, { form, data })), 1280);
      assert.ok(await page.locator(".clinic-form-page").count(), `Existing form failed to render: ${form}`);
    }
    await render(React.createElement("main", { className: "patient-qr-screen" },
      React.createElement("div", { className: "no-print" }, "Print controls"),
      React.createElement("img", { className: "patient-qr-sticker", src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fs.readFileSync("docs/generated-previews/patient-qr-label.svg", "utf8"))}` })
    ), 320);
    await assertNoOverflow("QR label preview");
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".no-print").isVisible(), false);
    const sticker = await page.locator(".patient-qr-sticker").boundingBox();
    assert.ok(Math.abs(sticker.width - 30 * 96 / 25.4) < 1, "QR print width must stay 30 mm");
    assert.ok(Math.abs(sticker.height - 34 * 96 / 25.4) < 1, "QR print height must stay 34 mm");
    const qrPdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    assert.equal(qrPdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length, 1);
    console.log("PASS: login/sidebar at 320/375/768/1280 px; Medicine Log PDFs; all existing form templates; uppercase allowance/code; actual-size QR print and hidden controls.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
