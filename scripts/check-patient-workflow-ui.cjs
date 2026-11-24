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
      "exports.manageRecordAction=async data=>{window.managed=Object.fromEntries(data)};exports.saveFormDraftAction=async data=>{await new Promise(resolve=>setTimeout(resolve,25));window.saved=Object.fromEntries(data);window.draft={};for(const [key,value] of data)(window.draft[key]??=[]).push(value);window.draftAt=new Date().toISOString();return {ok:true}};",
    );
    fs.writeFileSync(
      path.join(tempRoot, "entry.js"),
      "\nconst React=require(\"react\");const {createRoot}=require(\"react-dom/client\");\nconst {MedicineRequestLines}=require(\"@/components/patients/medicine-request-lines.tsx\");\nconst {ChiefComplaintField}=require(\"@/components/patients/chief-complaint-field.tsx\");\nconst {SatisfactionSurveyModal}=require(\"@/components/patients/satisfaction-survey-modal.tsx\");\nconst {CompletedVisitEditor}=require(\"@/components/patients/completed-visit-editor.tsx\");\nconst {PatientTable}=require(\"@/components/patients/patient-table.tsx\");\nconst {PatientMedicineHistory}=require(\"@/components/patients/patient-medicine-history.tsx\");\nconst {MaintenanceField,VaccineHistoryFields}=require(\"@/components/patients/medical-history-fields.tsx\");\nconst {ServiceRequestedFields}=require(\"@/components/patients/service-requested-fields.tsx\");\nconst {RecordAction}=require(\"@/components/admin/record-action.tsx\");\nconst {AutosaveForm}=require(\"@/components/patients/autosave-form.tsx\");\nwindow.fetch=async()=>({ok:true,json:async()=>({values:window.testDraft||{},removedRequestTypes:window.testRemoved||[],userId:'user-a',updatedAt:null,visitUpdatedAt:'2026-11-18T00:00:00Z'})});\nconst options=[{id:'a',name:'Paracetamol',dosage:'500 mg',brandName:'Biogesic',expirationDate:new Date('2027-01-01'),stock:100,unit:'pcs'},{id:'b',name:'Ibuprofen',dosage:'200 mg',brandName:'Advil',expirationDate:new Date('2027-04-01'),stock:50,unit:'pcs'}];\nconst patient={id:'p',lastName:'Dela Cruz',firstName:'Alexandra Maria',middleName:'Santos',gender:'Female',age:34,contact:'09123456789',address:'Sample long address in Cotabato City',agency:'Ministry of Health',designation:'Administrative Officer',request:'Medical Consultation, Provision of Medicine',status:'In progress',statusCode:'IN_PROGRESS',latestVisitAt:'November 18, 2026 10:30 AM',latestVisitOut:'',latestVisitId:'v',isCarriedOverQueue:false};\nconst visit={id:'v',timeIn:'November 18, 2026 10:30 AM',updatedAt:'2026-11-18T00:00:00.000Z',statusCode:'COMPLETED',requests:[{type:'CONSULTATION'}],chiefComplaint:'Cough',intakeNotes:'Nurse notes',bloodPressure:'120/80',temperature:'37',pulseRate:'80',respiratoryRate:'18',rbs:'100',diagnoses:[],diagnosis:'',diagnosisNotes:'',physicalExam:'',progressNotes:'Doctor notes',treatmentPlan:'Rest',diagnosesStructured:false,medicines:[],labResults:[],vaccinations:[],referrals:[],satisfactionSurvey:null};\nfunction Demo(){const [mode,setMode]=React.useState('medicine');window.show=setMode;\nreturn React.createElement('main',{className:'mx-auto min-w-0 max-w-5xl p-4'},mode==='medicine'?React.createElement('form',{onSubmit:e=>{e.preventDefault();window.submitted=Object.fromEntries(new FormData(e.currentTarget));}},React.createElement(MedicineRequestLines,{options}),React.createElement('button',{type:'submit'},'Submit medicines')):mode==='medical'?React.createElement('form',null,React.createElement(MaintenanceField,{initialValue:'Medicine A\\nMedicine B, 5 mg'}),React.createElement(VaccineHistoryFields,{initialEntries:[],legacyHistory:'Legacy vaccine notes'})):mode==='locked'?React.createElement(AutosaveForm,{visitId:'v',action:async()=>{}},React.createElement('input',{type:'hidden',name:'patientId',value:'p'}),React.createElement('input',{type:'hidden',name:'visitId',value:'v'}),React.createElement(ServiceRequestedFields,{lockExisting:true,options:[{value:'CONSULTATION',label:'Consultation'},{value:'REFERRAL',label:'Referral'}],defaultValues:['CONSULTATION']})):mode==='referral'?React.createElement('form',null,React.createElement(ServiceRequestedFields,{options:[{value:'CONSULTATION',label:'Consultation'},{value:'REFERRAL',label:'Referral'}],defaultValues:['CONSULTATION']})):mode==='delete'?React.createElement(RecordAction,{kind:'MedicineRequest',recordId:'issued',label:'Issued medicine',summary:'Quantity 4. Original stock movements are retained.',issuedMedicine:true}):mode==='chief'?React.createElement(ChiefComplaintField,{additionalOptions:['New admin complaint']}):mode==='survey'?React.createElement(SatisfactionSurveyModal,{patientId:'p',visitId:'v',patientSex:'Female',patientAge:34,agencyName:'Ministry of Health',serviceAvailed:'Consultation',survey:null}):mode==='med-history'?React.createElement(PatientMedicineHistory,{patientId:'p',canReceive:true,visits:[{...visit,status:'In progress',statusCode:'IN_PROGRESS',medicines:[{id:'m1',itemName:'Paracetamol',quantity:2,status:'RELEASED',releasedAt:'November 18, 2026',releasedBy:'Pharmacist',remarks:'After meals'}]},{...visit,id:'old',timeIn:'November 10, 2026',status:'Completed',medicines:[{id:'m2',itemName:'Ibuprofen',quantity:3,status:'RECEIVED',receivedAt:'November 10, 2026',receivedBy:'Patient'}]}]}):mode==='editor'?React.createElement(CompletedVisitEditor,{patientId:'p',visits:[visit],complaints:[],diseases:[]}):React.createElement(PatientTable,{rows:[patient,{...patient,id:'p2',status:'Queued',statusCode:'QUEUED'},{...patient,id:'p3',status:'Completed',statusCode:'COMPLETED'}],basePath:'/todays-patients'}));}\ncreateRoot(document.getElementById('root')).render(React.createElement(Demo));\n",
    );
    fs.writeFileSync(
      path.join(tempRoot, "link.js"),
      'const React=require("react");module.exports=({children,...props})=>React.createElement("a",props,children);',
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
            "next/link$": path.join(tempRoot, "link.js"),
            "@/app/actions/record-management$": path.join(tempRoot, "actions.js"),
            "@/app/actions/workflow$": path.join(tempRoot, "actions.js"),
            "@/app/actions/service-cancellation$": path.join(tempRoot, "actions.js"),
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
    page.on("pageerror", (error) => console.error(error.message));
    await page.route("http://clinic.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body:
          "<html><head><style>" +
          css +
          '</style></head><body><div id="root"></div></body></html>',
      }),
    );
    await page.goto("http://clinic.test/");
    await page.addScriptTag({ path: path.join(tempRoot, "bundle.js") });
    await page.getByRole("button", { name: "Add another medicine" }).waitFor();
    await page.getByRole("searchbox").fill("biogesic");
    assert.equal(
      await page
        .locator('select[name="line:0:inventoryItemId"] option')
        .count(),
      2,
    );
    await page
      .locator('select[name="line:0:inventoryItemId"]')
      .selectOption("a");
    await page.locator('input[name="line:0:quantity"]').fill("2");
    await page.locator('input[name="line:0:durationValue"]').fill("3");
    await page.getByRole("button", { name: "Add another medicine" }).click();
    await page
      .locator('select[name="line:1:inventoryItemId"]')
      .selectOption("b");
    await page.locator('input[name="line:1:quantity"]').fill("4");
    await page
      .locator('select[name="line:1:frequencyMode"]')
      .selectOption("AS_NEEDED");
    await page
      .locator('select[name="line:1:durationMode"]')
      .selectOption("AS_NEEDED");
    await page.getByRole("button", { name: "Submit medicines" }).click();
    const submitted = await page.evaluate(() => window.submitted);
    assert.equal(submitted["line:0:inventoryItemId"], "a");
    assert.equal(submitted["line:1:inventoryItemId"], "b");
    assert.equal(submitted["line:0:durationValue"], "3");
    assert.equal(submitted["line:1:frequencyMode"], "AS_NEEDED");
    await page.evaluate(() =>
      document.querySelector("form").dispatchEvent(
        new CustomEvent("restore-draft", {
          detail: {
            "line:0:inventoryItemId": ["a"],
            "line:0:quantity": ["7"],
            "line:0:durationMode": ["AS_NEEDED"],
            "line:3:inventoryItemId": ["b"],
            "line:3:quantity": ["9"],
            "line:3:frequencyMode": ["AS_NEEDED"],
            "line:3:durationMode": ["AS_NEEDED"],
          },
        }),
      ),
    );
    await page.locator('select[name="line:3:inventoryItemId"]').waitFor();
    assert.equal(
      await page.locator('select[name="line:3:inventoryItemId"]').inputValue(),
      "b",
    );
    assert.equal(
      await page.locator('input[name="line:3:quantity"]').inputValue(),
      "9",
    );
    const assertFit = async (label) => {
      const d = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.ok(d.scroll <= d.width, label + JSON.stringify(d));
    };
    for (const width of [375, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await assertFit("medicine " + width);
    }
    await page.evaluate(() => window.show("chief"));
    await page
      .getByRole("button", { name: "Select one or more complaints" })
      .click();
    await page
      .getByRole("textbox", { name: "Search complaints" })
      .fill("New admin");
    await page.getByText("New admin complaint", { exact: true }).click();
    await page.getByRole("button", { name: "Apply complaints (1)" }).click();
    assert.equal(
      await page.locator('input[name="chiefComplaint"]').inputValue(),
      "New admin complaint",
    );
    await page.evaluate(() => window.show("survey"));
    await page.getByRole("button", { name: "Complete CSM Survey" }).click();
    assert.equal(
      await page.locator('select[name="respondentSex"]').inputValue(),
      "Female",
    );
    assert.equal(
      await page.locator('input[name="respondentAge"]').inputValue(),
      "34",
    );
    assert.equal(
      await page.locator('input[name="agencyName"]').inputValue(),
      "Ministry of Health",
    );
    for (const width of [375, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await assertFit("CSM " + width);
      assert.equal(await page.locator('[role="dialog"] .overflow-x-auto').count(), 0);
    }
    await page.getByRole("button", { name: "Close survey" }).click();
    await page.evaluate(() => window.show("editor"));
    await page.getByRole("button", { name: "Edit Completed Services" }).click();
    for (const width of [375, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await assertFit("editor " + width);
    }
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.evaluate(() => window.show("med-history"));
    await page.getByRole("button", { name: "Mark received" }).waitFor();
    assert.equal(
      await page.getByRole("heading", { name: /Visit:/ }).count(),
      2,
    );
    assert.ok(await page.getByText("Ibuprofen", { exact: true }).isVisible());
    for (const width of [375, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await assertFit("medicine history " + width);
    }
    await page.evaluate(() => window.show("medical"));
    await page.getByRole("button",{name:"Add maintenance item"}).click();
    await page.getByLabel("Maintenance item 3",{exact:true}).fill("Medicine C");
    assert.equal(await page.locator('input[name="maintenance"]').inputValue(),"Medicine A\nMedicine B, 5 mg\nMedicine C");
    await page.getByLabel("Maintenance item 3",{exact:true}).press("Enter");
    await page.getByLabel("Maintenance item 4",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Add vaccine history"}).click();
    await page.getByLabel("Vaccine name",{exact:true}).fill("COVID 19");await page.getByLabel("Dose / Booster",{exact:true}).fill("Booster 1");await page.getByLabel("Date given",{exact:true}).fill("2026-11-18");
    assert.deepEqual(JSON.parse(await page.locator('input[name="vaccineHistoryEntries"]').inputValue()),[{vaccine:"COVID 19",dose:"Booster 1",date:"2026-11-18"}]);
    assert.equal(await page.locator('textarea[name="vaccineHistory"]').inputValue(),"Legacy vaccine notes");
    for(const width of [375,768,1024]){await page.setViewportSize({width,height:900});await assertFit("medical history "+width);}
    await page.evaluate(()=>window.show("referral"));await page.getByLabel("Referral",{exact:true}).check();await page.getByLabel("Reason for Referral",{exact:true}).fill("Specialist evaluation");assert.equal(await page.locator('textarea[name="referralReason"]').inputValue(),"Specialist evaluation");
    await page.evaluate(()=>window.show("delete"));await page.getByRole("button",{name:"Void",exact:true}).click();
    await page.getByLabel(/record correction only/i).check();await page.getByLabel("Reason",{exact:true}).fill("Duplicate");await page.getByLabel(/I reviewed/).check();
    for(const width of [375,768,1024]){await page.setViewportSize({width,height:900});await assertFit("record confirmation "+width);}
    await page.getByRole("button",{name:"Confirm void"}).click();await page.waitForFunction(()=>window.managed);assert.equal(await page.evaluate(()=>window.managed.stockHandling),"record-only");assert.equal(await page.evaluate(()=>window.managed.reason),"Duplicate");await page.getByRole("button",{name:"Cancel",exact:true}).click();
    await page.evaluate(()=>{window.testDraft={requestTypes:[]};window.testRemoved=["REFERRAL"];sessionStorage.setItem("clinic-draft:user-a:v:visit",JSON.stringify({at:Date.parse("2026-11-19T00:00:00Z"),values:{requestTypes:["REFERRAL"]}}));window.show("locked");});
    await page.getByText("Draft restored",{exact:true}).waitFor();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.getByLabel("Consultation",{exact:true}).isChecked(),true,"An old draft must not uncheck a recorded service");
    assert.equal(await page.getByLabel("Referral",{exact:true}).isChecked(),false,"A newer cached draft must not revive an explicitly removed service");
    await page.getByLabel("Consultation",{exact:true}).evaluate(input=>input.click());
    await page.getByLabel("Referral",{exact:true}).check();
    assert.equal(await page.getByLabel("Consultation",{exact:true}).isChecked(),true,"Clicking a locked recorded service must keep its React state checked");
    assert.ok(await page.locator("form").evaluate(form=>new FormData(form).getAll("requestTypes").includes("CONSULTATION")));
    await page.evaluate(()=>{window.testDraft={};});
    await page.evaluate(() => window.show("queue"));
    await page.getByText("Patient / Profile").waitFor({ state: "attached" });
    assert.ok(!(await page.locator("main").innerText()).includes("\uFFFD"), "Patient queue must not contain replacement characters");
    assert.ok((await page.locator("main").innerText()).includes("34 yrs · Female · 09123456789"), "Patient details must render readable separators");
    assert.ok((await page.locator("main").innerText()).includes("1 to 3 of 3"), "Queue pagination must render a readable range");
    for (const width of [375, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await assertFit("queue " + width);
      for (const status of ["Queued", "In progress", "Completed"])
        assert.ok(await page.getByText(status, { exact: true }).isVisible());
      const scrolling = await page
        .locator("main *")
        .evaluateAll(
          (nodes) =>
            nodes.filter(
              (n) =>
                n.clientWidth > 0 &&
                n.scrollWidth > n.clientWidth + 1 &&
                getComputedStyle(n).overflowX === "auto",
            ).length,
        );
      assert.equal(scrolling, 0, "Queue must fit without horizontal scrollers");
    }
    console.log(
      "PASS: medicine search by brand, multiple lines with independent schedules, dynamic draft restoration, custom chief complaints, CSM defaults, completed editor and queue without horizontal overflow at phone/tablet/laptop widths.",
    );
  } finally {
    if (browser) await browser.close();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
