type ShiftWindow = {
  timezone: string;
  startLocal: string;
  endLocal: string;
  crossesMidnight: boolean;
};

function getLocalParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: lookup.year ?? "0000",
    month: lookup.month ?? "01",
    day: lookup.day ?? "01",
    hour: lookup.hour ?? "00",
    minute: lookup.minute ?? "00",
    second: lookup.second ?? "00",
  };
}

export function getDateStringForTimeZone(date: Date, timezone: string) {
  const local = getLocalParts(date, timezone);
  return `${local.year}-${local.month}-${local.day}`;
}

function compareLocalTime(left: string, right: string) {
  return left.localeCompare(right);
}

export function getBusinessDateForShift(now: Date, shift: ShiftWindow) {
  const local = getLocalParts(now, shift.timezone);
  const localDate = getDateStringForTimeZone(now, shift.timezone);
  const localTime = `${local.hour}:${local.minute}:${local.second}`;

  if (shift.crossesMidnight && compareLocalTime(localTime, shift.endLocal) < 0) {
    const previousDay = new Date(`${localDate}T00:00:00.000Z`);
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);
    return previousDay.toISOString().slice(0, 10);
  }

  return localDate;
}

export function parseNumericInput(input: string) {
  return Number.parseFloat(input);
}
