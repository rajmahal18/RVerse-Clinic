const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");
const webpack = require("next/dist/compiled/webpack/webpack");
webpack.init();
(async () => {
  const root = process.cwd(), temp = fs.mkdtempSync(path.join(os.tmpdir(), "clinic-follow-up-"));
  let browser;
  try {
    fs.writeFileSync(path.join(temp, "loader.cjs"), `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;`);
    fs.writeFileSync(path.join(temp, "actions.js"), "exports.saveFormDraftAction=async()=>({ok:true});");
    fs.writeFileSync(path.join(temp, "entry.js"), `
      const React=require('react'),{createRoot}=require('react-dom/client');
      const {FollowUpScheduleModal}=require('@/components/patients/clinical-action-modals');
      createRoot(document.getElementById('root')).render(React.createElement('main',{className:'p-4'},React.createElement(FollowUpScheduleModal,{patientId:'patient-a',visitId:'visit-a',action:async data=>{window.calls=(window.calls||0)+1;window.payload=Object.fromEntries(data);await new Promise(r=>{window.finish=r});}})));
    `);
    await new Promise((resolve,reject) => {
      const compiler = webpack.webpack({ mode:"production",context:root,entry:path.join(temp,"entry.js"),output:{path:temp,filename:"bundle.js"},resolve:{modules:[path.join(root,"node_modules")],extensions:[".tsx",".ts",".js"],alias:{"@/app/actions/workflow$":path.join(temp,"actions.js"),"@":path.join(root,"src")}},module:{rules:[{test:/\.tsx?$/,use:path.join(temp,"loader.cjs")}]},optimization:{minimize:false}});
      compiler.run((error,stats)=>compiler.close(()=>error||stats.hasErrors()?reject(error||Error(stats.toString({all:false,errors:true}))):resolve()));
    });
    const css = fs.readdirSync(".next/static/css").filter(n=>n.endsWith(".css")).map(n=>fs.readFileSync(path.join(".next/static/css",n),"utf8")).join("\n");
    browser = await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
    const page=await browser.newPage();
    const errors=[]; page.on("pageerror",error=>errors.push(error.message));
    await page.route("http://clinic.test/**",route=>route.fulfill({contentType:"text/html",body:`<html><head><style>${css}</style></head><body><div id="root"></div></body></html>`}));
    await page.goto("http://clinic.test/"); await page.addScriptTag({path:path.join(temp,"bundle.js")});
    for (const width of [320,375,768,1280]) {
      await page.setViewportSize({width,height:800});
      await page.getByRole("button",{name:"Schedule Follow-up",exact:true}).click();
      await page.getByRole("button",{name:"Save Follow-up",exact:true}).click();
      assert.equal(await page.evaluate(()=>window.calls||0),width===320?0:1);
      await page.getByLabel("Follow-up date and time").fill("2026-12-01T09:30");
      await page.getByLabel("Remarks (optional)").fill("Review blood pressure");
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
      if(width===320){
        await page.getByRole("button",{name:"Save Follow-up",exact:true}).click();
        await page.waitForFunction(()=>window.calls===1);
        assert.equal((await page.evaluate(()=>window.payload)).patientId,"patient-a");
        assert.equal((await page.evaluate(()=>window.payload)).visitId,"visit-a");
        assert.equal((await page.evaluate(()=>window.payload)).scheduledFor,"2026-12-01T09:30");
        assert.equal((await page.evaluate(()=>window.payload)).remarks,"Review blood pressure");
        assert.ok(await page.getByRole("button",{name:"Cancel",exact:true}).isDisabled());
        await page.getByRole("button",{name:"Close Schedule Follow-up",exact:true}).click();
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("dialog").count(),1,"Pending save must not be dismissed and reopened");
        await page.evaluate(()=>window.finish());
        await page.waitForFunction(()=>!document.querySelector('form[data-request-pending]'));
      }
      await page.getByRole("button",{name:"Cancel",exact:true}).click();
      await page.getByRole("dialog").waitFor({state:"detached"});
      assert.equal(await page.evaluate(()=>document.body.style.overflow),"");
    }
    await page.getByRole("button",{name:"Schedule Follow-up",exact:true}).click();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({state:"detached"});
    assert.deepEqual(errors,[]);
    console.log("PASS: follow-up trigger, required schedule, patient/visit/date/remarks payload, async settlement, close/reopen, and no overflow at 320–1280px.");
  } finally {
    await browser?.close(); fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
