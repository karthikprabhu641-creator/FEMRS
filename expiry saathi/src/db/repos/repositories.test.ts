import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBatchesRepository } from "./batches";
import { createCategoriesRepository } from "./categories";
import { createEventsRepository } from "./events";
import { createProductsRepository } from "./products";
import { createSettingsRepository } from "./settings";
import { DATABASE_NAME, ExpirySaathiDatabase } from "../schema";
import { DATABASE_STORES, DATABASE_VERSION } from "../migrations";
import type { Product } from "../../domain/types";

const productId = "00000000-0000-4000-8000-000000000001";

const productInput = {
  name: "Parle-G Biscuits",
  category: "Biscuits",
  defaultUnit: "pack",
};

const batchInput = {
  expiryDate: "2027-01-15",
  quantity: 12,
  unit: "pack",
};

const categoryInput = {
  name: "Biscuits",
  alertDays: 30,
  icon: "cookie",
  color: "amber",
};

const testDatabaseName = `${DATABASE_NAME}-tests`;
const migrationDatabaseName = `${DATABASE_NAME}-migration-test`;
let testDatabase: ExpirySaathiDatabase;

beforeEach(() => {
  testDatabase = new ExpirySaathiDatabase(testDatabaseName);
});

afterEach(async () => {
  testDatabase.close();
  await testDatabase.delete();
  await Dexie.delete(migrationDatabaseName);
});

async function openVersionOneAndUpgradeForTest(): Promise<Product> {
  const versionOneDatabase = new ExpirySaathiDatabase(migrationDatabaseName);
  const created = await createProductsRepository(versionOneDatabase).create(productInput);
  versionOneDatabase.close();

  const versionTwoDatabase = new Dexie(migrationDatabaseName);
  versionTwoDatabase.version(DATABASE_VERSION).stores(DATABASE_STORES);
  versionTwoDatabase
    .version(DATABASE_VERSION + 1)
    .stores(DATABASE_STORES)
    .upgrade(async (transaction) => {
      await transaction
        .table("products")
        .toCollection()
        .modify((product: Product) => {
          product.brand = "migration-tested";
        });
    });

  try {
    await versionTwoDatabase.open();
    const migrated = await versionTwoDatabase.table<Product>("products").get(created.id);
    if (!migrated) {
      throw new Error("The test-only migration did not preserve the version 1 product.");
    }
    return migrated;
  } finally {
    versionTwoDatabase.close();
  }
}

describe("products repository", () => {
  it("creates, updates, soft-deletes, filters, and restores products", async () => {
    const repository = createProductsRepository(testDatabase);
    const created = await repository.create(productInput);
    const updated = await repository.update(created.id, {
      brand: "Parle",
      barcode: "8901003010012",
    });

    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(updated).toMatchObject({
      name: productInput.name,
      brand: "Parle",
      barcode: "8901003010012",
    });
    expect((await repository.list({ search: "parle" })).map((product) => product.id)).toEqual([
      created.id,
    ]);

    await repository.softDelete(created.id);
    expect(await repository.getById(created.id)).toBeUndefined();
    expect(await repository.list()).toEqual([]);
    expect((await repository.list({ includeDeleted: true })).map((product) => product.id)).toEqual([
      created.id,
    ]);

    const restored = await repository.restore(created.id);
    expect(restored.deletedAt).toBeUndefined();
    expect(await repository.getById(created.id)).toEqual(restored);
  });

  it("rejects invalid input and malformed identifiers", async () => {
    const repository = createProductsRepository(testDatabase);
    await expect(repository.create({ ...productInput, name: " " })).rejects.toThrow();
    await expect(repository.getById("not-a-uuid")).rejects.toThrow();
  });
});

