ALTER TABLE "VisitRequest"
  ADD COLUMN "requestedItem" TEXT,
  ADD COLUMN "remarks" TEXT;

ALTER TABLE "ClientSatisfactionSurvey"
  ADD COLUMN "surveyDate" TIMESTAMP(3),
  ADD COLUMN "officeVisited" TEXT;

ALTER TABLE "Referral"
  ADD COLUMN "scheduledFor" TIMESTAMP(3);
