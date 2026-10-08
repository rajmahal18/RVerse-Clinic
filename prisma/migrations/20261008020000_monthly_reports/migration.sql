-- Keep customer relationship separate from the official CSM client type.
-- Existing surveys remain unspecified; do not infer Employee/Dependent.
ALTER TABLE "ClientSatisfactionSurvey" ADD COLUMN "customerType" TEXT;
ALTER TABLE "ClientSatisfactionSurvey" ADD COLUMN "agencyName" TEXT;
CREATE INDEX "Visit_timeIn_status_idx" ON "Visit"("timeIn", "status");
CREATE INDEX "ClientSatisfactionSurvey_surveyDate_idx" ON "ClientSatisfactionSurvey"("surveyDate");
