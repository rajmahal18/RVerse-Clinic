export const APP_TIME_ZONE = "Asia/Manila";

export function getDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export function formatDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function formatDateTimeWithZone(value: Date) {
  return `${formatDateTime(value)} PHT`;
}

export function formatDateGroupLabel(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

export function formatDisplayDate(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

export function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(value);
}

export function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(value);
}

export function getDayRange(date = new Date()) {
  const { year, month, day } = getDateParts(date);
  const start = new Date(Date.UTC(year, month - 1, day, -8, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export function getDateInputRange(dateKey: string) {
  const parsed = parseAppDateInput(dateKey);
  return getDayRange(parsed);
}

export function shiftDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addMonths(value: Date, months: number) {
  const { year, month, day } = getDateParts(value);
  return new Date(Date.UTC(year, month - 1 + months, day, 15, 59, 59, 999));
}

export function calculateAgeInAppTimeZone(birthDate: Date, asOf = new Date()) {
  const birth = getDateParts(birthDate);
  const current = getDateParts(asOf);
  let age = current.year - birth.year;
  const monthDifference = current.month - birth.month;

  if (monthDifference < 0 || (monthDifference === 0 && current.day < birth.day)) {
    age -= 1;
  }

  return age;
}

export function getMonthRange(month?: string) {
  const monthPattern = /^\d{4}-\d{2}$/;
  const current = getDateParts(new Date());
  const [year, monthNumber] = month && monthPattern.test(month)
    ? month.split("-").map(Number)
    : [current.year, current.month];
  const start = new Date(Date.UTC(year, monthNumber - 1, 1, -8, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNumber, 1, -8, 0, 0, 0));

  return {
    start,
    end,
    key: `${year}-${String(monthNumber).padStart(2, "0")}`,
    label: formatMonthLabel(start),
  };
}

export function parseAppDateInput(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number);
    return new Date(Date.UTC(year, month - 1, day, -8, 0, 0, 0));
  }

  const dateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (dateTime) {
    const [, year, month, day, hour, minute] = dateTime.map(Number);
    return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0));
  }

  return new Date(value);
}
