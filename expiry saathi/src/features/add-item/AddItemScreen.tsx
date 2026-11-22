import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { Button } from "../../components/Button";
import { DatePresets } from "../../components/DatePresets";
import { QuantityStepper } from "../../components/QuantityStepper";
import { Toast } from "../../components/Toast";
import { useProducts } from "../../hooks/useProducts";
import { useQuickAddRepositories } from "../../hooks/useQuickAddRepositories";
import { defaultMessages as hinglish } from "../../i18n";
import { ExpiryDateSchema, type Batch, type Product } from "../../domain/types";

const optionalAmountSchema = z
  .string()
  .refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0), {
    message: hinglish.validation.amountNonnegative,
  });

const quickAddSchema = z.object({
  name: z.string().trim().min(1, hinglish.validation.nameRequired),
  category: z.string().trim().min(1),
  quantity: z.number().finite().positive(hinglish.validation.quantityPositive),
  unit: z.string().trim().min(1),
  expiryDate: z.string().refine((value) => ExpiryDateSchema.safeParse(value).success, {
    message: hinglish.validation.expiryRequired,
  }),
  batchNo: z.string(),
  mrp: optionalAmountSchema,
  costPrice: optionalAmountSchema,
  supplier: z.string(),
  notes: z.string(),
});

type QuickAddValues = z.infer<typeof quickAddSchema>;

interface UndoInfo {
  batchId: string;
  kind: "created" | "merged";
  previousQuantity?: number;
}

interface PendingDuplicate {
  batch: Batch;
  product: Product;
  values: QuickAddValues;
}

const preferenceKeys = {
  category: "expiry-saathi:last-category",
  unit: "expiry-saathi:last-unit",
} as const;

const initialCategory = hinglish.categories[0] ?? "";
const initialUnit = hinglish.units[0] ?? "";

function readPreference(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch (error: unknown) {
    console.warn("Could not read the quick-add preference.", error);
    return fallback;
  }
}

function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (error: unknown) {
    console.warn("Could not save the quick-add preference.", error);
  }
}

