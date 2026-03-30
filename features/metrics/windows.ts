import type { MetricWindow, MetricWindowRange } from "./types";

function parseBusinessDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toBusinessDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function endOfUtcMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
}

function startOfUtcYear(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
}

function endOfUtcYear(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), 11, 31));
}

function startOfUtcWeek(value: Date) {
  const day = value.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addUtcDays(value, offset);
}

export function getMetricWindowRange(
  windowType: MetricWindow,
  anchorBusinessDate: string,
): MetricWindowRange {
  const anchor = parseBusinessDate(anchorBusinessDate);

  if (windowType === "DAILY") {
    return {
      windowType,
      windowStart: anchorBusinessDate,
      windowEnd: anchorBusinessDate,
    };
  }

  if (windowType === "WEEKLY") {
    const start = startOfUtcWeek(anchor);
    return {
      windowType,
      windowStart: toBusinessDate(start),
      windowEnd: toBusinessDate(addUtcDays(start, 6)),
    };
  }

  if (windowType === "MONTHLY") {
    return {
      windowType,
      windowStart: toBusinessDate(startOfUtcMonth(anchor)),
      windowEnd: toBusinessDate(endOfUtcMonth(anchor)),
    };
  }

  return {
    windowType,
    windowStart: toBusinessDate(startOfUtcYear(anchor)),
    windowEnd: toBusinessDate(endOfUtcYear(anchor)),
  };
}

export function isBusinessDateInWindow(
  businessDate: string,
  range: Pick<MetricWindowRange, "windowStart" | "windowEnd">,
) {
  return businessDate >= range.windowStart && businessDate <= range.windowEnd;
}
