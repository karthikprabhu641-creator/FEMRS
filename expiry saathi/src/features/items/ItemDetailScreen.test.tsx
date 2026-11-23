import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { db } from "../../db/schema";
import { createCategoriesRepository } from "../../db/repos/categories";
import { createProductsRepository } from "../../db/repos/products";
import { createBatchesRepository } from "../../db/repos/batches";
import { hinglish } from "../../i18n/hinglish";
import { ItemDetailScreen } from "./ItemDetailScreen";

beforeEach(async () => {
  db.close();
  await db.open();
  await Promise.all([
    db.products.clear(),
    db.batches.clear(),
    db.categories.clear(),
    db.settings.clear(),
    db.events.clear(),
  ]);
});

afterEach(() => {
  cleanup();
  db.close();
});

describe("item detail actions", () => {
  it("edits fields, marks a batch sold, and shows event history", async () => {
    const category = await createCategoriesRepository().create({
      name: "Biscuits",
      alertDays: 7,
      icon: "cookie",
      color: "amber",
    });
    const product = await createProductsRepository().create({
      name: "Test Biscuits",
      category: category.name,
      defaultUnit: "pack",
    });
    const batch = await createBatchesRepository().create({
      productId: product.id,
      expiryDate: "2027-01-15",
      quantity: 4,
      unit: "pack",
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/items/${batch.id}`]}>
        <Routes>
          <Route path="/items/:id" element={<ItemDetailScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "Test Biscuits" });
    await user.click(screen.getByRole("button", { name: hinglish.itemDetail.edit }));
    const quantity = screen.getByLabelText(hinglish.itemDetail.quantity);
    await user.clear(quantity);
    await user.type(quantity, "6");
    await user.click(screen.getByRole("button", { name: hinglish.itemDetail.save }));
    await waitFor(async () =>
      expect((await createBatchesRepository().getById(batch.id))?.quantity).toBe(6),
    );

    await user.click(screen.getByRole("button", { name: hinglish.itemDetail.sold }));
    await user.click(screen.getByRole("button", { name: hinglish.itemDetail.actionConfirm }));
    await waitFor(async () =>
      expect((await createBatchesRepository().getById(batch.id))?.status).toBe("sold"),
    );
    expect(await screen.findByText(hinglish.itemDetail.eventSold)).toBeVisible();
  });

  it("soft-deletes a batch and restores it with Undo", async () => {
    const category = await createCategoriesRepository().create({
      name: "Dairy",
      alertDays: 7,
      icon: "milk",
      color: "sky",
    });
    const product = await createProductsRepository().create({
      name: "Undo Milk",
      category: category.name,
      defaultUnit: "bottle",
    });
    const batch = await createBatchesRepository().create({
      productId: product.id,
      expiryDate: "2027-02-15",
      quantity: 2,
      unit: "bottle",
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/items/${batch.id}`]}>
        <Routes>
          <Route path="/items/:id" element={<ItemDetailScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "Undo Milk" });
    await user.click(screen.getByRole("button", { name: hinglish.itemDetail.delete }));
    expect(await screen.findByText(hinglish.itemDetail.deleted)).toBeVisible();
    await user.click(screen.getByRole("button", { name: hinglish.undo }));
    await waitFor(async () =>
      expect(await createBatchesRepository().getById(batch.id)).not.toBeUndefined(),
    );
  });
});
