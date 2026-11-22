import { describe, expect, it } from "vitest";
import { DEFAULT_EXPIRY_THRESHOLDS, getStatus } from "./expiry";
import { sortByExpiry } from "./fifo";
import { EXPIRY_REMINDER_KIND, getDueReminders } from "./reminders";
import {
  BatchSchema,
  CategorySchema,
  ExpiryDateSchema,
  ExpiryThresholdOverridesSchema,
  ExpiryThresholdsSchema,
  ProductSchema,
  ReminderLogEntrySchema,
  type BatchWithProduct,
  type Category,
  type Product,
  type ReminderLogEntry,
} from "./types";

const productId = "00000000-0000-4000-8000-000000000001";
const batchId = "00000000-0000-4000-8000-000000000002";
const categoryId = "00000000-0000-4000-8000-000000000003";

const localDate = (year: number, month: number, day: number, hour = 12, minute = 0): Date =>
  new Date(year, month - 1, day, hour, minute);

const formatLocalDate = (date: Date): string =>
  [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const addDays = (date: Date, count: number): string => {
  const result = localDate(date.getFullYear(), date.getMonth() + 1, date.getDate() + count);
  return formatLocalDate(result);
};

const makeBatch = (overrides: Partial<BatchWithProduct> = {}): BatchWithProduct => ({
  id: batchId,
  productId,
  name: "Daal",
  category: "Pantry",
  expiryDate: "2024-01-04",
  quantity: 5,
  unit: "pack",
  status: "active",
  createdAt: localDate(2023, 1, 1),
  updatedAt: localDate(2023, 1, 1),
  ...overrides,
});

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: categoryId,
  name: "Pantry",
  alertDays: 3,
  icon: "box",
  color: "green",
  updatedAt: localDate(2023, 1, 1),
  ...overrides,
});

const makeReminder = (overrides: Partial<ReminderLogEntry> = {}): ReminderLogEntry => ({
  id: "00000000-0000-4000-8000-000000000004",
  batchId,
  kind: EXPIRY_REMINDER_KIND,
  firedAt: localDate(2024, 1, 1, 8),
  ...overrides,
});

describe("domain schemas", () => {
  it("accepts valid calendar dates including leap day", () => {
    expect(ExpiryDateSchema.parse("2024-02-29")).toBe("2024-02-29");
    expect(ExpiryDateSchema.parse("2024-01-31")).toBe("2024-01-31");
  });

  it("rejects malformed and impossible calendar dates", () => {
    for (const date of [
      "2024-2-09",
      "2024-00-01",
      "2024-13-01",
      "2024-01-00",
      "2024-04-31",
      "2023-02-29",
      "1900-02-29",
    ]) {
      expect(ExpiryDateSchema.safeParse(date).success).toBe(false);
    }

    expect(ExpiryDateSchema.parse("2000-02-29")).toBe("2000-02-29");
  });

  it("infers and validates product, batch, category, and reminder data", () => {
    const now = localDate(2024, 1, 1);
    const product: Product = {
      id: productId,
      name: "Daal",
      category: "Pantry",
      defaultUnit: "pack",
      createdAt: now,
      updatedAt: now,
    };
    const batch = makeBatch();
    const category = makeCategory();
    const reminder = makeReminder();

    expect(ProductSchema.safeParse(product).success).toBe(true);
    expect(BatchSchema.safeParse(batch).success).toBe(true);
    expect(CategorySchema.safeParse(category).success).toBe(true);
    expect(ReminderLogEntrySchema.safeParse(reminder).success).toBe(true);
    expect(ReminderLogEntrySchema.safeParse({ ...reminder, kind: "unknown" }).success).toBe(false);
    expect(BatchSchema.safeParse({ ...batch, expiryDate: "2024-02-30" }).success).toBe(false);
  });

  it("validates full thresholds and accepts partial category overrides", () => {
    expect(ExpiryThresholdsSchema.parse(DEFAULT_EXPIRY_THRESHOLDS)).toEqual({
      criticalDays: 3,
      warningDays: 7,
      soonDays: 30,
    });
    expect(ExpiryThresholdOverridesSchema.parse({ criticalDays: 5 })).toEqual({
      criticalDays: 5,
    });
    expect(
      ExpiryThresholdOverridesSchema.safeParse({ criticalDays: 5, extraDays: 6 }).success,
    ).toBe(false);
  });
});

describe("getStatus", () => {
  const today = localDate(2024, 1, 1);

  it.each([
    [-1, "expired"],
    [0, "today"],
    [1, "critical"],
    [3, "critical"],
    [4, "warning"],
    [7, "warning"],
    [8, "soon"],
    [30, "soon"],
    [31, "ok"],
  ] as const)("classifies an expiry %i calendar days away as %s", (days, status) => {
    const result = getStatus(addDays(today, days), today);

    expect(result).toEqual({ status, daysLeft: days });
  });

  it("uses defaults and lets a category threshold override the classification", () => {
    expect(DEFAULT_EXPIRY_THRESHOLDS).toEqual({
      criticalDays: 3,
      warningDays: 7,
      soonDays: 30,
    });
    expect(getStatus("2024-01-05", today)).toEqual({
      status: "warning",
      daysLeft: 4,
    });
    const categoryThresholds = { criticalDays: 5 };
    expect(getStatus("2024-01-05", today, categoryThresholds)).toEqual({
      status: "critical",
      daysLeft: 4,
    });
    expect(() => getStatus("2024-01-05", today, { criticalDays: 8, warningDays: 4 })).toThrow();
  });

  it("compares month ends, year ends, and leap day using local calendar dates", () => {
    expect(getStatus("2024-02-01", localDate(2024, 1, 31)).daysLeft).toBe(1);
    expect(getStatus("2024-01-01", localDate(2023, 12, 31)).daysLeft).toBe(1);
    expect(getStatus("2024-02-29", localDate(2024, 2, 28)).daysLeft).toBe(1);
    expect(getStatus("2024-03-01", localDate(2024, 2, 29)).daysLeft).toBe(1);
  });

  it("treats a late-night expiry date as today, and yesterday as expired", () => {
    expect(getStatus("2024-01-01", localDate(2024, 1, 1, 23, 59))).toEqual({
      status: "today",
      daysLeft: 0,
    });
    expect(getStatus("2023-12-31", localDate(2024, 1, 1))).toEqual({
      status: "expired",
      daysLeft: -1,
    });
  });

  it("rejects invalid expiry dates, today values, and unordered thresholds", () => {
    expect(() => getStatus("2024-02-30", today)).toThrow();
    expect(() => getStatus("2024-01-02", new Date(Number.NaN))).toThrow(RangeError);
    expect(() =>
      getStatus("2024-01-02", today, {
        criticalDays: 3,
        warningDays: 2,
        soonDays: 30,
      }),
    ).toThrow();
  });
});

