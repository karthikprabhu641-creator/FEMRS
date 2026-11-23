import "fake-indexeddb/auto";
import { addDays, format, startOfDay } from "date-fns";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStatus } from "../domain/expiry";
import { createBatchesRepository } from "../db/repos/batches";
import { createCategoriesRepository } from "../db/repos/categories";
import { createProductsRepository } from "../db/repos/products";
import { createSettingsRepository } from "../db/repos/settings";
import { seedDemoData } from "../db/seed";
import { db } from "../db/schema";
import { useBatches } from "./useBatches";
import { useDashboard } from "./useDashboard";
import { useSettings } from "./useSettings";

const categoryInput = {
  name: "Biscuits",
  alertDays: 7,
  icon: "cookie",
  color: "amber",
};

const expiryIn = (days: number): string =>
  format(addDays(startOfDay(new Date()), days), "yyyy-MM-dd");

beforeEach(async () => {
  db.close();
  await db.open();
  await Promise.all([
    db.products.clear(),
    db.batches.clear(),
    db.categories.clear(),
    db.settings.clear(),
    db.reminderLog.clear(),
    db.events.clear(),
  ]);
});

afterEach(() => {
  db.close();
});

describe("database hooks", () => {
  it("creates the opt-in development seed of twelve shop products and batches", async () => {
    await expect(seedDemoData()).resolves.toEqual({ products: 12, batches: 12 });
    expect(await db.products.count()).toBe(12);
    expect(await db.batches.count()).toBe(12);
    expect(await db.categories.count()).toBe(6);

    const seededBatches = await db.batches.toArray();
    const daysLeft = seededBatches.map((batch) => getStatus(batch.expiryDate, new Date()).daysLeft);
    expect(Math.min(...daysLeft)).toBe(-1);
    expect(Math.max(...daysLeft)).toBe(240);
  });

  it("subscribes to product filters and returns FIFO-sorted batch views", async () => {
    const categories = createCategoriesRepository();
    const products = createProductsRepository();
    const batches = createBatchesRepository();
    await categories.create(categoryInput);
    const parle = await products.create({
      name: "Parle-G",
      category: "Biscuits",
      defaultUnit: "pack",
    });
    const goodDay = await products.create({
      name: "Good Day Cookies",
      category: "Biscuits",
      defaultUnit: "pack",
    });
    const milk = await products.create({
      name: "Toned Milk",
      category: "Dairy",
      defaultUnit: "bottle",
    });
    const lateBatch = await batches.create({
      productId: parle.id,
      expiryDate: expiryIn(7),
      quantity: 5,
      unit: "pack",
    });
    const earlyBatch = await batches.create({
      productId: goodDay.id,
      expiryDate: expiryIn(2),
      quantity: 2,
      unit: "pack",
    });
    const otherCategoryBatch = await batches.create({
      productId: milk.id,
      expiryDate: expiryIn(1),
      quantity: 1,
      unit: "bottle",
    });
    await batches.markSold(lateBatch.id);

    const { result } = renderHook(() =>
      useBatches({ status: "active", category: "Biscuits", search: "cookie" }),
    );
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current?.[0]).toMatchObject({
      id: earlyBatch.id,
      name: "Good Day Cookies",
      category: "Biscuits",
    });

    const sold = renderHook(() => useBatches({ status: "sold" }));
    await waitFor(() => expect(sold.result.current).toHaveLength(1));
    expect(sold.result.current?.[0]?.id).toBe(lateBatch.id);
    expect(sold.result.current?.some(({ id }) => id === otherCategoryBatch.id)).toBe(false);
  });

  it("returns expiry counts and FIFO lists with per-category status thresholds", async () => {
    const categories = createCategoriesRepository();
    const products = createProductsRepository();
    const batches = createBatchesRepository();
    const settings = createSettingsRepository();
    const category = await categories.create(categoryInput);
    const product = await products.create({
      name: "Parle-G",
      category: category.name,
      defaultUnit: "pack",
    });
    const offsets = [-1, 0, 1, 7, 30, 31] as const;
    const savedBatches = [];

    for (const [index, offset] of offsets.entries()) {
      savedBatches.push(
        await batches.create({
          productId: product.id,
          expiryDate: expiryIn(offset),
          quantity: offsets.length - index,
          unit: "pack",
        }),
      );
    }
    await settings.set({
      key: "categoryThresholds",
      value: { [category.id]: { criticalDays: 5 } },
    });

    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current?.expired.count).toBe(1));

    expect(result.current?.today.count).toBe(1);
    expect(result.current?.next7Days.count).toBe(2);
    expect(result.current?.next30Days.count).toBe(3);
    expect(result.current?.next7Days.items.map(({ id }) => id)).toEqual([
      savedBatches[2]?.id,
      savedBatches[3]?.id,
    ]);
    expect(result.current?.next7Days.items[0]?.expiryStatus).toBe("critical");
  });

  it("reactively exposes stored settings", async () => {
    const settings = createSettingsRepository();
    await settings.set({ key: "theme", value: "dark" });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current?.[0]).toMatchObject({ key: "theme", value: "dark" });

    await settings.set({ key: "language", value: "en" });
    await waitFor(() => expect(result.current).toHaveLength(2));
  });
});
