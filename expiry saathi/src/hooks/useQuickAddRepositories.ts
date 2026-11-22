import {
  createBatch,
  incrementBatchQuantity,
  listBatchesForProduct,
  softDeleteBatch,
  updateBatch,
} from "../db/repos/batches";
import { createProduct, listProducts } from "../db/repos/products";

export function useQuickAddRepositories() {
  return {
    createBatch,
    createProduct,
    incrementBatchQuantity,
    listBatchesForProduct,
    listProducts,
    softDeleteBatch,
    updateBatch,
  };
}
