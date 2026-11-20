const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');
const webpack = require('next/dist/compiled/webpack/webpack');
webpack.init();
async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clinic-search-'));
  let browser;
  try {
    fs.writeFileSync(path.join(tmp, 'loader.cjs'), `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
    fs.writeFileSync(path.join(tmp, 'router.js'), `exports.useRouter=()=>window.router;`);
    fs.writeFileSync(path.join(tmp, 'entry.js'), `
      const React=require('react');const {createRoot}=require('react-dom/client');
      const {DebouncedSearchForm}=require('@/components/search/debounced-search-form');
      const {AutosaveForm}=require('@/components/patients/autosave-form');
      window.calls=[]; window.router={replace:(url)=>window.calls.push(url)};
      window.fetch=()=>new Promise(resolve=>{window.restore=()=>resolve({ok:true,json:async()=>({values:{intakeNotes:['OLD DRAFT']},editableFields:['intakeNotes'],userId:'u',visitUpdatedAt:'2026-01-01'})})});
      window.saves=[];
      function App(){const [q,setQ]=React.useState('');const [visit,setVisit]=React.useState('v');window.switchVisit=setVisit;window.respond=setQ;return React.createElement(React.Fragment,null,
        React.createElement(DebouncedSearchForm,{action:'/patients',initialQuery:q,placeholder:'Search',preserveParams:{gender:'FEMALE'}}),
        React.createElement(AutosaveForm,{visitId:visit,action:async()=>{},autosaveAction:async data=>{window.saves.push({visit:data.get('visitId'),text:data.get('intakeNotes')});if(window.blockSave){window.blockSave=false;await new Promise(resolve=>window.releaseSave=resolve)}window.saved=data.get('intakeNotes');return {ok:true}}},
          React.createElement('input',{type:'hidden',name:'visitId',value:visit}),React.createElement('textarea',{name:'intakeNotes','aria-label':'Notes'})));}
      createRoot(document.getElementById('root')).render(React.createElement(App));`);
    // The draft action import is replaced; no server or database is contacted.
    fs.writeFileSync(path.join(tmp, 'actions.js'), 'exports.saveFormDraftAction=async()=>({ok:true});');
    await new Promise((resolve,reject)=>{
      const compiler=webpack.webpack({mode:'development',entry:path.join(tmp,'entry.js'),output:{path:tmp,filename:'bundle.js'},resolve:{modules:[path.join(process.cwd(),'node_modules')],extensions:['.tsx','.ts','.js'],alias:{'next/navigation$':path.join(tmp,'router.js'),'@/app/actions/workflow$':path.join(tmp,'actions.js'),'@':path.join(process.cwd(),'src')}},module:{rules:[{test:/\.tsx?$/,use:path.join(tmp,'loader.cjs')}]}});
      compiler.run((err,stats)=>compiler.close(()=>err||stats.hasErrors()?reject(err||new Error(stats.toString())):resolve()));
    });
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
    const page=await browser.newPage();
    await page.route('http://clinic.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
    await page.goto('http://clinic.test');
    await page.addScriptTag({path:path.join(tmp,'bundle.js')});
    const search=page.getByRole('searchbox');
    await search.fill('Cru');
    await page.waitForFunction(()=>window.calls.length===1);
    await search.fill('Cruz');
    await page.evaluate(()=>window.respond('Cru'));
    assert.equal(await search.inputValue(),'Cruz','Delayed search response must preserve newer typing');
    await page.waitForFunction(()=>window.calls.some(url=>url.includes('q=Cruz')));
    await page.evaluate(()=>window.respond('Cruz'));
    await search.fill('');
    await page.waitForFunction(()=>window.calls.includes('/patients?gender=FEMALE'));
    const notes=page.getByRole('textbox',{name:'Notes'});
    await notes.fill('New notes typed before draft response');
    await page.evaluate(()=>window.restore());
    assert.equal(await notes.inputValue(),'New notes typed before draft response');
    await page.waitForFunction(()=>window.saved==='New notes typed before draft response');
    await notes.fill('Final notes before immediate switch');
    await page.evaluate(()=>window.switchVisit('next'));
    await page.waitForFunction(()=>window.saves.some(s=>s.visit==='v'&&s.text==='Final notes before immediate switch'));
    await page.evaluate(()=>{window.blockSave=true});
    await notes.fill('In-flight next visit notes');
    await page.waitForFunction(()=>typeof window.releaseSave==='function');
    await notes.fill('Outdated queued notes');
    await page.waitForTimeout(700);
    await notes.fill('Final next visit notes');
    await page.evaluate(()=>window.switchVisit('third'));
    await notes.fill('Third visit notes');
    await page.evaluate(()=>window.releaseSave());
    await page.waitForFunction(()=>window.saves.some(s=>s.visit==='next'&&s.text==='Final next visit notes'));
    await page.waitForFunction(()=>window.saves.some(s=>s.visit==='third'&&s.text==='Third visit notes'));
    assert.ok(!(await page.evaluate(()=>window.saves)).some(s=>s.text==='Outdated queued notes'),'Outdated queued drafts must still be skipped');
    assert.equal(await notes.inputValue(),'Third visit notes','Old final saves must not replace the new visit input');
    console.log('PASS: delayed search/draft responses preserve typing; immediate visit switches flush final drafts; in-flight saves preserve visit identity; outdated drafts skipped; new visit autosaves.');
  } finally {
    if(browser) await browser.close();
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1});
