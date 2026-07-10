-- AlterTable
ALTER TABLE "VaccinationRecord" ADD COLUMN     "dose" TEXT;

-- CreateTable
CREATE TABLE "VaccineCatalog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaccineCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VaccineCatalog_clinicId_name_idx" ON "VaccineCatalog"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "VaccineCatalog_clinicId_name_key" ON "VaccineCatalog"("clinicId", "name");

-- AddForeignKey
ALTER TABLE "VaccineCatalog" ADD CONSTRAINT "VaccineCatalog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
