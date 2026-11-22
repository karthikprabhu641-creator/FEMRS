import { startOfDay } from "date-fns";
import { getStatus } from "./expiry";
import type { Batch, Category, ReminderLogEntry } from "./types";

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
  batches: readonly Batch[],
  categories: readonly Category[],
  today: Date,
  reminderLog: readonly ReminderLogEntry[],
): Batch[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return batches.filter((batch) => {
    if (batch.status !== "active" || batch.deletedAt) {
      return false;
    }

    const category = categoriesById.get(batch.categoryId);
    if (!category) {
      throw new Error(`Missing category "${batch.categoryId}" for batch "${batch.id}"`);
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
