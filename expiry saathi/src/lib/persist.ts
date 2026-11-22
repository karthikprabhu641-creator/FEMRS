let persistenceRequested = false;

export async function requestPersistentStorageAfterFirstSave(): Promise<void> {
  if (persistenceRequested) {
    return;
  }
  persistenceRequested = true;

  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return;
  }

  try {
    const persisted = await navigator.storage.persist();
    if (!persisted) {
      console.info("The browser did not grant persistent storage.");
    }
  } catch (error) {
    console.warn("Could not request persistent storage.", error);
  }
}