describe("sortByExpiry", () => {
  it("sorts active batches by expiry, then quantity, then name", () => {
    const batches = [
      makeBatch({ id: "name-z", expiryDate: "2024-01-02", quantity: 2, name: "Zeera" }),
      makeBatch({ id: "later", expiryDate: "2024-01-03", quantity: 1, name: "Aata" }),
      makeBatch({ id: "quantity-large", expiryDate: "2024-01-02", quantity: 5, name: "Aata" }),
      makeBatch({ id: "name-a", expiryDate: "2024-01-02", quantity: 2, name: "Aata" }),
      makeBatch({ id: "quantity-small", expiryDate: "2024-01-02", quantity: 1, name: "Zeera" }),
    ];

    expect(sortByExpiry(batches).map(({ id }) => id)).toEqual([
      "quantity-small",
      "name-a",
      "name-z",
      "quantity-large",
      "later",
    ]);
    expect(batches[0]?.id).toBe("name-z");
  });

  it("excludes non-active and soft-deleted batches", () => {
    const batches = [
      makeBatch({ id: "sold", status: "sold" }),
      makeBatch({ id: "discarded", status: "discarded" }),
      makeBatch({ id: "returned", status: "returned" }),
      makeBatch({ id: "deleted", deletedAt: localDate(2024, 1, 1) }),
      makeBatch({ id: "active" }),
    ];

    expect(sortByExpiry(batches).map(({ id }) => id)).toEqual(["active"]);
    expect(sortByExpiry(batches, { includeInactive: true }).map(({ id }) => id)).toEqual([
      "sold",
      "discarded",
      "returned",
      "active",
    ]);
  });
});

describe("getDueReminders", () => {
  const today = localDate(2024, 1, 1, 23);
  const category = makeCategory({ alertDays: 3 });

  it("returns active, undeleted batches at or inside their category lead time", () => {
    const batches = [
      makeBatch({ id: "today", expiryDate: "2024-01-01" }),
      makeBatch({ id: "lead-time", expiryDate: "2024-01-04" }),
      makeBatch({ id: "too-early", expiryDate: "2024-01-05" }),
      makeBatch({ id: "expired", expiryDate: "2023-12-31" }),
      makeBatch({ id: "sold", status: "sold" }),
      makeBatch({ id: "deleted", deletedAt: localDate(2024, 1, 1) }),
    ];

    expect(getDueReminders(batches, [category], today, []).map(({ id }) => id)).toEqual([
      "today",
      "lead-time",
      "expired",
    ]);
  });

  it("uses the batch category alert threshold and rejects an unknown category", () => {
    const batches = [
      makeBatch({ id: "pantry", expiryDate: "2024-01-04", category: "Pantry" }),
      makeBatch({ id: "dairy", expiryDate: "2024-01-04", category: "Dairy" }),
    ];

    expect(
      getDueReminders(
        batches,
        [category, makeCategory({ id: "dairy", name: "Dairy", alertDays: 2 })],
        today,
        [],
      ).map(({ id }) => id),
    ).toEqual(["pantry"]);
    expect(() => getDueReminders([batches[0]!], [], today, [])).toThrow(
      'Missing category "Pantry" for batch "pantry"',
    );
    expect(() =>
      getDueReminders(
        [batches[0]!],
        [makeCategory({ deletedAt: localDate(2023, 12, 31) })],
        today,
        [],
      ),
    ).toThrow('Missing category "Pantry" for batch "pantry"');
  });

  it("skips a batch already reminded with the same kind on the local calendar day", () => {
    const batch = makeBatch({ id: batchId, expiryDate: "2024-01-02" });
    const reminderLog = [
      makeReminder({ firedAt: localDate(2024, 1, 1, 8) }),
      makeReminder({
        id: "other-kind",
        kind: "daily_digest",
        firedAt: localDate(2024, 1, 1, 9),
      }),
      makeReminder({
        id: "yesterday",
        firedAt: localDate(2023, 12, 31, 23),
      }),
    ];

    expect(getDueReminders([batch], [category], today, reminderLog)).toEqual([]);
    expect(getDueReminders([batch], [category], localDate(2024, 1, 2), reminderLog)).toEqual([
      batch,
    ]);
    expect(
      getDueReminders(
        [batch],
        [category],
        today,
        reminderLog.filter((entry) => entry.kind !== EXPIRY_REMINDER_KIND),
      ),
    ).toEqual([batch]);
  });
});