function optionalAmount(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

export function AddItemScreen() {
  const navigate = useNavigate();
  const repositories = useQuickAddRepositories();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<PendingDuplicate | null>(null);
  const [toast, setToast] = useState<UndoInfo | null>(null);
  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddValues>({
    defaultValues: {
      name: "",
      category: readPreference(preferenceKeys.category, initialCategory),
      quantity: 1,
      unit: readPreference(preferenceKeys.unit, initialUnit),
      expiryDate: "",
      batchNo: "",
      mrp: "",
      costPrice: "",
      supplier: "",
      notes: "",
    },
    resolver: zodResolver(quickAddSchema),
  });

  const name = useWatch({ control, name: "name" }) ?? "";
  const category = useWatch({ control, name: "category" }) ?? initialCategory;
  const quantity = useWatch({ control, name: "quantity" }) ?? 1;
  const unit = useWatch({ control, name: "unit" }) ?? initialUnit;
  const products = useProducts(name);
  const normalizedName = name.trim().toLocaleLowerCase();
  const matchingProducts = (products ?? []).filter((product) =>
    product.name.toLocaleLowerCase().includes(normalizedName),
  );
  const exactProduct = matchingProducts.find(
    (product) => product.name.toLocaleLowerCase() === normalizedName,
  );

  useEffect(() => {
    writePreference(preferenceKeys.category, category);
  }, [category]);

  useEffect(() => {
    writePreference(preferenceKeys.unit, unit);
  }, [unit]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function selectProduct(product: Product): Promise<void> {
    setSelectedProduct(product);
    setValue("name", product.name, { shouldValidate: true });
    setValue("unit", product.defaultUnit, { shouldValidate: true });
    if ((hinglish.categories as readonly string[]).includes(product.category)) {
      setValue("category", product.category, { shouldValidate: true });
    }
  }

  async function createProductFromSearch(): Promise<void> {
    const productName = name.trim();
    if (!productName) {
      setError("name", { type: "required", message: hinglish.validation.nameRequired });
      return;
    }

    try {
      const product = await repositories.createProduct({
        name: productName,
        category,
        defaultUnit: unit,
      });
      await selectProduct(product);
    } catch (error: unknown) {
      console.error("Could not create a product from quick add.", error);
      setError("name", { type: "server", message: hinglish.validation.productFailed });
    }
  }

  async function ensureProduct(values: QuickAddValues): Promise<Product> {
    if (selectedProduct && selectedProduct.name === values.name) {
      return selectedProduct;
    }
    const existingProducts = products ?? (await repositories.listProducts());
    const product = existingProducts.find(
      (candidate) => candidate.name.toLocaleLowerCase() === values.name.toLocaleLowerCase(),
    );
    if (product) {
      return product;
    }

    const createdProduct = await repositories.createProduct({
      name: values.name,
      category: values.category,
      defaultUnit: values.unit,
    });
    setSelectedProduct(createdProduct);
    return createdProduct;
  }

  function toBatchInput(values: QuickAddValues, product: Product) {
    return {
      productId: product.id,
      expiryDate: values.expiryDate,
      quantity: values.quantity,
      unit: values.unit,
      batchNo: values.batchNo.trim() || undefined,
      mrp: optionalAmount(values.mrp),
      costPrice: optionalAmount(values.costPrice),
      supplier: values.supplier.trim() || undefined,
      notes: values.notes.trim() || undefined,
    };
  }

  async function saveBatch(values: QuickAddValues): Promise<void> {
    setPendingDuplicate(null);
    try {
      const product = await ensureProduct(values);
      const existing = (await repositories.listBatchesForProduct(product.id)).find(
        (batch) => batch.status === "active" && batch.expiryDate === values.expiryDate,
      );
      if (existing) {
        setPendingDuplicate({ batch: existing, product, values });
        return;
      }

      const batch = await repositories.createBatch(toBatchInput(values, product));
      setToast({ batchId: batch.id, kind: "created" });
    } catch (error: unknown) {
      console.error("Could not save a quick-add batch.", error);
      setError("name", { type: "server", message: hinglish.validation.saveFailed });
    }
  }

  async function mergeDuplicate(): Promise<void> {
    if (!pendingDuplicate) {
      return;
    }
    try {
      const updated = await repositories.incrementBatchQuantity(
        pendingDuplicate.batch.id,
        pendingDuplicate.values.quantity,
      );
      setPendingDuplicate(null);
      setToast({
        batchId: updated.id,
        kind: "merged",
        previousQuantity: pendingDuplicate.batch.quantity,
      });
    } catch (error: unknown) {
      console.error("Could not merge the duplicate batch quantity.", error);
      setError("name", { type: "server", message: hinglish.validation.saveFailed });
    }
  }

  async function saveSeparateBatch(): Promise<void> {
    if (!pendingDuplicate) {
      return;
    }
    const { product, values } = pendingDuplicate;
    setPendingDuplicate(null);
    try {
      const batch = await repositories.createBatch(toBatchInput(values, product));
      setToast({ batchId: batch.id, kind: "created" });
    } catch (error: unknown) {
      console.error("Could not save the separate batch.", error);
      setError("name", { type: "server", message: hinglish.validation.saveFailed });
    }
  }

  async function undoSave(): Promise<void> {
    if (!toast) {
      return;
    }
    try {
      if (toast.kind === "created") {
        await repositories.softDeleteBatch(toast.batchId);
      } else if (toast.previousQuantity !== undefined) {
        await repositories.updateBatch(toast.batchId, { quantity: toast.previousQuantity });
      }
      setToast(null);
    } catch (error: unknown) {
      console.error("Could not undo the quick-add save.", error);
      setError("name", { type: "server", message: hinglish.validation.saveFailed });
    }
  }

  function addAnotherBatch(): void {
    if (!selectedProduct) {
      setToast(null);
      return;
    }
    reset({
      name: selectedProduct.name,
      category,
      quantity: 1,
      unit,
      expiryDate: "",
      batchNo: "",
      mrp: "",
      costPrice: "",
      supplier: "",
      notes: "",
    });
    setToast(null);
  }

  function finishAdding(): void {
    setToast(null);
    navigate("/");
  }

  return (
    <section aria-labelledby="add-item-heading">
      <h1 className="text-2xl font-bold tracking-tight" id="add-item-heading">
        {hinglish.addItemTitle}
      </h1>

      <form className="mt-5 space-y-6" noValidate onSubmit={handleSubmit(saveBatch)}>
        <div className="relative">
          <label className="block text-sm font-semibold" htmlFor="product-name">
            {hinglish.product}
          </label>
          <input
            aria-autocomplete="list"
            aria-controls="product-suggestions"
            aria-describedby={errors.name ? "product-error" : undefined}
            aria-expanded={Boolean(name.trim() && !selectedProduct)}
            aria-invalid={Boolean(errors.name)}
            autoComplete="off"
            className="mt-2 min-h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-400"
            id="product-name"
            placeholder={hinglish.productPlaceholder}
            {...register("name", {
              onChange: () => setSelectedProduct(null),
            })}
          />
          {errors.name ? (
            <p className="mt-1 text-sm font-medium text-rose-700 dark:text-rose-300" id="product-error">
              {errors.name.message}
            </p>
          ) : null}
          {name.trim() && !selectedProduct ? (
            <div
              className="absolute inset-x-0 top-full z-10 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
              id="product-suggestions"
              role="listbox"
            >
              {products === undefined ? (
                <p className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  {hinglish.loadingProducts}
                </p>
              ) : null}
              {matchingProducts.slice(0, 5).map((product) => (
                <button
                  aria-selected={false}
                  className="flex min-h-12 w-full items-center rounded-lg px-3 text-left hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700 dark:hover:bg-slate-800"
                  key={product.id}
                  onClick={() => void selectProduct(product)}
                  role="option"
                  type="button"
                >
                  {product.name}
                </button>
              ))}
              {products !== undefined && !exactProduct ? (
                <button
                  className="flex min-h-12 w-full items-center rounded-lg px-3 text-left font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700 dark:text-teal-300 dark:hover:bg-slate-800"
                  onClick={() => void createProductFromSearch()}
                  role="option"
                  type="button"
                >
                  {hinglish.creatingProduct} {name.trim()}
                </button>
              ) : null}
              {products !== undefined && matchingProducts.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  {hinglish.noProductsFound}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{hinglish.category}</legend>
          <input type="hidden" {...register("category")} />
          <div className="flex flex-wrap gap-2">
            {hinglish.categories.map((categoryOption) => (
              <Button
                aria-pressed={category === categoryOption}
                className="px-3 text-sm"
                key={categoryOption}
                onClick={() => setValue("category", categoryOption, { shouldValidate: true })}
                type="button"
                variant={category === categoryOption ? "primary" : "secondary"}
              >
                {categoryOption}
              </Button>
            ))}
          </div>
        </fieldset>

        <Controller
          control={control}
          name="quantity"
          render={({ field }) => (
            <QuantityStepper
              error={errors.quantity?.message}
              onChange={field.onChange}
              onUnitChange={(nextUnit) => setValue("unit", nextUnit, { shouldValidate: true })}
              unit={unit}
              units={hinglish.units}
              value={quantity}
            />
          )}
        />
        <input type="hidden" {...register("unit")} />

        <Controller
          control={control}
          name="expiryDate"
          render={({ field }) => (
            <DatePresets
              error={errors.expiryDate?.message}
              inputRef={field.ref}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />

        <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <summary className="flex min-h-12 cursor-pointer items-center font-semibold focus-visible:outline-2 focus-visible:outline-teal-700">
            {hinglish.details}
          </summary>
          <div className="grid gap-4 pb-2 pt-3 sm:grid-cols-2">
            <label className="text-sm font-semibold" htmlFor="batch-number">
              {hinglish.batchNumber}
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900"
                id="batch-number"
                {...register("batchNo")}
              />
            </label>
            <label className="text-sm font-semibold" htmlFor="mrp">
              {hinglish.mrp}
              <input
                aria-invalid={Boolean(errors.mrp)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900"
                id="mrp"
                inputMode="decimal"
                {...register("mrp")}
              />
            </label>
            <label className="text-sm font-semibold" htmlFor="cost-price">
              {hinglish.cost}
              <input
                aria-invalid={Boolean(errors.costPrice)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900"
                id="cost-price"
                inputMode="decimal"
                {...register("costPrice")}
              />
            </label>
            <label className="text-sm font-semibold" htmlFor="supplier">
              {hinglish.supplier}
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900"
                id="supplier"
                {...register("supplier")}
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2" htmlFor="notes">
              {hinglish.notes}
              <textarea
                className="mt-2 min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:border-slate-700 dark:bg-slate-900"
                id="notes"
                {...register("notes")}
              />
            </label>
          </div>
        </details>

        <div className="sticky bottom-24 z-10 -mx-5 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-5 pb-2 pt-8 dark:from-slate-950 dark:via-slate-950">
          <Button className="w-full text-lg" disabled={isSubmitting} type="submit">
            {hinglish.saveBatch}
          </Button>
        </div>
      </form>

      {pendingDuplicate ? (
        <div
          aria-labelledby="duplicate-heading"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-3 sm:items-center"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h2 className="text-lg font-bold" id="duplicate-heading">
              {hinglish.duplicateFound}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {pendingDuplicate.product.name} · {format(parseISO(pendingDuplicate.values.expiryDate), "dd MMM yyyy")}
            </p>
            <div className="mt-5 grid gap-2">
              <Button onClick={() => void mergeDuplicate()}>{hinglish.mergeDuplicate}</Button>
              <Button onClick={() => void saveSeparateBatch()} variant="secondary">
                {hinglish.keepSeparate}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <Toast
          actions={
            <>
              <Button className="min-h-10 px-3 text-sm" onClick={addAnotherBatch} variant="secondary">
                {hinglish.anotherBatch}
              </Button>
              <Button className="min-h-10 px-3 text-sm" onClick={finishAdding} variant="quiet">
                {hinglish.done}
              </Button>
            </>
          }
          onDismiss={() => setToast(null)}
          onUndo={() => void undoSave()}
        >
          {hinglish.savedBatch}
        </Toast>
      ) : null}
    </section>
  );
}
