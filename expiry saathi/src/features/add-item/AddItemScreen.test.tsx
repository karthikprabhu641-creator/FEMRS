import "fake-indexeddb/auto";
import { addDays, format, startOfDay } from "date-fns";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { createProductsRepository } from "../../db/repos/products";
import { createBatchesRepository } from "../../db/repos/batches";
import { db } from "../../db/schema";
import { hinglish } from "../../i18n/hinglish";
import { getPresetExpiryDate } from "./date-presets";
import { AddItemScreen } from "./AddItemScreen";

const expiryInSevenDays = (): string =>
  format(addDays(startOfDay(new Date()), 7), "yyyy-MM-dd");

function renderAddScreen() {
  return render(
    <MemoryRouter>
      <AddItemScreen />
    </MemoryRouter>,
  );
}

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
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  db.close();
});

describe("quick add screen", () => {
  it("validates the required name, positive quantity, and expiry date", async () => {
    const user = userEvent.setup();
    renderAddScreen();

    await user.clear(screen.getByLabelText(hinglish.quantity));
    await user.type(screen.getByLabelText(hinglish.quantity), "0");
    await user.click(screen.getByRole("button", { name: hinglish.saveBatch }));

    expect(await screen.findByText(hinglish.validation.nameRequired)).toBeVisible();
    expect(screen.getByText(hinglish.validation.quantityPositive)).toBeVisible();
    expect(screen.getByText(hinglish.validation.expiryRequired)).toBeVisible();
  });

  it("creates a product inline and saves an item with a date preset", async () => {
    const user = userEvent.setup();
    renderAddScreen();

    await user.type(screen.getByLabelText(hinglish.product), "Offline Tea");
    await user.click(await screen.findByRole("option", { name: "Naya item banao: Offline Tea" }));
    await user.click(screen.getByRole("button", { name: "Aaj se 7 din" }));
    await user.click(screen.getByRole("button", { name: hinglish.saveBatch }));

    expect(await screen.findByRole("status")).toHaveTextContent(hinglish.savedBatch);
    await waitFor(async () => expect(await db.products.count()).toBe(1));
    await waitFor(async () => expect(await db.batches.count()).toBe(1));
    expect((await db.batches.toArray())[0]?.expiryDate).toBe(expiryInSevenDays());
  });

  it("offers and applies a duplicate-batch quantity merge", async () => {
    const user = userEvent.setup();
    const product = await createProductsRepository().create({
      name: "Parle-G",
      category: "Biscuits",
      defaultUnit: "pack",
    });
    const batch = await createBatchesRepository().create({
      productId: product.id,
      expiryDate: expiryInSevenDays(),
      quantity: 4,
      unit: "pack",
    });
    renderAddScreen();

    await user.type(screen.getByLabelText(hinglish.product), product.name);
    await user.click(await screen.findByRole("option", { name: product.name }));
    await user.clear(screen.getByLabelText(hinglish.quantity));
    await user.type(screen.getByLabelText(hinglish.quantity), "3");
    await user.click(screen.getByRole("button", { name: "Aaj se 7 din" }));
    await user.click(screen.getByRole("button", { name: hinglish.saveBatch }));
    await user.click(await screen.findByRole("button", { name: hinglish.mergeDuplicate }));

    await waitFor(async () =>
      expect((await db.batches.get(batch.id))?.quantity).toBe(7),
    );
    expect(await db.batches.count()).toBe(1);
  });

  it("undoes a new batch with a soft delete", async () => {
    const user = userEvent.setup();
    renderAddScreen();

    await user.type(screen.getByLabelText(hinglish.product), "Undo Tea");
    await user.click(await screen.findByRole("option", { name: "Naya item banao: Undo Tea" }));
    await user.click(screen.getByRole("button", { name: "Aaj se 7 din" }));
    await user.click(screen.getByRole("button", { name: hinglish.saveBatch }));
    await user.click(await screen.findByRole("button", { name: hinglish.undo }));

    await waitFor(async () => expect((await db.batches.toArray())[0]?.deletedAt).toBeInstanceOf(Date));
    expect(await createBatchesRepository().list()).toHaveLength(0);
  });
});

describe("date preset calculation", () => {
  it("clamps month-end dates when adding a month", () => {
    expect(getPresetExpiryDate("month1", new Date(2027, 0, 31))).toBe("2027-02-28");
  });

  it("uses seven calendar days for fresh items", () => {
    expect(getPresetExpiryDate("days7", new Date(2027, 0, 31))).toBe("2027-02-07");
  });
});
