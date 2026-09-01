CREATE TYPE "LabResultType" AS ENUM ('CLINICAL_CHEMISTRY', 'URINALYSIS', 'HEMATOLOGY');

ALTER TABLE "MedicineRequest" ADD COLUMN "releasedAt" TIMESTAMP(3);
ALTER TABLE "MedicineRequest" ADD COLUMN "receivedAt" TIMESTAMP(3);

CREATE TABLE "LabResult" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "followUpId" TEXT,
  "type" "LabResultType" NOT NULL,
  "dateReceived" TIMESTAMP(3),
  "dateReleased" TIMESTAMP(3),
  "laboratoryHospital" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabResultValue" (
  "id" TEXT NOT NULL,
  "labResultId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "result" TEXT NOT NULL,

  CONSTRAINT "LabResultValue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LabResult_visitId_type_createdAt_idx" ON "LabResult"("visitId", "type", "createdAt");
CREATE INDEX "LabResult_followUpId_idx" ON "LabResult"("followUpId");
CREATE UNIQUE INDEX "LabResultValue_labResultId_fieldKey_key" ON "LabResultValue"("labResultId", "fieldKey");
CREATE INDEX "LabResultValue_fieldKey_idx" ON "LabResultValue"("fieldKey");

ALTER TABLE "LabResult"
  ADD CONSTRAINT "LabResult_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LabResult"
  ADD CONSTRAINT "LabResult_followUpId_fkey"
  FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LabResultValue"
  ADD CONSTRAINT "LabResultValue_labResultId_fkey"
  FOREIGN KEY ("labResultId") REFERENCES "LabResult"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
