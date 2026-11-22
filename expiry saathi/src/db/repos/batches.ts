import { z } from "zod";
import {
  BatchSchema,
  BatchStatusSchema,
  BatchWithProductSchema,
  EventSchema,
  type Batch,
  type BatchStatus,
  type BatchWithProduct,
  type Product,
} from "../../domain/types";
import { createId } from "../../lib/id";
import { requestPersistentStorageAfterFirstSave } from "../../lib/persist";
import { db, type ExpirySaathiDatabase } from "../schema";

const BatchCreateSchema = BatchSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({ status: BatchStatusSchema.default("active") });

const BatchUpdateSchema = BatchSchema.omit({
  id: true,
  productId: true,
  status: true,
  statusChangedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
})
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, "At least one batch field must be updated");

const BatchIdSchema = z.uuid();

export interface BatchListFilters {
  status?: BatchStatus;
  category?: string;
  search?: string;
  includeDeleted?: boolean;
}

const eventTypeByStatus = {
  sold: "sold",
  discarded: "discarded",
  returned: "returned",
} as const;

export function createBatchesRepository(database: ExpirySaathiDatabase = db) {
  async function getBatchById(
    id: string,
    { includeDeleted = false }: { includeDeleted?: boolean } = {},
  ): Promise<Batch | undefined> {
    const batch = await database.batches.get(BatchIdSchema.parse(id));
    return batch && (includeDeleted || !batch.deletedAt) ? batch : undefined;
  }

  async function listBatchRows({ status, includeDeleted = false }: BatchListFilters = {}): Promise<
    Batch[]
  > {
    const batches = status
      ? await database.batches.where("status").equals(status).toArray()
      : await database.batches.toArray();
    return includeDeleted ? batches : batches.filter((batch) => !batch.deletedAt);
  }

  async function addEvent(batchId: string, type: "created" | "edited" | BatchStatus, qty: number) {
    const eventType = type === "active" ? "created" : type;
    const event = EventSchema.parse({
      id: createId(),
      batchId,
      type: eventType,
      at: new Date(),
      qty,
    });
    await database.events.add(event);
  }

  return {
    async create(input: unknown): Promise<Batch> {
      const values = BatchCreateSchema.parse(input);
      const now = new Date();
      const batch = BatchSchema.parse({
        ...values,
        id: createId(),
        createdAt: now,
        updatedAt: now,
      });

      await database.transaction(
        "rw",
        database.products,
        database.batches,
        database.events,
        async () => {
          const product = await database.products.get(batch.productId);
          if (!product || product.deletedAt) {
            throw new Error(`Active product "${batch.productId}" was not found.`);
          }
          await database.batches.add(batch);
          await addEvent(batch.id, "created", batch.quantity);
        },
      );
      await requestPersistentStorageAfterFirstSave();
      return batch;
    },

    async update(id: string, input: unknown): Promise<Batch> {
      const batchId = BatchIdSchema.parse(id);
      const values = BatchUpdateSchema.parse(input);

      const updated = await database.transaction(
        "rw",
        database.batches,
        database.events,
        async () => {
          const current = await getBatchById(batchId);
          if (!current) {
            throw new Error(`Active batch "${batchId}" was not found.`);
          }

          const next = BatchSchema.parse({ ...current, ...values, updatedAt: new Date() });
          await database.batches.put(next);
          await addEvent(next.id, "edited", next.quantity);
          return next;
        },
      );
      await requestPersistentStorageAfterFirstSave();
      return updated;
    },

    getById: getBatchById,

    list: listBatchRows,

    async listWithProduct({
      status,
      category,
      search,
      includeDeleted = false,
    }: BatchListFilters = {}): Promise<BatchWithProduct[]> {
      const batches = await listBatchRows({ status, includeDeleted });
      const products = await database.products.bulkGet([
        ...new Set(batches.map((batch) => batch.productId)),
      ]);
      const productsById = new Map<string, Product>();
      const deletedProductIds = new Set<string>();
      for (const product of products) {
        if (!product) {
          continue;
        }
        if (product.deletedAt && !includeDeleted) {
          deletedProductIds.add(product.id);
        } else {
          productsById.set(product.id, product);
        }
      }
      const normalizedSearch = search?.trim().toLocaleLowerCase();
      const joined: BatchWithProduct[] = [];

      for (const batch of batches) {
        const product = productsById.get(batch.productId);
        if (!product) {
          if (deletedProductIds.has(batch.productId)) {
            continue;
          }
          throw new Error(`Missing product "${batch.productId}" for batch "${batch.id}".`);
        }
        if (category && product.category !== category) {
          continue;
        }
        if (
          normalizedSearch &&
          ![product.name, product.brand, product.barcode, batch.batchNo, batch.supplier].some(
            (field) => field?.toLocaleLowerCase().includes(normalizedSearch),
          )
        ) {
          continue;
        }

        joined.push(
          BatchWithProductSchema.parse({
            ...batch,
            name: product.name,
            category: product.category,
          }),
        );
      }

      return joined;
    },

    async listForProduct(productId: string, includeDeleted = false): Promise<Batch[]> {
      const validProductId = z.uuid().parse(productId);
      const batches = await database.batches.where("productId").equals(validProductId).toArray();
      return includeDeleted ? batches : batches.filter((batch) => !batch.deletedAt);
    },

    async softDelete(id: string): Promise<Batch> {
      const batchId = BatchIdSchema.parse(id);
      const current = await getBatchById(batchId, { includeDeleted: true });
      if (!current) {
        throw new Error(`Batch "${batchId}" was not found.`);
      }
      if (current.deletedAt) {
        return current;
      }

      const now = new Date();
      const deleted = BatchSchema.parse({ ...current, deletedAt: now, updatedAt: now });
      await database.batches.put(deleted);
      await requestPersistentStorageAfterFirstSave();
      return deleted;
    },

    async restore(id: string): Promise<Batch> {
      const batchId = BatchIdSchema.parse(id);
      const current = await getBatchById(batchId, { includeDeleted: true });
      if (!current) {
        throw new Error(`Batch "${batchId}" was not found.`);
      }
      if (!current.deletedAt) {
        return current;
      }

      const restoredValues = { ...current };
      delete restoredValues.deletedAt;
      const restored = BatchSchema.parse({ ...restoredValues, updatedAt: new Date() });
      await database.batches.put(restored);
      await requestPersistentStorageAfterFirstSave();
      return restored;
    },

    markSold: (id: string) => transitionBatch(id, "sold"),
    markDiscarded: (id: string) => transitionBatch(id, "discarded"),
    markReturned: (id: string) => transitionBatch(id, "returned"),
  };

  async function transitionBatch(
    id: string,
    status: keyof typeof eventTypeByStatus,
  ): Promise<Batch> {
    const batchId = BatchIdSchema.parse(id);
    const updated = await database.transaction(
      "rw",
      database.batches,
      database.events,
      async () => {
        const current = await getBatchById(batchId);
        if (!current) {
          throw new Error(`Active batch "${batchId}" was not found.`);
        }
        if (current.status !== "active") {
          throw new Error(`Batch "${batchId}" is already ${current.status}.`);
        }

        const now = new Date();
        const next = BatchSchema.parse({
          ...current,
          status,
          statusChangedAt: now,
          updatedAt: now,
        });
        await database.batches.put(next);
        await addEvent(next.id, eventTypeByStatus[status], current.quantity);
        return next;
      },
    );
    await requestPersistentStorageAfterFirstSave();
    return updated;
  }
}

const batchesRepository = createBatchesRepository();

export const createBatch = batchesRepository.create;
export const updateBatch = batchesRepository.update;
export const getBatchById = batchesRepository.getById;
export const listBatches = batchesRepository.list;
export const listBatchesWithProduct = batchesRepository.listWithProduct;
export const listBatchesForProduct = batchesRepository.listForProduct;
export const softDeleteBatch = batchesRepository.softDelete;
export const restoreBatch = batchesRepository.restore;
export const markSold = batchesRepository.markSold;
export const markDiscarded = batchesRepository.markDiscarded;
export const markReturned = batchesRepository.markReturned;
