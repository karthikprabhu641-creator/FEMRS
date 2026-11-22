import { z } from "zod";
import { ProductSchema, type Product } from "../../domain/types";
import { createId } from "../../lib/id";
import { requestPersistentStorageAfterFirstSave } from "../../lib/persist";
import { db, type ExpirySaathiDatabase } from "../schema";

const ProductCreateSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).strict();

const ProductUpdateSchema = ProductCreateSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one product field must be updated",
);

const ProductIdSchema = z.uuid();

export interface ProductListFilters {
  category?: string;
  search?: string;
  includeDeleted?: boolean;
}

export function createProductsRepository(database: ExpirySaathiDatabase = db) {
  async function getProductById(
    id: string,
    { includeDeleted = false }: { includeDeleted?: boolean } = {},
  ): Promise<Product | undefined> {
    const product = await database.products.get(ProductIdSchema.parse(id));
    return product && (includeDeleted || !product.deletedAt) ? product : undefined;
  }

  return {
    async create(input: unknown): Promise<Product> {
      const values = ProductCreateSchema.parse(input);
      const now = new Date();
      const product = ProductSchema.parse({
        ...values,
        id: createId(),
        createdAt: now,
        updatedAt: now,
      });

      await database.products.add(product);
      await requestPersistentStorageAfterFirstSave();
      return product;
    },

    async update(id: string, input: unknown): Promise<Product> {
      const productId = ProductIdSchema.parse(id);
      const values = ProductUpdateSchema.parse(input);
      const current = await getProductById(productId);
      if (!current) {
        throw new Error(`Active product "${productId}" was not found.`);
      }

      const updated = ProductSchema.parse({ ...current, ...values, updatedAt: new Date() });
      await database.products.put(updated);
      await requestPersistentStorageAfterFirstSave();
      return updated;
    },

    getById: getProductById,

    async list({ category, search, includeDeleted = false }: ProductListFilters = {}): Promise<
      Product[]
    > {
      const normalizedSearch = search?.trim().toLocaleLowerCase();
      const products = await database.products.toArray();

      return products.filter((product) => {
        if (!includeDeleted && product.deletedAt) {
          return false;
        }
        if (category && product.category !== category) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }

        return [product.name, product.brand, product.barcode, product.category].some((field) =>
          field?.toLocaleLowerCase().includes(normalizedSearch),
        );
      });
    },

    async softDelete(id: string): Promise<Product> {
      const productId = ProductIdSchema.parse(id);
      const current = await getProductById(productId, { includeDeleted: true });
      if (!current) {
        throw new Error(`Product "${productId}" was not found.`);
      }
      if (current.deletedAt) {
        return current;
      }

      const deleted = ProductSchema.parse({
        ...current,
        deletedAt: new Date(),
        updatedAt: new Date(),
      });
      await database.products.put(deleted);
      await requestPersistentStorageAfterFirstSave();
      return deleted;
    },

    async restore(id: string): Promise<Product> {
      const productId = ProductIdSchema.parse(id);
      const current = await getProductById(productId, { includeDeleted: true });
      if (!current) {
        throw new Error(`Product "${productId}" was not found.`);
      }
      if (!current.deletedAt) {
        return current;
      }

      const restoredValues = { ...current };
      delete restoredValues.deletedAt;
      const restored = ProductSchema.parse({ ...restoredValues, updatedAt: new Date() });
      await database.products.put(restored);
      await requestPersistentStorageAfterFirstSave();
      return restored;
    },
  };
}

const productsRepository = createProductsRepository();

export const createProduct = productsRepository.create;
export const updateProduct = productsRepository.update;
export const getProductById = productsRepository.getById;
export const listProducts = productsRepository.list;
export const softDeleteProduct = productsRepository.softDelete;
export const restoreProduct = productsRepository.restore;
