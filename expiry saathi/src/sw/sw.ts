/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, type PrecacheEntry } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry>;
};

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
