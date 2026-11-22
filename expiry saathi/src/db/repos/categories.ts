import { z } from "zod";
import { CategorySchema, ProductSchema, type Category } from "../../domain/types";
import { createId } from "../../lib/id";
import { requestPersistentStorageAfterFirstSave } from "../../lib/persist";
import { db, type ExpirySaathiDatabase } from "../schema";

const CategoryCreateSchema = CategorySchema.omit({
  id: true,
  updatedAt: true,
  deletedAt: true,
}).strict();

const CategoryUpdateSchema = CategoryCreateSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one category field must be updated",
);

const CategoryIdSchema = z.uuid();

export function createCategoriesRepository(database: ExpirySaathiDatabase = db) {
  async function getCategoryById(
    id: string,
    { includeDeleted = false }: { includeDeleted?: boolean } = {},
  ): Promise<Category | undefined> {
    const category = await database.categories.get(CategoryIdSchema.parse(id));
    return category && (includeDeleted || !category.deletedAt) ? category : undefined;
  }

  return {
    async create(input: unknown): Promise<Category> {
      const values = CategoryCreateSchema.parse(input);
      const now = new Date();

      const category = await database.transaction("rw", database.categories, async () => {
        const duplicate = await database.categories.where("name").equals(values.name).first();
        if (duplicate && !duplicate.deletedAt) {
          throw new Error(`Category "${values.name}" already exists.`);
        }
        if (duplicate?.deletedAt) {
          throw new Error(`Category "${values.name}" is deleted; restore it instead.`);
        }

        const category = CategorySchema.parse({
          ...values,
          id: createId(),
          updatedAt: now,
        });
        await database.categories.add(category);
        return category;
      });
      await requestPersistentStorageAfterFirstSave();
      return category;
    },

    async update(id: string, input: unknown): Promise<Category> {
      const categoryId = CategoryIdSchema.parse(id);
      const values = CategoryUpdateSchema.parse(input);

      const category = await database.transaction(
        "rw",
        database.categories,
        database.products,
        async () => {
          const current = await getCategoryById(categoryId);
          if (!current) {
            throw new Error(`Active category "${categoryId}" was not found.`);
          }
          if (values.name && values.name !== current.name) {
            const duplicate = await database.categories.where("name").equals(values.name).first();
            if (duplicate) {
              throw new Error(`Category "${values.name}" already exists.`);
            }
          }

          const now = new Date();
          const updated = CategorySchema.parse({ ...current, ...values, updatedAt: now });
          await database.categories.put(updated);

          if (values.name && values.name !== current.name) {
            const products = await database.products
              .where("category")
              .equals(current.name)
              .toArray();
            for (const product of products) {
              await database.products.put(
                ProductSchema.parse({ ...product, category: values.name, updatedAt: now }),
              );
            }
          }
          return updated;
        },
      );
      await requestPersistentStorageAfterFirstSave();
      return category;
    },

    getById: getCategoryById,

    async list({ includeDeleted = false }: { includeDeleted?: boolean } = {}): Promise<Category[]> {
      const categories = await database.categories.toArray();
      return includeDeleted ? categories : categories.filter((category) => !category.deletedAt);
    },

    async softDelete(id: string): Promise<Category> {
      const categoryId = CategoryIdSchema.parse(id);
      const deleted = await database.transaction(
        "rw",
        database.categories,
        database.products,
        async () => {
          const current = await getCategoryById(categoryId, { includeDeleted: true });
          if (!current) {
            throw new Error(`Category "${categoryId}" was not found.`);
          }
          if (current.deletedAt) {
            return current;
          }

          const products = await database.products.where("category").equals(current.name).count();
          if (products > 0) {
            throw new Error(`Category "${current.name}" is in use by products.`);
          }

          const now = new Date();
          const softDeleted = CategorySchema.parse({
            ...current,
            deletedAt: now,
            updatedAt: now,
          });
          await database.categories.put(softDeleted);
          return softDeleted;
        },
      );
      await requestPersistentStorageAfterFirstSave();
      return deleted;
    },

    async restore(id: string): Promise<Category> {
      const categoryId = CategoryIdSchema.parse(id);
      const restored = await database.transaction("rw", database.categories, async () => {
        const current = await getCategoryById(categoryId, { includeDeleted: true });
        if (!current) {
          throw new Error(`Category "${categoryId}" was not found.`);
        }
        if (!current.deletedAt) {
          return current;
        }

        const duplicate = await database.categories.where("name").equals(current.name).first();
        if (duplicate && duplicate.id !== current.id && !duplicate.deletedAt) {
          throw new Error(`Category "${current.name}" already exists.`);
        }

        const restoredValues = { ...current };
        delete restoredValues.deletedAt;
        const restoredCategory = CategorySchema.parse({
          ...restoredValues,
          updatedAt: new Date(),
        });
        await database.categories.put(restoredCategory);
        return restoredCategory;
      });
      await requestPersistentStorageAfterFirstSave();
      return restored;
    },
  };
}

const categoriesRepository = createCategoriesRepository();

export const createCategory = categoriesRepository.create;
export const updateCategory = categoriesRepository.update;
export const getCategoryById = categoriesRepository.getById;
export const listCategories = categoriesRepository.list;
export const softDeleteCategory = categoriesRepository.softDelete;
export const restoreCategory = categoriesRepository.restore;
