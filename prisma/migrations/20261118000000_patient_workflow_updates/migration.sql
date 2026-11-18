ALTER TABLE "InventoryItem" ADD COLUMN "isRequestable" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "ChiefComplaintCatalog" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "ChiefComplaintCatalog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChiefComplaintCatalog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ChiefComplaintCatalog_clinicId_name_key" ON "ChiefComplaintCatalog"("clinicId", "name");
