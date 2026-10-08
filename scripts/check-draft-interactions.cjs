const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");
const compiledWebpack = require("next/dist/compiled/webpack/webpack");
compiledWebpack.init();
async function main() {
  const workspace = process.cwd();
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "clinic-draft-review-"),
  );
  let browser;
  try {
    fs.writeFileSync(
      path.join(tempRoot, "loader.cjs"),
      `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;};`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "actions.js"),
      "exports.saveFormDraftAction=async data=>{await new Promise(resolve=>setTimeout(resolve,25));window.saved=Object.fromEntries(data);window.draft={};for(const [key,value] of data)(window.draft[key]??=[]).push(value);window.draftAt=new Date().toISOString();return {ok:true}};",
    );
    fs.writeFileSync(
      path.join(tempRoot, "entry.js"),
      `
      const React=require("react");const {createRoot}=require("react-dom/client");
      const {AutosaveForm}=require(${JSON.stringify(path.join(workspace, "src/components/patients/autosave-form.tsx"))});
      const {ChiefComplaintField}=require(${JSON.stringify(path.join(workspace, "src/components/patients/chief-complaint-field.tsx"))});
      const {DiagnosisField}=require(${JSON.stringify(path.join(workspace, "src/components/patients/diagnosis-field.tsx"))});
      const {MedicineScheduleFields}=require(${JSON.stringify(path.join(workspace, "src/components/patients/medicine-schedule-fields.tsx"))});
      window.draft={};window.draftAt=null;window.saved={};window.submitted=null;window.failSubmit=false;
      class Boundary extends React.Component { constructor(props){super(props);this.state={failed:false}} static getDerivedStateFromError(){return {failed:true}} render(){return this.state.failed?React.createElement("p",null,"Submission failed ? draft retained"):this.props.children} }
      window.fetch=async()=>({ok:true,json:async()=>({values:window.draft,userId:"user-a",updatedAt:window.draftAt,visitUpdatedAt:"2020-01-01T00:00:00Z",editableFields:["chiefComplaint","diagnosis","physicalExam","diagnosisNotes","progressNotes"]})});
      function Demo(){const [open,setOpen]=React.useState(true);window.toggleForm=setOpen;return React.createElement("main",{className:"mx-auto w-full max-w-xl p-4"},open?React.createElement(AutosaveForm,{draftKey:"visit",className:"grid min-w-0 gap-4",action:async data=>{window.submitted=Object.fromEntries(data);if(window.failSubmit)throw new Error("Expected validation failure")}},
        React.createElement("input",{type:"hidden",name:"patientId",value:"patient-a"}),React.createElement("input",{type:"hidden",name:"visitId",value:"visit-a"}),
        React.createElement("textarea",{name:"progressNotes","aria-label":"Progress notes",className:"min-w-0 rounded-lg border p-3"}),
        React.createElement(ChiefComplaintField,{initialValue:""}),React.createElement(DiagnosisField,{initialValue:"",disabled:false,diseases:[{id:"disease-a",name:"Sample disease",isActive:true}]}),React.createElement(MedicineScheduleFields),
        React.createElement("button",{type:"submit",name:"doctorSection",value:"progressNotes"},"Progress notes done")):null)}
      createRoot(document.getElementById("root")).render(React.createElement(Boundary,null,React.createElement(Demo)));
    `,
    );
    await new Promise((resolve, reject) => {
      const compiler = compiledWebpack.webpack({
        mode: "production",
        context: workspace,
        entry: path.join(tempRoot, "entry.js"),
        output: { path: tempRoot, filename: "bundle.js" },
        resolve: {
          modules: [path.join(workspace, "node_modules")],
          alias: {
            "@/app/actions/workflow$": path.join(tempRoot, "actions.js"),
            "@": path.join(workspace, "src"),
          },
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
                error ||
                  new Error(stats.toString({ all: false, errors: true })),
              )
            : resolve(),
        ),
      );
    });
    const css = fs
      .readdirSync(".next/static/css")
      .filter((n) => n.endsWith(".css"))
      .map((n) => fs.readFileSync(path.join(".next/static/css", n), "utf8"))
      .join("\n");
    browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
      headless: true,
    });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://clinic.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><head><style>${css}</style></head><body><div id="root"></div></body></html>`,
      }),
    );
    for (const width of [320, 375, 768]) {
      const certificateComplaints = "Cough; For CS 211 Medical Certificate; For Regular Medical Certificate";
      await page.setViewportSize({ width, height: 800 });
      await page.goto("https://clinic.test/review");
      await page.evaluate(() => sessionStorage.clear());
      await page.addScriptTag({ path: path.join(tempRoot, "bundle.js") });
      await page.getByText("Autosave on").waitFor();
      await page
        .getByLabel("Progress notes", { exact: true })
        .fill("Recover these notes");
      await page
        .getByRole("button", { name: "Select one or more complaints" })
        .click();
      await page.getByRole("checkbox", { name: "Cough", exact: true }).check();
      for (const name of ["For CS 211 Medical Certificate", "For Regular Medical Certificate"]) {
        const checkbox = page.getByRole("checkbox", { name, exact: true });
        assert.equal(await checkbox.isChecked(), false);
        await checkbox.check();
      }
      await page.getByRole("button", { name: "Apply complaints (3)" }).click();
      await page
        .getByRole("checkbox", { name: "Sample disease", exact: true })
        .check();
      await page
        .getByLabel("Status for Sample disease")
        .selectOption("RULE_OUT");
      await page
        .getByRole("checkbox", {
          name: "Essentially normal P.E. findings at the time of examination.",
          exact: true,
        })
        .check();
      await page
        .getByLabel("Frequency", { exact: true })
        .selectOption("EVERY_N_HOURS");
      await page.getByLabel("Number of hours").fill("6");
      await page.getByLabel("Number of days").fill("7");
      await page.getByText("Draft saved", { exact: true }).waitFor();
      const saved = await page.evaluate(() => window.saved);
      assert.equal(saved.chiefComplaint, certificateComplaints);
      assert.deepEqual(JSON.parse(saved.diagnosisSelections), [
        { diseaseId: "disease-a", status: "RULE_OUT" },
      ]);
      assert.equal(
        saved.physicalExam,
        "Essentially normal P.E. findings at the time of examination.",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `Overflow at ${width}`,
      );
      await page.evaluate(() => window.toggleForm(false));
      await page.evaluate(() => window.toggleForm(true));
      await page.getByText("Draft restored").waitFor();
      assert.equal(
        await page.getByLabel("Progress notes", { exact: true }).inputValue(),
        "Recover these notes",
      );
      assert.equal(await page.getByLabel("Number of hours").inputValue(), "6");
      assert.equal(
        await page.locator('input[name="chiefComplaint"]').inputValue(),
        certificateComplaints,
      );
      assert.equal(
        await page.locator('input[name="diagnosisSelections"]').inputValue(),
        JSON.stringify([{ diseaseId: "disease-a", status: "RULE_OUT" }]),
      );
      await page
        .getByLabel("Progress notes", { exact: true })
        .fill("Immediate close");
      await page.evaluate(() => window.toggleForm(false));
      await page.evaluate(() => window.toggleForm(true));
      await page.getByText("Draft restored").waitFor();
      assert.equal(
        await page.getByLabel("Progress notes", { exact: true }).inputValue(),
        "Immediate close",
      );
      await page
        .getByLabel("Progress notes", { exact: true })
        .fill("Recover after refresh");
      await page.reload();
      await page.addScriptTag({ path: path.join(tempRoot, "bundle.js") });
      await page.getByText("Draft restored").waitFor();
      assert.equal(
        await page.getByLabel("Progress notes", { exact: true }).inputValue(),
        "Recover after refresh",
      );
      await page.evaluate(() => {
        window.failSubmit = true;
      });
      await page
        .getByLabel("Progress notes", { exact: true })
        .fill("Keep failed submission");
      await page
        .getByRole("button", { name: "Progress notes done", exact: true })
        .click();
      await page.getByText("Submission failed ? draft retained").waitFor();
      await page.reload();
      await page.addScriptTag({ path: path.join(tempRoot, "bundle.js") });
      await page.getByText("Draft restored").waitFor();
      assert.equal(
        await page.getByLabel("Progress notes", { exact: true }).inputValue(),
        "Keep failed submission",
      );
      await page
        .getByLabel("Progress notes", { exact: true })
        .fill("Final notes");
      await page
        .getByRole("button", { name: "Progress notes done", exact: true })
        .click();
      await page.waitForFunction(() => window.submitted);
      assert.equal(
        await page.evaluate(() => window.submitted.doctorSection),
        "progressNotes",
      );
      assert.equal(
        await page.evaluate(() => window.submitted.progressNotes),
        "Final notes",
      );
      await page
        .getByLabel("Progress notes", { exact: true })
        .fill("Edits after submit");
      await page.getByText("Draft saved", { exact: true }).waitFor();
      assert.equal(
        await page.evaluate(() => window.saved.progressNotes),
        "Edits after submit",
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: hydrated draft close/reopen, controlled complaints/diagnosis/PE, conditional medicine inputs, immediate-close recovery, section submit intent, and no mobile overflow at 320/375/768px.",
    );
  } finally {
    if (browser) await browser.close();
    const resolved = path.resolve(tempRoot);
    if (
      path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
      !path.basename(resolved).startsWith("clinic-draft-review-")
    )
      throw new Error("Unexpected cleanup directory");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
