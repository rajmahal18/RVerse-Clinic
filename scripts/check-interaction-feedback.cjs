const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");

async function main() {
  const workspace = process.cwd();
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "clinic-click-feedback-"),
  );
  let browser;
  try {
    const webpack = require("next/dist/compiled/webpack/webpack");
    webpack.init();
    fs.writeFileSync(
      path.join(tempRoot, "loader.cjs"),
      `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "link.js"),
      `const React=require('react');const Status=React.createContext({pending:false});exports.useLinkStatus=()=>React.useContext(Status);exports.default=React.forwardRef(function Link({children,onClick,...props},ref){const [pending,setPending]=React.useState(false);return React.createElement(Status.Provider,{value:{pending}},React.createElement('a',{...props,ref,onClick:e=>{onClick?.(e);if(e.defaultPrevented||e.ctrlKey||e.metaKey||props.target==='_blank'||props.download)return;e.preventDefault();setPending(true);window.finishLink=()=>setPending(false)}},children))});exports.__esModule=true;`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "router.js"),
      `const router={push:()=>new Promise(resolve=>{window.finishRouter=resolve}),replace:()=>new Promise(resolve=>{window.finishRouter=resolve}),refresh:()=>new Promise(resolve=>{window.finishRouter=resolve})};exports.useRouter=()=>router;`,
    );
    fs.writeFileSync(
      path.join(tempRoot, "entry.js"),
      `
      const React=require('react');const {createRoot}=require('react-dom/client');const h=React.createElement;
      const {FormFeedback}=require('@/components/ui/form-feedback');const {InteractionFeedback}=require('@/components/navigation/interaction-feedback');const Link=require('@/components/navigation/app-link').default;const {useFeedbackRouter}=require('@/components/navigation/use-feedback-router');
      window.submissions=[];window.failSave=false;
      function App(){const [result,setResult]=React.useState('');const router=useFeedbackRouter();
        return h(React.Fragment,null,h('main',{className:'p-4 space-y-4'},
          h('button',{type:'button',className:'h-10 rounded-lg border px-4',onClick:()=>setResult('Opened')},'Open details'),
          h('form',{id:'save-form',action:async data=>{window.submissions.push(Object.fromEntries(data));await new Promise(resolve=>window.finishSave=resolve);setResult(window.failSave?'Unable to save. Please retry.':'Saved');}},
            h(FormFeedback),h('input',{name:'csrfToken',type:'hidden',value:'test-csrf'}),h('input',{name:'note',required:true,className:'h-10 max-w-full border px-2','aria-label':'Note'}),
            h('div',{className:'flex flex-wrap gap-2 mt-2'},h('button',{name:'visitIntent',value:'save',type:'submit',className:'h-10 rounded-lg border px-4'},'Save visit'),h('button',{name:'visitIntent',value:'complete',type:'submit',className:'h-10 rounded-lg bg-teal-600 text-white px-4'},'Complete visit'))),
          h('form',{id:'cancel-form',onSubmit:e=>e.preventDefault()},h(FormFeedback),h('button',{className:'h-10 border px-4'},'Cancel confirmation')),
          h(Link,{href:'/patients',className:'inline-flex h-10 items-center rounded-lg border px-4'},'Patients'),
          h('button',{type:'button',onClick:()=>router.push('/inventory'),className:'h-10 border px-4'},'Inventory filter'),
          h('button',{type:'button',onClick:()=>setResult('Printed'),className:'h-10 border px-4'},'Print'),h('p',{role:'alert'},result)),h(InteractionFeedback));}
      createRoot(document.getElementById('root')).render(h(App));
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
            "next/link$": path.join(tempRoot, "link.js"),
            "next/navigation$": path.join(tempRoot, "router.js"),
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
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      await page.setContent(
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>',
      );
      await page.addStyleTag({ path: path.join(tempRoot, "styles.css") });
      await page.addScriptTag({ path: path.join(tempRoot, "bundle.js") });
      await page
        .getByRole("button", { name: "Open details", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Open details", exact: true })
          .getAttribute("data-click-feedback"),
        "true",
      );
      await page
        .getByRole("button", { name: "Complete visit", exact: true })
        .click();
      assert.equal(await page.evaluate(() => window.submissions.length), 0);
      assert.equal(
        await page.locator("#save-form").getAttribute("aria-busy"),
        null,
      );
      await page.getByLabel("Note").fill("Final keystroke");
      const before = await page
        .getByRole("button", { name: "Complete visit", exact: true })
        .boundingBox();
      await page
        .getByRole("button", { name: "Complete visit", exact: true })
        .click();
      await page.waitForFunction(() => window.submissions.length === 1);
      assert.equal(
        await page
          .getByRole("button", { name: "Complete visit", exact: true })
          .getAttribute("data-request-pending"),
        "true",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Save visit", exact: true })
          .getAttribute("aria-disabled"),
        "true",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Save visit", exact: true })
          .evaluate((button) => button.disabled),
        false,
      );
      assert.equal(
        await page.getByRole("status").textContent(),
        "Processing request…",
      );
      if (width === 375 || width === 1280)
        await page.screenshot({
          path: path.join(
            workspace,
            ".next",
            `interaction-feedback-${width}.png`,
          ),
          fullPage: true,
        });
      assert.deepEqual(await page.evaluate(() => window.submissions[0]), {
        csrfToken: "test-csrf",
        note: "Final keystroke",
        visitIntent: "complete",
      });
      await page.evaluate(() => {
        const form = document.querySelector("#save-form");
        form.requestSubmit(form.querySelector('button[value="complete"]'));
        form.requestSubmit(form.querySelector('button[value="save"]'));
      });
      assert.equal(await page.evaluate(() => window.submissions.length), 1);
      assert.deepEqual(
        await page
          .getByRole("button", { name: "Complete visit", exact: true })
          .boundingBox(),
        before,
      );
      await page.evaluate(() => window.finishSave());
      await page.waitForFunction(
        () => !document.querySelector("#save-form").hasAttribute("aria-busy"),
      );
      assert.equal(await page.getByRole("status").textContent(), "");
      await page.evaluate(() => (window.failSave = true));
      await page.getByLabel("Note").fill("Retry input");
      await page
        .getByRole("button", { name: "Save visit", exact: true })
        .click();
      await page.waitForFunction(() => window.submissions.length === 2);
      await page.evaluate(() => window.finishSave());
      await page
        .getByText("Unable to save. Please retry.", { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Save visit", exact: true })
          .getAttribute("aria-disabled"),
        null,
      );
      await page
        .getByRole("button", { name: "Cancel confirmation", exact: true })
        .click();
      await page.waitForFunction(
        () => !document.querySelector("#cancel-form").hasAttribute("aria-busy"),
      );
      await page.getByRole("link", { name: "Patients", exact: true }).click();
      await page.getByText("Opening page…", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("link", { name: "Patients", exact: true })
          .getAttribute("aria-busy"),
        "true",
      );
      await page.evaluate(() => window.finishLink());
      await page.waitForFunction(
        () => !document.querySelector("a").hasAttribute("aria-busy"),
      );
      await page
        .getByRole("button", { name: "Inventory filter", exact: true })
        .click();
      await page.getByText("Loading page…", { exact: true }).waitFor();
      await page.evaluate(() => window.finishRouter());
      await page.waitForFunction(
        () => document.querySelector('[role="status"]').textContent === "",
      );
      await page.getByRole("button", { name: "Print", exact: true }).click();
      assert.equal(await page.getByRole("status").textContent(), "");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByLabel("Note").fill("Reduced motion input");
      await page
        .getByRole("button", { name: "Save visit", exact: true })
        .click();
      await page.waitForFunction(() => window.submissions.length === 3);
      assert.equal(
        await page
          .getByRole("button", { name: "Save visit", exact: true })
          .evaluate(
            (button) => getComputedStyle(button, "::after").animationName,
          ),
        "none",
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.emulateMedia({ media: "print" });
      assert.equal(await page.getByRole("status").isVisible(), false);
      await page.evaluate(() => window.finishSave());
      await page.emulateMedia({
        media: "screen",
        reducedMotion: "no-preference",
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: click acknowledgement, actual async form/link/router lifecycles, duplicate-submit guard, preserved CSRF/submitter/final input, validation/error recovery, cancelled submits, no layout shift, reduced motion, print hiding, and 320–1280px overflow.",
    );
  } finally {
    if (browser) await browser.close();
    assert.equal(
      path.dirname(path.resolve(tempRoot)),
      path.resolve(os.tmpdir()),
    );
    assert.ok(path.basename(tempRoot).startsWith("clinic-click-feedback-"));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
