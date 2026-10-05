"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPatientQrLabel, patientProfileUrl } from "@/lib/patient-qr";

export function PatientQrLabel({ patientId, patientCode, baseUrl }: {
  patientId: string;
  patientCode: string;
  baseUrl?: string;
}) {
  const [label, setLabel] = useState<{ imageUrl: string; profileUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [imageReady, setImageReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLabel(null);
    setError("");
    setImageReady(false);
    async function generate() {
      try {
        // Use the browser origin so reverse proxies cannot produce internal URLs.
        const profileUrl = patientProfileUrl(baseUrl || window.location.origin, patientId);
        const svg = await createPatientQrLabel(profileUrl, patientCode);
        if (!cancelled) setLabel({ profileUrl, imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` });
      } catch {
        if (!cancelled) setError("Unable to generate the QR label. Check the clinic URL and reload this page.");
      }
    }
    void generate();
    return () => { cancelled = true; };
  }, [baseUrl, patientId, patientCode]);
  return (
    <main className="patient-qr-screen">
      <div className="no-print mx-auto mb-6 w-full max-w-lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900">Patient QR Label</h1>
          <Button asChild variant="outline"><Link href={`/patients/${patientId}`}><ArrowLeft className="h-4 w-4" /> Patient Profile</Link></Button>
        </div>
        <p className="text-sm text-slate-600">30 × 34 mm. Print at 100% / actual size and turn off browser headers and footers.</p>
        {label && <p className="mt-2 break-all text-xs text-slate-500">Patient link: {label.profileUrl}</p>}
        {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={!imageReady} onClick={() => {
            const previousTitle = document.title;
            document.title = `patient-qr-${patientCode}`;
            window.print();
            document.title = previousTitle;
          }}><Printer className="h-4 w-4" /> Print / Save PDF</Button>
          {label && <Button asChild variant="outline"><a href={label.imageUrl} download={`patient-qr-${patientCode}.svg`}><Download className="h-4 w-4" /> Download Label</a></Button>}
        </div>
      </div>
      {label ? <img className="patient-qr-sticker" src={label.imageUrl} alt={`Patient QR label ${patientCode}`} width={113} height={129} onLoad={() => setImageReady(true)} onError={() => setError("Unable to load the QR label. Reload this page before printing.")} /> : !error && <p className="no-print text-center text-sm text-slate-500">Generating QR label…</p>}
    </main>
  );
}
