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

const UuidSchema = z.uuid();

export const ProductSchema = z.object({
  id: UuidSchema,
  name: z.string().trim().min(1),
  barcode: z.string().optional(),
  category: z.string().trim().min(1),
  brand: z.string().optional(),
  defaultUnit: z.string().min(1),
  imageUrl: z.url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

export const BatchStatusSchema = z.enum(["active", "sold", "discarded", "returned"]);
export type BatchStatus = z.infer<typeof BatchStatusSchema>;

export const BatchSchema = z.object({
  id: UuidSchema,
  productId: UuidSchema,
  expiryDate: ExpiryDateSchema,
  quantity: z.number().finite().nonnegative(),
  unit: z.string().min(1),
  mfgDate: ExpiryDateSchema.optional(),
  batchNo: z.string().optional(),
  costPrice: z.number().finite().nonnegative().optional(),
  mrp: z.number().finite().nonnegative().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  status: BatchStatusSchema,
  statusChangedAt: z.date().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});
export type Batch = z.infer<typeof BatchSchema>;

export const BatchWithProductSchema = BatchSchema.extend({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
});
export type BatchWithProduct = z.infer<typeof BatchWithProductSchema>;

export const CategorySchema = z.object({
  id: UuidSchema,
  name: z.string().trim().min(1),
  alertDays: z.number().int().nonnegative(),
  icon: z.string().min(1),
  color: z.string().min(1),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});
export type Category = z.infer<typeof CategorySchema>;

export const ReminderKindSchema = z.enum(["expiry", "daily_digest"]);

export const ReminderLogEntrySchema = z.object({
  id: UuidSchema,
  batchId: UuidSchema,
  kind: ReminderKindSchema,
  firedAt: z.date(),
});
export type ReminderLogEntry = z.infer<typeof ReminderLogEntrySchema>;

export const EventTypeSchema = z.enum(["created", "edited", "sold", "discarded", "returned"]);

export const EventSchema = z.object({
  id: UuidSchema,
  batchId: UuidSchema,
  type: EventTypeSchema,
  at: z.date(),
  qty: z.number().finite().nonnegative(),
});
export type Event = z.infer<typeof EventSchema>;

const SettingValueSchema = z.discriminatedUnion("key", [
  z.object({
    key: z.literal("notifyTime"),
    value: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  }),
  z.object({ key: z.literal("language"), value: z.enum(["en", "hinglish", "hi"]) }),
  z.object({ key: z.literal("theme"), value: z.enum(["light", "dark", "system"]) }),
  z.object({ key: z.literal("defaultAlertDays"), value: z.number().int().nonnegative() }),
  z.object({ key: z.literal("lastDigestDate"), value: ExpiryDateSchema }),
  z.object({
    key: z.literal("categoryThresholds"),
    value: z.record(z.string(), ExpiryThresholdOverridesSchema),
  }),
]);

export const SettingSchema = z.discriminatedUnion("key", [
  z.object({
    key: z.literal("notifyTime"),
    value: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    updatedAt: z.date(),
  }),
  z.object({
    key: z.literal("language"),
    value: z.enum(["en", "hinglish", "hi"]),
    updatedAt: z.date(),
  }),
  z.object({
    key: z.literal("theme"),
    value: z.enum(["light", "dark", "system"]),
    updatedAt: z.date(),
  }),
  z.object({
    key: z.literal("defaultAlertDays"),
    value: z.number().int().nonnegative(),
    updatedAt: z.date(),
  }),
  z.object({
    key: z.literal("lastDigestDate"),
    value: ExpiryDateSchema,
    updatedAt: z.date(),
  }),
  z.object({
    key: z.literal("categoryThresholds"),
    value: z.record(z.string(), ExpiryThresholdOverridesSchema),
    updatedAt: z.date(),
  }),
]);
export type Setting = z.infer<typeof SettingSchema>;
export type SettingKey = Setting["key"];
export type SettingValue<Key extends SettingKey> = Extract<Setting, { key: Key }>["value"];

export const SettingInputSchema = SettingValueSchema;
export type SettingInput = z.infer<typeof SettingInputSchema>;
