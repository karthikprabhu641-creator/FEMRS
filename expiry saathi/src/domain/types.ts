import { z } from "zod";

const isLeapYear = (year: number): boolean => {
  if (year % 4 !== 0) {
    return false;
  }
  if (year % 100 !== 0) {
    return true;
  }
  return year % 400 === 0;
};

const isValidExpiryDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth =
    month === 2 ? (isLeapYear(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;

  return day <= daysInMonth;
};

export const ExpiryDateSchema = z
  .string()
  .refine(isValidExpiryDate, "Expected a valid calendar date in YYYY-MM-DD format");
export type ExpiryDate = z.infer<typeof ExpiryDateSchema>;

const ExpiryThresholdValuesSchema = z
  .object({
    criticalDays: z.number().int().nonnegative(),
    warningDays: z.number().int().nonnegative(),
    soonDays: z.number().int().nonnegative(),
  })
  .strict();

export const ExpiryThresholdsSchema = ExpiryThresholdValuesSchema.refine(
  ({ criticalDays, warningDays, soonDays }) =>
    criticalDays <= warningDays && warningDays <= soonDays,
  "Expiry thresholds must be in ascending order",
);
export type ExpiryThresholds = z.infer<typeof ExpiryThresholdsSchema>;

export const ExpiryThresholdOverridesSchema = ExpiryThresholdValuesSchema.partial().strict();
export type ExpiryThresholdOverrides = z.infer<typeof ExpiryThresholdOverridesSchema>;

export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  barcode: z.string().optional(),
  categoryId: z.string().min(1),
  brand: z.string().optional(),
  defaultUnit: z.string().min(1),
  imageUrl: z.url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

export const BatchStatusSchema = z.enum(["active", "sold", "discarded", "returned"]);

export const BatchSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  name: z.string().trim().min(1),
  categoryId: z.string().min(1),
  expiryDate: ExpiryDateSchema,
  quantity: z.number().finite().nonnegative(),
  unit: z.string().min(1),
  status: BatchStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});
export type Batch = z.infer<typeof BatchSchema>;

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  alertDays: z.number().int().nonnegative(),
  icon: z.string().min(1),
  color: z.string().min(1),
  thresholds: ExpiryThresholdOverridesSchema.optional(),
});
export type Category = z.infer<typeof CategorySchema>;

export const ReminderKindSchema = z.enum(["expiry", "daily_digest"]);

export const ReminderLogEntrySchema = z.object({
  id: z.string().min(1),
  batchId: z.string().min(1),
  kind: ReminderKindSchema,
  firedAt: z.date(),
});
export type ReminderLogEntry = z.infer<typeof ReminderLogEntrySchema>;
