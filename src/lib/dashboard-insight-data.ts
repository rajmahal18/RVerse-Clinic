import { Prisma, type RequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateKey } from "@/lib/date-time";
import { requestTypeLabels } from "@/lib/clinic-services";
import { serviceCancellationPrefix } from "@/lib/service-state";
import type { ComplaintInsight, ServiceInsight } from "@/lib/dashboard-insights";

type Aggregate = {
  visitCount: bigint;
  demographics: { profiles: number; female: number; male: number; averageAge: number };
  services: { type: RequestType; visits: number }[];
  complaints: ComplaintInsight[];
};

// Aggregate in PostgreSQL: the dashboard transfers at most 11 service totals and
// ten complaints instead of every historical visit and its child collections.
export async function getDashboardInsights(clinicId: string, now = new Date()) {
  const [result] = await prisma.$queryRaw<Aggregate[]>(Prisma.sql`
    WITH patients AS MATERIALIZED (
      SELECT p.id, p.gender::text AS gender,
        ((p."birthDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila')::date AS birth_date
      FROM "Patient" p WHERE p."clinicId" = ${clinicId} AND p."deletedAt" IS NULL
    ), eligible AS MATERIALIZED (
      SELECT v.id, v.status::text AS status, v."chiefComplaint", p.gender
      FROM "Visit" v JOIN patients p ON p.id = v."patientId"
      WHERE v."deletedAt" IS NULL AND v.status <> 'CANCELLED'
    ), cancelled AS MATERIALIZED (
      SELECT r."visitId", r.type::text AS type FROM "VisitRequest" r
      JOIN eligible v ON v.id = r."visitId"
      WHERE r."deletedAt" IS NULL
        AND left(r.remarks, length(${serviceCancellationPrefix})) = ${serviceCancellationPrefix}
    ), availed AS (
      SELECT v.id, r.type::text AS type FROM eligible v
      JOIN "VisitRequest" r ON r."visitId" = v.id AND r."deletedAt" IS NULL
      WHERE v.status = 'COMPLETED' AND r.type::text NOT IN ('MEDICINES', 'VACCINATION', 'REFERRAL')
        AND NOT EXISTS (SELECT 1 FROM cancelled c WHERE c."visitId" = v.id AND c.type = r.type::text)
      UNION
      SELECT v.id, 'MEDICINES' FROM eligible v
      JOIN "MedicineRequest" m ON m."visitId" = v.id AND m."deletedAt" IS NULL AND m.status = 'RECEIVED'
      WHERE NOT EXISTS (SELECT 1 FROM cancelled c WHERE c."visitId" = v.id AND c.type = 'MEDICINES')
      UNION
      SELECT v.id, 'VACCINATION' FROM eligible v
      JOIN "VaccinationRecord" r ON r."visitId" = v.id AND r."deletedAt" IS NULL
      WHERE NOT EXISTS (SELECT 1 FROM cancelled c WHERE c."visitId" = v.id AND c.type = 'VACCINATION')
      UNION
      SELECT v.id, 'REFERRAL' FROM eligible v
      JOIN "Referral" r ON r."visitId" = v.id AND r."deletedAt" IS NULL
      WHERE NOT EXISTS (SELECT 1 FROM cancelled c WHERE c."visitId" = v.id AND c.type = 'REFERRAL')
    ), service_counts AS (
      SELECT type, count(*) AS visits FROM availed GROUP BY type
    ), complaint_labels AS (
      SELECT v.id, v.gender,
        btrim(regexp_replace(regexp_replace(part, '^[[:space:]]*others?[[:space:]]*:[[:space:]]*', '', 'i'), '[[:space:]]+', ' ', 'g')) AS label
      FROM eligible v CROSS JOIN LATERAL regexp_split_to_table(coalesce(v."chiefComplaint", ''), ';') AS part
    ), complaints_per_visit AS (
      SELECT id, gender, lower(label) AS complaint, min(label COLLATE "C") AS label
      FROM complaint_labels WHERE label <> '' AND lower(label) NOT IN ('other', 'others')
      GROUP BY id, gender, lower(label)
    ), complaint_counts AS (
      SELECT min(label COLLATE "C") AS label, count(*) AS visits,
        count(*) FILTER (WHERE gender = 'FEMALE') AS female,
        count(*) FILTER (WHERE gender = 'MALE') AS male,
        count(*) FILTER (WHERE gender NOT IN ('FEMALE', 'MALE')) AS unspecified
      FROM complaints_per_visit GROUP BY complaint
      ORDER BY count(*) DESC, min(label COLLATE "C") ASC LIMIT 10
    ), demographics AS (
      SELECT count(*) AS profiles,
        count(*) FILTER (WHERE gender = 'FEMALE') AS female,
        count(*) FILTER (WHERE gender = 'MALE') AS male,
        coalesce(floor(avg(extract(year FROM ${formatDateKey(now)}::date) - extract(year FROM birth_date)
          - CASE WHEN to_char(${formatDateKey(now)}::date, 'MMDD') < to_char(birth_date, 'MMDD') THEN 1 ELSE 0 END) + 0.5), 0) AS "averageAge"
      FROM patients
    )
    SELECT (SELECT count(*) FROM eligible) AS "visitCount",
      (SELECT to_jsonb(d) FROM demographics d) AS demographics,
      coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.visits DESC, s.type) FROM service_counts s), '[]'::jsonb) AS services,
      coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.visits DESC, c.label COLLATE "C") FROM complaint_counts c), '[]'::jsonb) AS complaints
  `);
  const services: ServiceInsight[] = result.services.map((row) => ({ label: requestTypeLabels[row.type], visits: row.visits }));
  services.sort((a, b) => b.visits - a.visits || a.label.localeCompare(b.label));
  return { visitCount: Number(result.visitCount), demographics: result.demographics, services, complaints: result.complaints };
}
