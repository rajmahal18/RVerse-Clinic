import {
  formatDateKey,
  formatDisplayDate,
  getDateParts,
  getMonthRange,
  parseAppDateInput,
  shiftDays,
} from "@/lib/date-time";

export const reportPeriods = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "all-time",
] as const;
export type ReportPeriod = (typeof reportPeriods)[number];
export type ReportRange = {
  start: Date;
  end: Date;
  label: string;
  key: string;
  period: ReportPeriod;
};

export function accomplishmentRange(
  values: { period?: string; date?: string; month?: string; year?: string },
  now = new Date(),
): ReportRange {
  const period = values.period ?? "monthly";
  if (!reportPeriods.some((value) => value === period))
    throw new Error("Choose a valid report period.");
  if (period === "all-time")
    return {
      period,
      start: new Date(-8640000000000000),
      end: new Date(8640000000000000),
      label: "All time",
      key: "all-time",
    };
  if (period === "monthly") {
    if (
      values.month &&
      !/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(values.month)
    )
      throw new Error("Choose a valid report month (1900–2199).");
    return { ...getMonthRange(values.month), period };
  }
  if (period === "yearly") {
    const year = values.year ?? String(getDateParts(now).year);
    if (!/^(?:19|20|21)\d{2}$/.test(year))
      throw new Error("Choose a valid report year (1900–2199).");
    return {
      period,
      start: parseAppDateInput(`${year}-01-01`),
      end: parseAppDateInput(`${Number(year) + 1}-01-01`),
      label: year,
      key: year,
    };
  }
  const key = values.date ?? formatDateKey(now);
  if (!/^(?:19|20|21)\d{2}-\d{2}-\d{2}$/.test(key))
    throw new Error("Choose a valid report date (1900–2199).");
  const date = parseAppDateInput(key);
  if (!Number.isFinite(date.getTime()) || formatDateKey(date) !== key)
    throw new Error("Choose a valid report date.");
  if (period === "daily")
    return {
      period,
      start: date,
      end: shiftDays(date, 1),
      label: formatDisplayDate(date),
      key,
    };
  // Manila midnight is the preceding UTC day at 16:00. Shift to local date before finding Monday.
  const weekday = new Date(date.getTime() + 8 * 60 * 60 * 1000).getUTCDay();
  const start = shiftDays(date, -(weekday + 6) % 7);
  const end = shiftDays(start, 7);
  return {
    period: "weekly",
    start,
    end,
    label: `${formatDisplayDate(start)} – ${formatDisplayDate(shiftDays(end, -1))}`,
    key: formatDateKey(start),
  };
}
