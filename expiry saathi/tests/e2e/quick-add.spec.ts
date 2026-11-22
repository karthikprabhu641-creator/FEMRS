import { expect, test, type Page } from "@playwright/test";

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
