export type DateParts = {
  year: number;
  month: number;
  day: number;
};

export type ZonedParts = DateParts & {
  hour: number;
  minute: number;
  second: number;
};

export type Period = "day" | "week" | "month";

export function isValidTimeZone(timeZone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const zoned = getZonedParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  return zonedAsUtc - date.getTime();
}

export function zonedDateTimeToUtc(
  parts: DateParts & { hour?: number; minute?: number; second?: number },
  timeZone: string,
) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  const first = new Date(utcGuess - timeZoneOffsetMs(new Date(utcGuess), timeZone));
  const secondOffset = timeZoneOffsetMs(first, timeZone);
  return new Date(utcGuess - secondOffset);
}

export function parseDateISO(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function formatDateISO(parts: DateParts) {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function addDays(parts: DateParts, days: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function addMonths(parts: DateParts, months: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: 1,
  };
}

export function startOfWeek(parts: DateParts, weekStartsOn: number): DateParts {
  const weekday = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  ).getUTCDay();
  const diff = (weekday - weekStartsOn + 7) % 7;
  return addDays(parts, -diff);
}

export function parsePeriod(value: string | undefined): Period {
  if (value === "day" || value === "week" || value === "month") return value;
  return "week";
}

export function periodRange(
  anchor: DateParts,
  period: Period,
  weekStartsOn: number,
  timeZone: string,
) {
  // Callers sometimes pass a zoned timestamp. The period starts at midnight
  // on the calendar date, not at the current hour.
  const anchorDate = { year: anchor.year, month: anchor.month, day: anchor.day };
  let startParts: DateParts;
  let endParts: DateParts;
  if (period === "day") {
    startParts = anchorDate;
    endParts = addDays(anchorDate, 1);
  } else if (period === "week") {
    startParts = startOfWeek(anchorDate, weekStartsOn);
    endParts = addDays(startParts, 7);
  } else {
    startParts = { year: anchorDate.year, month: anchorDate.month, day: 1 };
    endParts = addMonths(startParts, 1);
  }
  return {
    start: zonedDateTimeToUtc(startParts, timeZone),
    end: zonedDateTimeToUtc(endParts, timeZone),
    startParts,
    endParts: addDays(endParts, -1),
  };
}

export function shiftAnchor(anchor: DateParts, period: Period, direction: -1 | 1) {
  if (period === "day") return addDays(anchor, direction);
  if (period === "week") return addDays(anchor, direction * 7);
  return addMonths(anchor, direction);
}

function utcCalendarDate(parts: DateParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function formatDayLabel(parts: DateParts) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcCalendarDate(parts));
}

export function formatMonthLabel(parts: DateParts) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcCalendarDate(parts));
}

export function formatShortDate(parts: DateParts) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcCalendarDate(parts));
}

export function formatPeriodLabel(
  period: Period,
  start: DateParts,
  endInclusive: DateParts,
) {
  if (period === "day") return formatDayLabel(start);
  if (period === "month") return formatMonthLabel(start);
  return `${formatShortDate(start)} – ${formatShortDate(endInclusive)}`;
}

export function formatDateTime(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");
  return `${formatDateISO(parts)} ${hour}:${minute}`;
}

export function toDateInputValue(date: Date, timeZone: string) {
  return formatDateISO(getZonedParts(date, timeZone));
}

export function toTimeInputValue(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function parseClock(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function secondsBetween(startedAt: Date, endedAt: Date) {
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
}

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return [hours, minutes, secs]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function formatHoursMinutes(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function decimalHours(seconds: number) {
  return (Math.max(0, seconds) / 3600).toFixed(2);
}

export function amountCents(seconds: number, hourlyRateCents: number) {
  return Math.round((Math.max(0, seconds) / 3600) * hourlyRateCents);
}

export function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatRate(cents: number) {
  return (cents / 100).toFixed(2);
}
