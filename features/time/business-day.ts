import { addDays, formatISO, parseISO } from "date-fns";

export function businessDayKey(date: Date) {
  return formatISO(date, { representation: "date" });
}

export function nextBusinessDay(date: Date) {
  return addDays(date, 1);
}

export function coerceBusinessDay(input: string) {
  return parseISO(input);
}
