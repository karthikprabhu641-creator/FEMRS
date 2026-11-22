import { addDays, addMonths, format, startOfDay } from "date-fns";

export type DatePreset = "month1" | "month3" | "month6" | "month12" | "days7";

const presetMonths: Partial<Record<DatePreset, number>> = {
  month1: 1,
  month3: 3,
  month6: 6,
  month12: 12,
};

export function getPresetExpiryDate(preset: DatePreset, from = new Date()): string {
  const day = startOfDay(from);
  const months = presetMonths[preset];
  const result = months === undefined ? addDays(day, 7) : addMonths(day, months);
  return format(result, "yyyy-MM-dd");
}
