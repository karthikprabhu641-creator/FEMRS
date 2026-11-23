import { expect, test, type Page } from "@playwright/test";

test("M5 item edit, sold action, history, delete, and undo", async ({ page, context }) => {
  await page.goto("/?seed=1");
  await expect(page.getByRole("link", { name: /Expired:/ })).toBeVisible();
  await page.goto("/items");
  await page.getByRole("link").filter({ hasText: "Parle-G Biscuits 100g" }).click();
  await expect(page.getByRole("heading", { name: "Parle-G Biscuits 100g" })).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  const quantity = page.getByLabel("Quantity");
  await quantity.fill("25");
  await page.getByRole("button", { name: "Save" }).click();

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Item delete ho gaya")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();

  await page.getByRole("button", { name: "Bech diya" }).click();
  await page.getByRole("button", { name: "Confirm karein" }).click();
  await expect(page.getByText("Sold").last()).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Parle-G Biscuits 100g" })).toBeVisible();
});

test("M4 dashboard, filtered items, live add, and offline reload", async ({ page, context }) => {
  await page.goto("/?seed=1");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Expired:/ })).toBeVisible();

  await page.getByRole("link", { name: /Expired:/ }).click();
  await expect(page).toHaveURL(/status=expired/);
  await expect(page.getByText(/items$/).first()).toBeVisible();

  await page.goto("/add");
  await page.getByLabel("Product").fill("Offline live tea");
  await page.getByRole("option", { name: "Naya item banao: Offline live tea" }).click();
  await page.getByRole("button", { name: "Aaj se 7 din" }).click();
  await page.getByRole("button", { name: "Batch save karein" }).click();
  await expect(page.getByRole("status")).toContainText("Batch save ho gaya");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});

test("quick add saves a batch and keeps it after an offline reload", async ({ page, context }) => {
  await page.goto("/add");
  await page.getByLabel("Product").fill("Offline e2e tea");
  await page.getByRole("option", { name: "Naya item banao: Offline e2e tea" }).click();
  await page.getByRole("button", { name: "Aaj se 7 din" }).click();
  await page.getByRole("button", { name: "Batch save karein" }).click();
  await expect(page.getByRole("status")).toContainText("Batch save ho gaya");

  const savedBeforeOffline = await countActiveBatches(page);
  expect(savedBeforeOffline).toBe(1);

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        });
      });
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Naya batch jodo" })).toBeVisible();
  expect(await countActiveBatches(page)).toBe(1);
});

async function countActiveBatches(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const openRequest = indexedDB.open("expiry-saathi");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction("batches", "readonly");
          const countRequest = transaction.objectStore("batches").count();
          countRequest.onerror = () => reject(countRequest.error);
          countRequest.onsuccess = () => {
            resolve(countRequest.result);
            database.close();
          };
        };
      }),
  );
}