describe("batches repository", () => {
  it("creates and edits batches and writes matching history events", async () => {
    const products = createProductsRepository(testDatabase);
    const batches = createBatchesRepository(testDatabase);
    const events = createEventsRepository(testDatabase);
    const product = await products.create(productInput);

    const created = await batches.create({ ...batchInput, productId: product.id });
    expect(created.status).toBe("active");
    const edited = await batches.update(created.id, { quantity: 8, notes: "Front shelf" });
    expect(edited.quantity).toBe(8);
    expect(edited.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());

    expect((await events.listForBatch(created.id)).map(({ type, qty }) => ({ type, qty }))).toEqual(
      [
        { type: "created", qty: 12 },
        { type: "edited", qty: 8 },
      ],
    );
  });

  it("soft-deletes and restores batches and excludes deleted rows by default", async () => {
    const products = createProductsRepository(testDatabase);
    const batches = createBatchesRepository(testDatabase);
    const product = await products.create(productInput);
    const batch = await batches.create({ ...batchInput, productId: product.id });

    await batches.softDelete(batch.id);
    expect(await batches.getById(batch.id)).toBeUndefined();
    expect(await batches.list()).toEqual([]);
    expect(await batches.list({ includeDeleted: true })).toHaveLength(1);

    const restored = await batches.restore(batch.id);
    expect(restored.deletedAt).toBeUndefined();
    expect(await batches.getById(batch.id)).toEqual(restored);
  });

  it.each([
    ["markSold", "sold"],
    ["markDiscarded", "discarded"],
    ["markReturned", "returned"],
  ] as const)(
    "writes a %s event with the status change in one transaction",
    async (action, status) => {
      const products = createProductsRepository(testDatabase);
      const batches = createBatchesRepository(testDatabase);
      const events = createEventsRepository(testDatabase);
      const product = await products.create(productInput);
      const batch = await batches.create({ ...batchInput, productId: product.id });

      const updated = await batches[action](batch.id);
      expect(updated.status).toBe(status);
      expect(updated.statusChangedAt).toBeInstanceOf(Date);
      expect((await events.listForBatch(batch.id)).map(({ type }) => type)).toEqual([
        "created",
        status,
      ]);
      await expect(batches.markSold(batch.id)).rejects.toThrow("already");
      expect((await events.listForBatch(batch.id)).map(({ type }) => type)).toEqual([
        "created",
        status,
      ]);
    },
  );

  it("rolls back a batch status change if its event cannot be saved", async () => {
    const products = createProductsRepository(testDatabase);
    const batches = createBatchesRepository(testDatabase);
    const product = await products.create(productInput);
    const batch = await batches.create({ ...batchInput, productId: product.id });
    const eventAdd = vi
      .spyOn(testDatabase.events, "add")
      .mockRejectedValue(new Error("event write failed"));

    await expect(batches.markSold(batch.id)).rejects.toThrow("event write failed");
    eventAdd.mockRestore();
    expect((await batches.getById(batch.id))?.status).toBe("active");
  });

  it("joins product context and filters deleted products, categories, searches, and statuses", async () => {
    const products = createProductsRepository(testDatabase);
    const batches = createBatchesRepository(testDatabase);
    const product = await products.create(productInput);
    const batch = await batches.create({ ...batchInput, productId: product.id });

    expect(await batches.listWithProduct({ category: "Biscuits", search: "parle" })).toEqual([
      expect.objectContaining({ id: batch.id, name: product.name, category: "Biscuits" }),
    ]);
    expect(await batches.listWithProduct({ status: "sold" })).toEqual([]);
    await products.softDelete(product.id);
    expect(await batches.listWithProduct()).toEqual([]);
  });

  it("rejects batch creation when its product is missing or deleted", async () => {
    const products = createProductsRepository(testDatabase);
    const batches = createBatchesRepository(testDatabase);
    await expect(batches.create({ ...batchInput, productId })).rejects.toThrow("Active product");

    const product = await products.create(productInput);
    await products.softDelete(product.id);
    await expect(batches.create({ ...batchInput, productId: product.id })).rejects.toThrow(
      "Active product",
    );
  });

  it("reports orphaned stored batches rather than silently dropping them", async () => {
    const batches = createBatchesRepository(testDatabase);
    await testDatabase.batches.add({
      id: "00000000-0000-4000-8000-000000000005",
      productId,
      expiryDate: "2027-01-15",
      quantity: 1,
      unit: "pack",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(batches.listWithProduct()).rejects.toThrow(
      `Missing product "${productId}" for batch "00000000-0000-4000-8000-000000000005".`,
    );
  });
});

describe("categories repository", () => {
  it("creates, updates, soft-deletes, and restores categories", async () => {
    const repository = createCategoriesRepository(testDatabase);
    const category = await repository.create(categoryInput);
    const updated = await repository.update(category.id, { alertDays: 7 });
    expect(updated.alertDays).toBe(7);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(category.updatedAt.getTime());

    await repository.softDelete(category.id);
    expect(await repository.getById(category.id)).toBeUndefined();
    expect(await repository.list()).toEqual([]);
    expect(await repository.list({ includeDeleted: true })).toHaveLength(1);

    const restored = await repository.restore(category.id);
    expect(restored.deletedAt).toBeUndefined();
    expect(await repository.getById(category.id)).toEqual(restored);
  });

  it("rejects duplicate category names and invalid settings", async () => {
    const repository = createCategoriesRepository(testDatabase);
    await repository.create(categoryInput);
    await expect(repository.create(categoryInput)).rejects.toThrow("already exists");
    await expect(repository.update("not-a-uuid", { name: "Other" })).rejects.toThrow();
  });

  it("renames linked products atomically and prevents deleting an in-use category", async () => {
    const categories = createCategoriesRepository(testDatabase);
    const products = createProductsRepository(testDatabase);
    const category = await categories.create(categoryInput);
    const product = await products.create(productInput);

    await categories.update(category.id, { name: "Snacks" });
    expect((await products.getById(product.id))?.category).toBe("Snacks");
    await expect(categories.softDelete(category.id)).rejects.toThrow("in use by products");
  });
});

describe("settings repository", () => {
  it("validates and stores typed settings with updated timestamps", async () => {
    const repository = createSettingsRepository(testDatabase);
    const setting = await repository.set({ key: "notifyTime", value: "08:30" });
    expect(setting).toMatchObject({ key: "notifyTime", value: "08:30" });
    expect(setting.updatedAt).toBeInstanceOf(Date);

    const updated = await repository.set({ key: "notifyTime", value: "09:15" });
    expect(updated.value).toBe("09:15");
    expect(await repository.get("notifyTime")).toEqual(updated);
    expect(await repository.list()).toEqual([updated]);
    await expect(repository.set({ key: "notifyTime", value: "25:90" })).rejects.toThrow();
  });
});

describe("events repository", () => {
  it("validates and reads immutable batch history", async () => {
    const repository = createEventsRepository(testDatabase);
    const event = await repository.add({
      batchId: productId,
      type: "created",
      qty: 4,
    });

    expect(event.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(await repository.getById(event.id)).toEqual(event);
    expect(await repository.listForBatch(productId)).toEqual([event]);
    expect(await repository.list()).toEqual([event]);
    await expect(repository.add({ batchId: productId, type: "unknown", qty: 1 })).rejects.toThrow();
  });
});

describe("database persistence and migrations", () => {
  it("retains saved records after closing and reopening the database", async () => {
    const firstDatabase = testDatabase;
    const products = createProductsRepository(firstDatabase);
    const created = await products.create(productInput);
    firstDatabase.close();

    const reopenedDatabase = new ExpirySaathiDatabase(testDatabaseName);
    const reopenedProducts = createProductsRepository(reopenedDatabase);
    expect(await reopenedProducts.getById(created.id)).toEqual(created);
    reopenedDatabase.close();
  });

  it("uses a test-only newer version to exercise the production migration path", async () => {
    await expect(openVersionOneAndUpgradeForTest()).resolves.toMatchObject({
      brand: "migration-tested",
    });
  });
});
