import QRCode from "qrcode";

export function patientProfileUrl(baseUrl: string, patientId: string) {
  const base = new URL(baseUrl);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
    throw new Error("Use an HTTP or HTTPS clinic URL.");
  }
  return new URL(`/patients/${encodeURIComponent(patientId)}`, base.origin).href;
}

export async function createPatientQrLabel(profileUrl: string, patientCode: string) {
  if (!/^TC\d{6}-\d{4,}$/.test(patientCode)) throw new Error("Invalid patient code.");
  const qr = await QRCode.toString(profileUrl, {
    type: "svg",
    errorCorrectionLevel: "Q",
    margin: 4,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const dimension = Number(qr.match(/viewBox="0 0 (\d+) /)?.[1]);
  if (!dimension) throw new Error("QR code could not be generated.");
  const content = qr.slice(qr.indexOf(">") + 1, qr.lastIndexOf("</svg>"));
  // The QR includes its four-module white margin; the code sits outside it.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30mm" height="34mm" viewBox="0 0 300 340"><rect width="300" height="340" fill="white"/><g shape-rendering="crispEdges" transform="translate(10 0) scale(${280 / dimension})">${content}</g><text x="150" y="316" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="23" fill="black">${patientCode}</text></svg>`;
}
