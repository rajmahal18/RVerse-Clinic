const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const sharp = require("sharp");
const jsQR = require("jsqr");

function loadTs(filename, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports
  );
  return module.exports;
}

async function main() {
  const { patientProfileUrl, createPatientQrLabel } = loadTs("src/lib/patient-qr.ts");
  const browserQr = loadTs("src/lib/patient-qr.ts", { qrcode: require("qrcode/lib/browser") });
  const { safeLoginNext } = loadTs("src/lib/login-next.ts");
  const { formatPatientFormCode, findPatientByFormCode } = loadTs("src/lib/patient-form-number.ts", {
    "@/lib/date-time": { APP_TIME_ZONE: "Asia/Shanghai" },
    "@/lib/prisma": { prisma: { $queryRaw: async (sql, ...params) => {
      assert.deepEqual(params, [1, "clinic-one"]);
      return [{ id: "sample-patient", createdAt: new Date("2026-09-01T00:00:00Z") }];
    } } },
  });

  const code = formatPatientFormCode(new Date("2026-09-01T00:00:00Z"), 1);
  assert.equal(code, "TC202609-0001");
  assert.equal(formatPatientFormCode(new Date("2026-09-30T16:00:00Z"), 10000), "TC202610-10000");
  assert.equal(await findPatientByFormCode("tc202609-0001", "clinic-one"), "sample-patient");
  assert.equal(await findPatientByFormCode("TC202610-0001", "clinic-one"), null);
  assert.equal(await findPatientByFormCode("TC202609-0000", "clinic-one"), null);
  assert.equal(await findPatientByFormCode("TC202609-999999999999", "clinic-one"), null);

  for (const value of ["https://other.test", "//other.test", "/\\other.test", "/\n/other.test", undefined]) {
    assert.equal(safeLoginNext(value), "/dashboard");
  }
  assert.equal(safeLoginNext("/patients/sample-patient"), "/patients/sample-patient");
  assert.throws(() => patientProfileUrl("javascript:alert(1)", "sample-patient"));
  assert.throws(() => patientProfileUrl("https://user:pass@clinic.test", "sample-patient"));
  await assert.rejects(() => createPatientQrLabel("https://clinic.test", "<script>"));

  let previewSvg;
  for (const origin of ["https://clinic.example.gov", "http://192.168.1.20:3000", "https://new-deployment.example.gov"]) {
    const url = patientProfileUrl(origin, "sample-patient");
    assert.equal(url, `${origin}/patients/sample-patient`);
    const svg = await createPatientQrLabel(url, code);
    assert.equal(await browserQr.createPatientQrLabel(url, code), svg);
    assert.match(svg, /width="30mm" height="34mm"/);
    assert.match(svg, /TC202609-0001/);
    for (const density of [96, 300]) {
      const { data, info } = await sharp(Buffer.from(svg), { density }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
      assert.equal(decoded?.data, url, `QR decode at ${density} DPI for ${origin}`);
    }
    previewSvg ??= svg;
  }
  if (process.argv.includes("--preview")) {
    const folder = "docs/generated-previews";
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "patient-qr-label.svg"), previewSvg);
    await sharp(Buffer.from(previewSvg), { density: 300 }).png().toFile(path.join(folder, "patient-qr-label.png"));
  }
  console.log("PASS: QR labels decode at screen/print resolution, changing origins, patient code lookup, timezone, and login destinations.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
