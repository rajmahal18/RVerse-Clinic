CREATE TYPE "DiagnosisStatus" AS ENUM ('CONFIRMED', 'TO_CONSIDER', 'RULE_OUT');
ALTER TABLE "Visit" ADD COLUMN "diagnosisNotes" TEXT,
  ADD COLUMN "diagnosesStructured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "intakeNotes" TEXT,
  ADD COLUMN "readyForDoctorAt" TIMESTAMP(3);
ALTER TABLE "DiseaseCatalog" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "VisitDiagnosis" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "visitId" TEXT NOT NULL REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "diseaseId" TEXT NOT NULL REFERENCES "DiseaseCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "diseaseName" TEXT NOT NULL,
  "status" "DiagnosisStatus" NOT NULL
);
CREATE UNIQUE INDEX "VisitDiagnosis_visitId_diseaseId_key" ON "VisitDiagnosis"("visitId", "diseaseId");
CREATE INDEX "VisitDiagnosis_diseaseId_status_idx" ON "VisitDiagnosis"("diseaseId", "status");
