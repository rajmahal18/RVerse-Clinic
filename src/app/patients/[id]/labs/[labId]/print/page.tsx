import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PrintActions } from "@/components/clinic-forms/print-actions";
import { Button } from "@/components/ui/button";
import { formatDateKey } from "@/lib/date-time";
import { getLabDefinition } from "@/lib/lab-results";
import { prisma } from "@/lib/prisma";

export default async function LabResultPrintPage({ params }: { params: Promise<{ id: string; labId: string }> }) {
  const { id, labId } = await params;
  const result = await prisma.labResult.findUnique({
    where: { id: labId },
    include: { values: true, visit: { include: { patient: true } } },
  });

  if (!result || result.visit.patientId !== id) notFound();
  const definition = getLabDefinition(result.type);
  const values = Object.fromEntries(result.values.map((value) => [value.fieldKey, value.result]));
  const filename = `${definition.shortTitle.toLowerCase().replaceAll(" ", "-")}-${id}-${result.id}`;

  return (
    <main className="clinic-print-screen">
      <div className="no-print mx-auto mb-4 flex w-[min(100%,210mm)] flex-col gap-3">
        <Button asChild variant="outline" className="w-fit">
          <Link href={`/patients/${id}`}><ArrowLeft className="h-4 w-4" /> Back to patient</Link>
        </Button>
        <PrintActions filename={filename} />
      </div>

      <div className="clinic-form-page lab-print-page">
        <h1>{definition.title.toUpperCase()}</h1>
        <div className="lab-print-header">
          <span>Date Received: <b>{result.dateReceived ? formatDateKey(result.dateReceived) : ""}</b></span>
          <span>Laboratory / Hospital: <b>{result.laboratoryHospital ?? ""}</b></span>
          <span>Date Released: <b>{result.dateReleased ? formatDateKey(result.dateReleased) : ""}</b></span>
          <span>Patient: <b>{result.visit.patient.lastName}, {result.visit.patient.firstName}</b></span>
        </div>
        {definition.sections.map((section) => (
          <section key={section.title} className="lab-print-section">
            <h2>{section.title.toUpperCase()}</h2>
            <table>
              {section.mode === "dual" ? (
                <>
                  <thead>
                    <tr><th rowSpan={2}>Test Name</th><th colSpan={3}>S.I. Units</th><th colSpan={3}>Conventional Units</th></tr>
                    <tr><th>Result</th><th>Unit</th><th>Reference Range</th><th>Result</th><th>Unit</th><th>Reference Range</th></tr>
                  </thead>
                  <tbody>
                    {section.tests.map((test) => (
                      <tr key={test.key}>
                        <td>{test.name}</td>
                        <td>{values[`${test.key}.siResult`] ?? ""}</td>
                        <td>{test.siUnit}</td>
                        <td>{test.siReferenceRange}</td>
                        <td>{values[`${test.key}.conventionalResult`] ?? ""}</td>
                        <td>{test.conventionalUnit}</td>
                        <td>{test.conventionalReferenceRange}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead><tr><th>Test Name</th><th>Result</th><th>Unit</th><th>Reference Range</th></tr></thead>
                  <tbody>{section.tests.map((test) => <tr key={test.key}><td>{test.name}</td><td>{values[`${test.key}.result`] ?? ""}</td><td>{test.unit}</td><td>{test.referenceRange}</td></tr>)}</tbody>
                </>
              )}
            </table>
          </section>
        ))}
      </div>
    </main>
  );
}
