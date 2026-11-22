import { startOfDay } from "date-fns";
import { getStatus } from "./expiry";
import type { BatchWithProduct, Category, ReminderLogEntry } from "./types";

export const EXPIRY_REMINDER_KIND = "expiry" as const;

const isSameLocalDay = (first: Date, second: Date): boolean => {
  const firstDay = startOfDay(first);
  const secondDay = startOfDay(second);

  return (
    firstDay.getFullYear() === secondDay.getFullYear() &&
    firstDay.getMonth() === secondDay.getMonth() &&
    firstDay.getDate() === secondDay.getDate()
  );
};

export function getDueReminders(
  batches: readonly BatchWithProduct[],
  categories: readonly Category[],
  today: Date,
  reminderLog: readonly ReminderLogEntry[],
): BatchWithProduct[] {
  return batches.filter((batch) => {
    if (batch.status !== "active" || batch.deletedAt) {
      return false;
    }

    const category = categories.find(
      (candidate) => candidate.name === batch.category && !candidate.deletedAt,
    );
    if (!category) {
      throw new Error(`Missing category "${batch.category}" for batch "${batch.id}"`);
    }

    const { daysLeft } = getStatus(batch.expiryDate, today);
    if (daysLeft > category.alertDays) {
      return false;
    }

    return !reminderLog.some(
      (entry) =>
        entry.batchId === batch.id &&
        entry.kind === EXPIRY_REMINDER_KIND &&
        isSameLocalDay(entry.firedAt, today),
    );
  });
}
