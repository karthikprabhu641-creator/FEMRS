import { startOfDay } from "date-fns";
import {
  ExpiryDateSchema,
  ExpiryThresholdsSchema,
  type ExpiryDate,
  type ExpiryThresholdOverrides,
} from "./types";

export const DEFAULT_EXPIRY_THRESHOLDS = {
  criticalDays: 3,
  warningDays: 7,
  soonDays: 30,
} as const;

export type ExpiryStatus = "expired" | "today" | "critical" | "warning" | "soon" | "ok";

export interface ExpiryResult {
  status: ExpiryStatus;
  daysLeft: number;
}

const calendarDayNumber = (year: number, month: number, day: number): number => {
  const adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const adjustedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;

  return era * 146097 + dayOfEra;
};

export function getStatus(
  expiryDate: ExpiryDate,
  today: Date,
  thresholds: ExpiryThresholdOverrides = {},
): ExpiryResult {
  const validExpiryDate = ExpiryDateSchema.parse(expiryDate);
  const resolvedThresholds = ExpiryThresholdsSchema.parse({
    ...DEFAULT_EXPIRY_THRESHOLDS,
    ...thresholds,
  });
  const localToday = startOfDay(today);
  const todayYear = localToday.getFullYear();
  const todayMonth = localToday.getMonth() + 1;
  const todayDate = localToday.getDate();

  if (Number.isNaN(todayYear)) {
    throw new RangeError("today must be a valid date");
  }

  const [expiryYear, expiryMonth, expiryDay] = validExpiryDate.split("-").map(Number);
  const daysLeft =
    calendarDayNumber(expiryYear, expiryMonth, expiryDay) -
    calendarDayNumber(todayYear, todayMonth, todayDate);

  if (daysLeft < 0) {
    return { status: "expired", daysLeft };
  }
  if (daysLeft === 0) {
    return { status: "today", daysLeft };
  }
  if (daysLeft <= resolvedThresholds.criticalDays) {
    return { status: "critical", daysLeft };
  }
  if (daysLeft <= resolvedThresholds.warningDays) {
    return { status: "warning", daysLeft };
  }
  if (daysLeft <= resolvedThresholds.soonDays) {
    return { status: "soon", daysLeft };
  }
  return { status: "ok", daysLeft };
}
