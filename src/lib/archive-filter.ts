import { Prisma } from "@prisma/client";

const archivedModels = new Set([
  "User",
  "Patient",
  "Visit",
  "VisitRequest",
  "MedicineRequest",
  "LabResult",
  "Referral",
  "VaccinationRecord",
  "FollowUp",
  "InventoryItem",
]);
const models = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
);
type Args = Record<string, any>;

// Explicit predicates are used by admin recovery and historical stock reports.
function activeWhere(model: string, where: Args = {}): Args {
  if (
    Object.hasOwn(where, "deletedAt") &&
    where.deletedAt !== null &&
    where.deletedAt !== undefined
  )
    return where;
  const guard: Args = archivedModels.has(model) ? { deletedAt: null } : {};
  if (model === "Visit") guard.patient = { deletedAt: null };
  if (
    [
      "VisitRequest",
      "LabResult",
      "Referral",
      "VaccinationRecord",
      "FollowUp",
      "ClientSatisfactionSurvey",
      "VisitDiagnosis",
      "FormDraft",
    ].includes(model)
  )
    guard.visit = { deletedAt: null, patient: { deletedAt: null } };
  if (model === "MedicineRequest")
    guard.OR = [
      { visitId: null },
      { visit: { deletedAt: null, patient: { deletedAt: null } } },
    ];
  return Object.keys(guard).length ? { AND: [where, guard] } : where;
}

function relationReads(model: string, args: Args) {
  for (const selection of [args.include, args.select]) {
    if (!selection || typeof selection !== "object") continue;
    for (const field of models.get(model)?.fields ?? []) {
      if (field.kind !== "object" || !selection[field.name]) continue;
      if (field.isList) {
        const child =
          selection[field.name] === true ? {} : selection[field.name];
        selection[field.name] = child;
        child.where = activeWhere(field.type, child.where);
        relationReads(field.type, child);
      } else if (typeof selection[field.name] === "object") {
        // To-one historical links (e.g. an archived account on a log) stay readable.
        relationReads(field.type, selection[field.name]);
      }
    }
    if (selection._count === true) {
      selection._count = {
        select: Object.fromEntries(
          (models.get(model)?.fields ?? [])
            .filter((field) => field.kind === "object" && field.isList)
            .map((field) => [field.name, true]),
        ),
      };
    }
    const counts = selection._count;
    if (counts && typeof counts === "object" && counts.select) {
      for (const [name, value] of Object.entries(counts.select)) {
        const field = models.get(model)?.fields.find((f) => f.name === name);
        if (!field || !value) continue;
        counts.select[name] = {
          ...(value === true ? {} : (value as Args)),
          where: activeWhere(
            field.type,
            value === true ? {} : (value as Args).where,
          ),
        };
      }
    }
  }
}

export const archiveFilter: Prisma.Middleware = async (params, next) => {
  if (!params.model) return next(params);
  params.args ??= {};
  if (["findUnique", "findUniqueOrThrow"].includes(params.action)) {
    for (const fields of models.get(params.model)?.uniqueFields ?? []) {
      const key = fields.join("_");
      if (params.args.where?.[key]) {
        Object.assign(params.args.where, params.args.where[key]);
        delete params.args.where[key];
      }
    }
  }
  if (
    [
      "findMany",
      "findFirst",
      "findFirstOrThrow",
      "findUnique",
      "findUniqueOrThrow",
      "count",
      "aggregate",
      "groupBy",
    ].includes(params.action)
  ) {
    params.args.where = activeWhere(params.model, params.args.where);
    if (params.action === "findUnique") params.action = "findFirst";
    if (params.action === "findUniqueOrThrow")
      params.action = "findFirstOrThrow";
  }
  if (
    ["delete", "deleteMany"].includes(params.action) &&
    archivedModels.has(params.model)
  ) {
    params.action = params.action === "delete" ? "update" : "updateMany";
    params.args.where = { ...params.args.where, deletedAt: null };
    params.args.data = { deletedAt: new Date() };
  }
  if (
    ["update", "updateMany"].includes(params.action) &&
    !Object.hasOwn(params.args.data ?? {}, "deletedAt")
  ) {
    const guard = activeWhere(params.model);
    // Retain unique fields at the top level for Prisma's extended unique filters.
    params.args.where = {
      ...params.args.where,
      AND: [
        ...(Array.isArray(params.args.where?.AND)
          ? params.args.where.AND
          : params.args.where?.AND ? [params.args.where.AND] : []),
        guard,
      ],
    };
  }
  relationReads(params.model, params.args);
  return next(params);
};
