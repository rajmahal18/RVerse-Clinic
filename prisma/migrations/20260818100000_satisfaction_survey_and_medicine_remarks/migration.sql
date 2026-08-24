ALTER TABLE "MedicineRequest" ADD COLUMN "remarks" TEXT;

CREATE TABLE "ClientSatisfactionSurvey" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "clientType" TEXT,
    "regionOfResidence" TEXT,
    "serviceAvailed" TEXT,
    "respondentSex" TEXT,
    "respondentAge" INTEGER,
    "cc1" TEXT,
    "cc2" TEXT,
    "cc3" TEXT,
    "sqd0" TEXT,
    "sqd1" TEXT,
    "sqd2" TEXT,
    "sqd3" TEXT,
    "sqd4" TEXT,
    "sqd5" TEXT,
    "sqd6" TEXT,
    "sqd7" TEXT,
    "sqd8" TEXT,
    "suggestions" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientSatisfactionSurvey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientSatisfactionSurvey_visitId_key" ON "ClientSatisfactionSurvey"("visitId");
ALTER TABLE "ClientSatisfactionSurvey" ADD CONSTRAINT "ClientSatisfactionSurvey_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
