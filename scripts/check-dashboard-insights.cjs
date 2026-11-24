const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function load(file) {
  const module = { exports: {} };
  new Function("require", "module", "exports", ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText)((name) => name.startsWith("@/") ? load(path.join("src", name.slice(2) + ".ts")) : require(name), module, module.exports);
  return module.exports;
}
const { buildDashboardInsights } = load("src/lib/dashboard-insights.ts");
const visit = (gender, chiefComplaint, extras = {}) => ({ patient: { gender }, chiefComplaint, status: "COMPLETED", requests: [{ type: "CONSULTATION" }], medicines: [], vaccinations: [], referrals: [], followUps: [], ...extras });
const data = buildDashboardInsights([
  visit("FEMALE", "Cough; cough; Other: Headache; Other"),
  visit("MALE", " COUGH ; Headache"),
  visit("FEMALE", "Headache", { medicines: [{ status: "RECEIVED" }], vaccinations: [{ id: "v" }] }),
  visit("MALE", null, { status: "IN_PROGRESS", medicines: [{ status: "REQUESTED" }] }),
]);
assert.equal(data.services[0].label, "Medical Consultation");
assert.equal(data.services[0].visits, 3);
assert.equal(data.services.find((row) => row.label === "Provision of Medicine").visits, 1);
assert.deepEqual(data.complaints.map((row) => [row.label, row.visits, row.female, row.male]), [["Headache", 3, 2, 1], ["cough", 2, 1, 1]]);
assert.deepEqual(buildDashboardInsights([]), { services: [], complaints: [] });
const many = buildDashboardInsights(Array.from({ length: 12 }, (_, i) => visit("FEMALE", `Complaint ${String(i).padStart(2, "0")}`)));
assert.equal(many.complaints.length, 10);
assert.equal(many.complaints[0].label, "Complaint 00");
assert.equal(buildDashboardInsights([visit("UNKNOWN", "Pain")]).complaints[0].unspecified, 1);
console.log("PASS: actual service delivery, per-visit complaint deduplication, normalized labels, gender counts, top-ten ordering, and empty data.");

async function browserChecks() {
  const os = require("node:os");
  const { chromium } = require("playwright-core");
  const webpack = require("next/dist/compiled/webpack/webpack"); webpack.init();
  const workspace = process.cwd();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "clinic-insights-"));
  let browser;
  try {
    fs.writeFileSync(path.join(tempRoot, "loader.cjs"), `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;`);
    fs.writeFileSync(path.join(tempRoot, "entry.js"), `const React=require('react');const {createRoot}=require('react-dom/client');const {PatientInsightPanels}=require(${JSON.stringify(path.join(workspace, "src/components/dashboard/patient-insight-panels.tsx"))});createRoot(document.getElementById('root')).render(React.createElement(PatientInsightPanels,{...${JSON.stringify(data)},visitCount:4,demographics:React.createElement('p',null,'Patient demographics')}));`);
    await new Promise((resolve, reject) => {
      const compiler = webpack.webpack({ mode: "production", context: workspace, entry: path.join(tempRoot, "entry.js"), output: { path: tempRoot, filename: "bundle.js" }, resolve: { alias: { "@": path.join(workspace, "src") }, modules: [path.join(workspace, "node_modules")], extensions: [".tsx", ".ts", ".js"] }, module: { rules: [{ test: /\.tsx?$/, use: path.join(tempRoot, "loader.cjs") }] }, optimization: { minimize: false } });
      compiler.run((error, stats) => compiler.close(() => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve()));
    });
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
    const page = await browser.newPage();
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    const { execFileSync } = require("node:child_process");
    execFileSync(process.execPath, [require.resolve("tailwindcss/lib/cli.js"), "-i", "src/app/globals.css", "-o", path.join(tempRoot, "styles.css")], { cwd: workspace, stdio: "pipe" });
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 950 });
      await page.setContent('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="root" style="padding:16px;max-width:1200px;margin:auto"></main></body></html>');
      await page.addStyleTag({ path: path.join(tempRoot, "styles.css") });
      await page.addScriptTag({ path: path.join(tempRoot, "bundle.js") });
      await page.getByText("Most availed services", { exact: true }).waitFor();
      assert.equal(await page.getByText("Most common: Female", { exact: true }).isVisible(), true);
      assert.equal(await page.getByText("Tie: Female / Male", { exact: true }).isVisible(), true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.getByRole("tab", { name: "Demographics", exact: true }).click();
      assert.equal(await page.getByText("Patient demographics", { exact: true }).isVisible(), true);
      await page.getByRole("tab", { name: "Demographics", exact: true }).press("ArrowLeft");
      assert.equal(await page.getByText("Top 10 chief complaints", { exact: true }).isVisible(), true);
      if (width === 1280) await page.screenshot({ path: path.join(workspace, ".next", "dashboard-insights-desktop.png"), fullPage: true });
      if (width === 375) await page.screenshot({ path: path.join(workspace, ".next", "dashboard-insights-mobile.png"), fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log("PASS: Patient Insights at 320/375/768/1280px, no horizontal overflow, gender/tie labels, tab switching, keyboard navigation, and no browser errors.");
  } finally {
    if (browser) await browser.close();
    assert.equal(path.dirname(path.resolve(tempRoot)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(tempRoot).startsWith("clinic-insights-"));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
if (process.argv.includes("--browser")) browserChecks().catch((error) => { console.error(error); process.exitCode = 1; });
