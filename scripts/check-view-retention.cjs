const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const { chromium } = require("playwright-core");

async function main() {
  const workspace = process.cwd();
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "clinic-view-retention-"),
  );
  let browser;
  try {
    const webpack = require("next/dist/compiled/webpack/webpack");
    webpack.init();
    fs.writeFileSync(
      path.join(tempRoot, "loader.cjs"),
      `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "navigation.js"),
      `const router={push:target=>location.assign(target)};exports.useRouter=()=>router;exports.usePathname=()=>location.pathname;exports.useSearchParams=()=>new URLSearchParams(location.search);`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "link.js"),
      `const React=require('react');module.exports=({children,...props})=>React.createElement('a',props,children);`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "entry.js"),
      `
      const React=require('react');const {createRoot}=require('react-dom/client');
      const {ViewRetentionProvider,useRetainedViewState}=require(${JSON.stringify(path.join(workspace, "src/components/navigation/view-retention.tsx"))});
      const {RetainedBackLink}=require(${JSON.stringify(path.join(workspace, "src/components/navigation/retained-back-link.tsx"))});
      const {PatientRecordTabs}=require(${JSON.stringify(path.join(workspace, "src/components/patients/patient-record-tabs.tsx"))});
      const h=React.createElement;
      function Content(){const [tab,setTab]=useRetainedViewState('tab','Summary');const [selected,setSelected]=useRetainedViewState('row',null);const detail=location.pathname.startsWith('/patients/');return h('main',null,
        h('nav',null,h('a',{href:'/patients','data-retain-navigation':true},'Patients'),h('a',{href:'/inventory','data-retain-navigation':true},'Inventory'),h('a',{href:'/activity-logs','data-retain-navigation':true},'Activity Logs'),h('a',{href:'/settings','data-retain-navigation':true},'Settings')),
        h('h1',null,location.pathname),h('p',{'data-testid':'filters'},location.search),h('a',{href:location.pathname},'Clear filters'),
        detail?h(RetainedBackLink,{href:'/patients',source:true},'Back to list'):h('a',{href:'/patients/p1?visitId=v1&tab=history'},'Open patient'),
        h('a',{href:'/print/p1'},'Print preview'),
        h('button',{onClick:()=>setTab('History')},'History'),h('p',{'data-testid':'tab'},tab),
        h('button',{onClick:()=>setSelected('row-25')},'Select row'),h('p',{'data-testid':'row'},selected||'None'),
        detail?h(PatientRecordTabs,{defaultTabId:'overview',tabs:[{id:'overview',label:'Overview',content:h('p',null,'Record overview content')},{id:'history',label:'Record History',content:h('p',null,'Record history content')}]}):null,
        h('details',{id:'breakdown'},h('summary',null,'Breakdown'),h('p',null,'Expanded content')),
        h('form',{onSubmit:e=>e.preventDefault()},h('input',{name:'clinical',defaultValue:'Saved clinical value'}),h('input',{type:'password',name:'password'})),
        h('form',{onSubmit:e=>e.preventDefault()},h('button',{'aria-label':'Sign out'},'Sign out')),
        h('div',{style:{height:'2400px'}},'List rows'));
      }
      const node=location.pathname.startsWith('/print/')?h(RetainedBackLink,{href:'/patients/p1'},'Back to patient'):h(ViewRetentionProvider,{scope:window.testScope},h(Content));
      createRoot(document.getElementById('root')).render(node);
    `,
    );
    await new Promise((resolve, reject) => {
      const compiler = webpack.webpack({
        mode: "production",
        context: workspace,
        entry: path.join(tempRoot, "entry.js"),
        output: { path: tempRoot, filename: "bundle.js" },
        resolve: {
          alias: {
            "@": path.join(workspace, "src"),
            "next/navigation$": path.join(tempRoot, "navigation.js"),
            "next/link$": path.join(tempRoot, "link.js"),
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
    const bundle = fs.readFileSync(path.join(tempRoot, "bundle.js"), "utf8");
    browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
      headless: true,
    });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let scope = "clinic-a:user-a";
    await page.route("http://clinic.test/**", async (route) => {
      if (new URL(route.request().url()).pathname === "/bundle.js")
        return route.fulfill({
          contentType: "application/javascript",
          body: bundle,
        });
      return route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}main{padding:16px}nav{display:flex;gap:12px;flex-wrap:wrap}input{max-width:100%;box-sizing:border-box}</style></head><body><div id="root"></div><script>window.testScope=${JSON.stringify(scope)}</script><script src="/bundle.js"></script></body></html>`,
      });
    });
    const ready = () =>
      page.getByRole("button", { name: "History", exact: true }).waitFor();
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      const list = `http://clinic.test/patients?q=Ana&page=3&gender=FEMALE&test=${width}`;
      await page.goto(list);
      await ready();
      if (width === 375) {
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.evaluate(() => {
          const originalWrite = Storage.prototype.setItem, originalQuery = document.querySelectorAll;
          window.scrollReview = { writes: 0, scans: 0 };
          Storage.prototype.setItem = function(...args) { window.scrollReview.writes++; return originalWrite.apply(this, args); };
          document.querySelectorAll = function(...args) { if (String(args[0]).includes('main details')) window.scrollReview.scans++; return originalQuery.apply(this, args); };
          window.restoreReview = () => { Storage.prototype.setItem = originalWrite; document.querySelectorAll = originalQuery; };
          for(let i = 0; i < 200; i++) window.dispatchEvent(new Event('scroll'));
        });
        await page.waitForTimeout(170);
        const metrics = await page.evaluate(() => { const result = window.scrollReview; window.restoreReview(); return result; });
        assert.equal(metrics.scans, 0, 'Scrolling must not scan all details elements');
        assert.ok(metrics.writes <= 1, 'Scroll persistence should be throttled and unchanged values skipped');
      }
      await page.getByRole("button", { name: "History", exact: true }).click();
      await page
        .getByRole("button", { name: "Select row", exact: true })
        .click();
      await page.locator("summary").click();
      await page
        .locator('input[name="clinical"]')
        .fill("Unsaved clinical text");
      await page.locator('input[name="password"]').fill("PrivatePassword");
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForFunction(() =>
        Object.keys(sessionStorage).some(
          (key) =>
            key.includes("scroll:") && sessionStorage.getItem(key) === "500",
        ),
      );
      await page.goto(
        "http://clinic.test/inventory?category=VACCINE&month=2026-10&expiry=1&sort=name_desc",
      );
      await ready();
      await page.goBack();
      await ready();
      assert.equal(page.url(), list);
      await page.waitForFunction(() => window.scrollY === 500);
      assert.equal(await page.getByTestId("tab").textContent(), "History");
      assert.equal(await page.getByTestId("row").textContent(), "row-25");
      assert.equal(await page.locator("details").getAttribute("open"), "");
      assert.ok(
        !(await page.evaluate(() => JSON.stringify(sessionStorage))).includes(
          "Unsaved clinical text",
        ),
      );
      assert.ok(
        !(await page.evaluate(() => JSON.stringify(sessionStorage))).includes(
          "PrivatePassword",
        ),
      );
      await page
        .getByRole("link", { name: "Open patient", exact: true })
        .click();
      await ready();
      await page
        .getByRole("link", { name: "Back to list", exact: true })
        .click();
      await ready();
      assert.equal(page.url(), list);
      await page.getByRole("link", { name: "Inventory", exact: true }).click();
      await ready();
      assert.ok(page.url().includes("category=VACCINE"));
      assert.ok(page.url().includes("sort=name_desc"));
      await page.getByRole("link", { name: "Patients", exact: true }).click();
      await ready();
      assert.equal(page.url(), list);
      await page
        .getByRole("link", { name: "Open patient", exact: true })
        .click();
      await ready();
      await page.getByRole("button", { name: "History", exact: true }).click();
      await page.getByRole("button", { name: "Overview", exact: true }).click();
      await page
        .getByRole("link", { name: "Print preview", exact: true })
        .click();
      await page
        .getByRole("link", { name: "Back to patient", exact: true })
        .click();
      await ready();
      assert.ok(page.url().includes("visitId=v1"));
      assert.equal(await page.getByTestId("tab").textContent(), "History");
      assert.equal(
        await page
          .getByText("Record overview content", { exact: true })
          .isVisible(),
        true,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    await page.goto(
      "http://clinic.test/activity-logs?module=Accounts&range=30d&page=2",
    );
    await ready();
    await page.getByRole("button", { name: "History", exact: true }).click();
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await ready();
    await page
      .getByRole("link", { name: "Activity Logs", exact: true })
      .click();
    await ready();
    assert.ok(page.url().includes("module=Accounts"));
    assert.equal(await page.getByTestId("tab").textContent(), "History");
    await page.getByRole("link", { name: "Clear filters", exact: true }).click(); await ready();
    assert.equal(new URL(page.url()).search, "");
    scope = "clinic-a:user-b";
    await page.reload();
    await ready();
    assert.equal(await page.getByTestId("tab").textContent(), "Summary");
    await page.getByRole("button", { name: "History", exact: true }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    assert.equal(
      await page.evaluate(() =>
        Object.keys(sessionStorage).some((key) =>
          key.startsWith("clinic-view:v1:clinic-a:user-b:"),
        ),
      ),
      false,
    );
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("clinic-view:active-scope"),
      ),
      null,
    );
    scope = "clinic-b:user-a";
    await page.reload();
    await ready();
    assert.equal(await page.getByTestId("tab").textContent(), "Summary");
    await page.evaluate(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new Error("Storage blocked");
        },
        configurable: true,
      });
    });
    await page.getByRole("button", { name: "History", exact: true }).click();
    assert.equal(await page.getByTestId("tab").textContent(), "History");
    await page.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage blocked'); }, configurable: true }); });
    await page.reload(); await ready();
    assert.equal(await page.getByTestId("tab").textContent(), "Summary");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: app-wide browser Back, source-aware Back links, sidebar filters/pagination, local tabs/selections, details, scroll, print-page return, user/clinic isolation, logout cleanup, blocked storage, mobile overflow, and no form/password retention.",
    );
  } finally {
    if (browser) await browser.close();
    assert.equal(
      path.dirname(path.resolve(tempRoot)),
      path.resolve(os.tmpdir()),
    );
    assert.ok(path.basename(tempRoot).startsWith("clinic-view-retention-"));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
