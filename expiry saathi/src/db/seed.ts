import { addDays, format, startOfDay } from "date-fns";
import { createBatchesRepository } from "./repos/batches";
import { createCategoriesRepository } from "./repos/categories";
import { createProductsRepository } from "./repos/products";

const categorySeeds = [
  { name: "Biscuits", alertDays: 30, icon: "cookie", color: "amber" },
  { name: "Chips", alertDays: 30, icon: "sandwich", color: "orange" },
  { name: "Juices", alertDays: 14, icon: "cup-soda", color: "orange" },
  { name: "Dairy", alertDays: 3, icon: "milk", color: "sky" },
  { name: "Namkeen", alertDays: 21, icon: "wheat", color: "yellow" },
  { name: "Chocolates", alertDays: 30, icon: "candy", color: "rose" },
] as const;

const productSeeds = [
  { name: "Parle-G Biscuits 100g", brand: "Parle", category: "Biscuits", quantity: 24 },
  { name: "Good Day Butter Cookies", brand: "Britannia", category: "Biscuits", quantity: 12 },
  { name: "Classic Salted Chips", brand: "Lay's", category: "Chips", quantity: 10 },
  { name: "Mad Angles Achaari Masti", brand: "Bingo!", category: "Chips", quantity: 8 },
  { name: "Mango Fruit Drink 1L", brand: "Real", category: "Juices", quantity: 6 },
  { name: "Orange Juice 1L", brand: "Tropicana", category: "Juices", quantity: 6 },
  { name: "Toned Milk 500ml", brand: "Amul", category: "Dairy", quantity: 12 },
  { name: "Plain Curd 400g", brand: "Mother Dairy", category: "Dairy", quantity: 8 },
  { name: "Aloo Bhujia 200g", brand: "Haldiram's", category: "Namkeen", quantity: 10 },
  { name: "Moong Dal 200g", brand: "Bikaji", category: "Namkeen", quantity: 8 },
  { name: "Dairy Milk Silk 60g", brand: "Cadbury", category: "Chocolates", quantity: 6 },
  { name: "KitKat 4 Finger", brand: "Nestle", category: "Chocolates", quantity: 12 },
] as const;

const expiryOffsets = [-1, 0, 3, 7, 14, 30, 45, 60, 90, 120, 180, 240] as const;

export async function seedDemoData(): Promise<{ products: number; batches: number }> {
  if (!import.meta.env.DEV) {
    throw new Error("Demo seed data can only be created in development.");
  }

  const productsRepository = createProductsRepository();
  const categoriesRepository = createCategoriesRepository();
  const batchesRepository = createBatchesRepository();

  if ((await productsRepository.list()).length > 0) {
    throw new Error("Demo seed data can only be added to an empty product list.");
  }

  for (const category of categorySeeds) {
    await categoriesRepository.create(category);
  }

  const today = startOfDay(new Date());
  for (const [index, product] of productSeeds.entries()) {
    const savedProduct = await productsRepository.create({
      name: product.name,
      brand: product.brand,
      category: product.category,
      defaultUnit: "pack",
    });

    await batchesRepository.create({
      productId: savedProduct.id,
      expiryDate: format(addDays(today, expiryOffsets[index] ?? 0), "yyyy-MM-dd"),
      quantity: product.quantity,
      unit: "pack",
      status: "active",
      costPrice: 10 + index * 2,
      mrp: 15 + index * 3,
      supplier: "Local distributor",
      location: "Main shelf",
    });
  }

  return { products: productSeeds.length, batches: productSeeds.length };
}
