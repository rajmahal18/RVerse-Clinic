const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");
const compiledWebpack = require("next/dist/compiled/webpack/webpack");
compiledWebpack.init();

async function main() {
  const workspace = process.cwd();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "clinic-notification-review-"));
  let browser;
  try {
    fs.writeFileSync(path.join(tempRoot, "loader.cjs"), `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;};`);
    fs.writeFileSync(path.join(tempRoot, "link.js"), 'const React=require("react");module.exports=function Link({children,...props}){return React.createElement("a",props,children)};');
    fs.writeFileSync(path.join(tempRoot, "entry.js"), `
      const React=require("react");
      const {createRoot}=require("react-dom/client");
      const {Notifications}=require(${JSON.stringify(path.join(workspace, "src/components/layout/notifications.tsx"))});
      window.mockNotices=[{id:"notice-a",title:"Medicine released",detail:"Sample Patient / Test medicine"}];
      window.polls=0;
      window.fetch=async()=>({ok:true,json:async()=>({userId:"synthetic-user",notifications:window.mockNotices})});
      Object.defineProperty(window,"localStorage",{get(){throw new Error("Storage disabled");}});
      const originalInterval=window.setInterval;
      window.setInterval=(callback,delay)=>{window.pollNotifications=()=>{window.polls++;callback();};return originalInterval(callback,delay);};
      createRoot(document.getElementById("root")).render(React.createElement("header",{style:{height:"64px",position:"sticky",top:0,backdropFilter:"blur(8px)",zIndex:20}},React.createElement(Notifications,{hasExpiry:false,onExpiry(){}})));
    `);
    await new Promise((resolve, reject) => {
      const compiler = compiledWebpack.webpack({ mode: "production", context: workspace, entry: path.join(tempRoot, "entry.js"), output: { path: tempRoot, filename: "bundle.js" }, resolve: { modules: [path.join(workspace, "node_modules")], alias: { "@": path.join(workspace, "src"), "next/link$": path.join(tempRoot, "link.js") }, extensions: [".tsx", ".ts", ".js"] }, module: { rules: [{ test: /\.tsx?$/, use: path.join(tempRoot, "loader.cjs") }] }, optimization: { minimize: false } });
      compiler.run((error, stats) => compiler.close(() => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
    });
    const css = fs.readdirSync(".next/static/css").filter(name => name.endsWith(".css")).map(name => fs.readFileSync(path.join(".next/static/css", name), "utf8")).join("\n");
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
    const page = await browser.newPage();
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body><div id="root"></div></body></html>`);
      await page.addScriptTag({ path: path.join(tempRoot, "bundle.js") });
      await page.getByRole("button", { name: "Dismiss notification" }).waitFor();
      assert.equal(await page.locator('header [role="status"]').count(), 0, "Popup must escape sticky header");
      await page.getByRole("button", { name: "Dismiss notification" }).click();
      await page.evaluate(() => window.pollNotifications());
      await page.waitForTimeout(100);
      assert.equal(await page.getByRole("button", { name: "Dismiss notification" }).count(), 0, "Blocked storage must not repeat a delivered popup");
      await page.getByRole("button", { name: "Open notifications" }).click();
      await page.getByRole("dialog").waitFor();
      assert.equal(await page.locator('header [role="dialog"]').count(), 0);
      const backdrop = await page.getByRole("dialog").evaluate(element => { const rect = element.parentElement.getBoundingClientRect(); return { width: rect.width, height: rect.height, top: rect.top }; });
      assert.equal(backdrop.width, width);
      assert.equal(backdrop.height, 800);
      assert.equal(backdrop.top, 0);
      assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.evaluate(() => document.body.style.overflow), "");
      await page.evaluate(() => { window.mockNotices.push({ id: "notice-b", title: "Patient scheduled", detail: "Another synthetic event" }); window.pollNotifications(); });
      await page.getByRole("button", { name: "Dismiss notification" }).waitFor();
      assert.ok(await page.getByText("Patient scheduled", { exact: true }).isVisible());
      await page.emulateMedia({ media: "print" });
      assert.equal(await page.getByRole("button", { name: "Dismiss notification" }).isVisible(), false);
      await page.emulateMedia({ media: "screen" });
    }
    console.log("PASS: hydrated notifications escape blurred header; full-screen modal at 320/768/1280px; blocked-storage deduplication; new-event delivery; Escape/scroll restoration; print hides popup.");
  } finally {
    if (browser) await browser.close();
    const resolved = path.resolve(tempRoot);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("clinic-notification-review-")) throw new Error("Unexpected test cleanup directory");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
