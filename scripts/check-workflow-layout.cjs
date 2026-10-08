const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { chromium } = require("playwright-core");

const longName = "Long medicine and patient name ".repeat(8);
const summary = { date: "2026-10-07", rows: Array.from({ length: 35 }, (_, index) => ({ patientId: `patient-${index}`, patientNumber: `P-${index}`, name: longName, time: "10:00 AM", services: "Medical consultation, provision of medicine", status: "completed", diagnosis: "Test diagnosis" })) };
let noticeState = 0;
const notices = [
  {
    id: "stock",
    title: "Low stock",
    at: new Date().toISOString(),
    detail: Array.from(
      { length: 40 },
      () => `${longName}: 2 pcs (threshold 5)`,
    ).join("\n"),
  },
];
const mocks = {
  "next/link": ({ children, ...props }) => React.createElement("a", props, children),
  "next/navigation": { redirect: () => { throw new Error("Unexpected redirect"); }, notFound: () => { throw new Error("Unexpected notFound"); } },
  "@/lib/auth": { getCurrentUser: async () => ({ id: "records-a", role: "RECORDS", clinicId: "clinic-a" }) },
  "@/lib/prisma": { prisma: { activityLog: { findFirst: async () => ({ id: "summary-a", metadata: summary, createdAt: new Date(), description: "Ready" }), findMany: async () => [] } } },
  "@/lib/daily-summary": { validSummaryDate: value => value, readDailySummary: value => value },
  "@/app/actions/workflow": {},
  "@/components/security/csrf-field": { CsrfField: () => null },
  "@/components/layout/app-shell": { AppShell: ({ children }) => React.createElement("div", { className: "lg:pl-72" }, React.createElement("header", null, "App header"), React.createElement("div", null, "Expiry banner"), React.createElement("main", null, children)) },
};
function load(filename, notificationHooks = false) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => {
      if (notificationHooks && name === "react")
        return {
          ...React,
          useEffect() {},
          useState: () => [[notices, true, [], "all"][noticeState++], () => {}],
        };
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith("@/")) {
        const base = path.join("src", name.slice(2));
        return load(
          fs.existsSync(`${base}.tsx`) ? `${base}.tsx` : `${base}.ts`,
        );
      }
      return require(name);
    },
    module,
    module.exports,
  );
  return module.exports;
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    const css = fs.readdirSync(".next/static/css").filter(name => name.endsWith(".css")).map(name => fs.readFileSync(path.join(".next/static/css", name), "utf8")).join("\n");
    const page = await browser.newPage();
    const Notifications = load("src/components/layout/notifications.tsx", true).Notifications;
    const DailySummary = load("src/app/reports/daily-summary/page.tsx").default;
    const InventoryModal = load("src/components/inventory/inventory-item-modal.tsx").InventoryItemModal;
    const summaryPage = await DailySummary({ searchParams: Promise.resolve({ submission: "summary-a" }) });
    const item = { id: "item-a", item: longName, category: "Medicine", dosage: "500mg", brandName: "Generic", unit: "pcs", stock: 2, boxStock: 0, reorder: 5, status: "Low stock", expirationDate: "2026-12-31", expirationDateValue: "2026-12-31", pcsPerBox: "10", classification: "Medicine", movements: [{ id: "movement-a", quantity: -3, boxQuantity: 0, reason: "Expired stock removed by Staff", date: "Oct 7, 2026" }] };
    async function render(element, width) {
      await page.emulateMedia({ media: "screen" });
      await page.setViewportSize({ width, height: 800 });
      await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${renderToStaticMarkup(element)}</body></html>`);
      const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(size.scroll <= size.width, `Horizontal overflow at ${width}px: ${JSON.stringify(size)}`);
    }
    for (const width of [320, 375, 768, 1280]) {
      noticeState = 0;
      await render(React.createElement(Notifications, { hasExpiry: true, onExpiry() {} }), width);
      assert.ok(await page.getByRole("dialog").isVisible());
      const scrollable = await page.locator('[role="dialog"] > div').last().evaluate(element => element.scrollHeight > element.clientHeight);
      assert.ok(scrollable, "Long low-stock list must scroll within the dialog");
      await render(React.createElement(InventoryModal, { item, onClose() {} }), width);
      assert.ok(await page.getByText("Deduct stock", { exact: true }).isVisible());
      await page.getByText("Recent stock movements", { exact: true }).click();
      assert.ok(await page.getByText("Expired stock removed by Staff").count());
      await render(summaryPage, width);
    }
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator("header").isVisible(), false);
    assert.equal(await page.getByText("Expiry banner", { exact: true }).isVisible(), false);
    assert.equal(await page.locator(".no-print").first().isVisible(), false);
    assert.ok(await page.locator(".daily-patient-report-table").isVisible());
    assert.equal(await page.locator(".daily-patient-report-table tbody tr").count(), 35);
    const pdf = await page.pdf({ preferCSSPageSize: true });
    assert.ok(pdf.length > 1000);
    console.log("PASS: notifications, stock deduction, history, and daily summary at 320/375/768/1280px; contained modal scrolling; report PDF hides app controls.");
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
