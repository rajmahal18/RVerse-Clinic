ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DOCTOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'NURSE';
ALTER TYPE "RequestType" ADD VALUE IF NOT EXISTS 'BP_CHECKING';
ALTER TYPE "RequestType" ADD VALUE IF NOT EXISTS 'RBS_CHECKING';
ALTER TABLE "Patient" ADD COLUMN "primaryContactNo" TEXT;
ALTER TABLE "Visit" ADD COLUMN "physicalExam" TEXT,
  ADD COLUMN "doctorLockedFields" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "progressNotesDoneAt" TIMESTAMP(3),
  ADD COLUMN "treatmentDoneAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE TABLE "FormDraft" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "visitId" TEXT NOT NULL REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "key" TEXT NOT NULL,
  "values" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "FormDraft_userId_visitId_key_key" ON "FormDraft"("userId", "visitId", "key");
CREATE TABLE "DiseaseCatalog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clinicId" TEXT NOT NULL REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL
);
CREATE UNIQUE INDEX "DiseaseCatalog_clinicId_name_key" ON "DiseaseCatalog"("clinicId", "name");
-- Only link existing administrations; vaccine requests do not prove administration.
INSERT INTO "VisitRequest" ("id", "visitId", "type", "createdAt")
SELECT 'vaccine-link-' || v."visitId", v."visitId", 'VACCINATION'::"RequestType", MIN(v."createdAt")
FROM "VaccinationRecord" v GROUP BY v."visitId"
ON CONFLICT ("visitId", "type") DO NOTHING;
