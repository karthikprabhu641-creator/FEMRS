import { lazy, Suspense, useEffect } from "react";
import { NavLink, Navigate, Outlet, Route, Routes } from "react-router";
import { Boxes, House, Leaf, Plus, Settings } from "lucide-react";
import { defaultMessages as hinglish } from "./i18n";
import { EmptyState } from "./components/EmptyState";

let seedImportStarted = false;
const AddItemScreen = lazy(() =>
  import("./features/add-item").then(({ AddItemScreen }) => ({ default: AddItemScreen })),
);

function AppLayout() {
  return (
    <div className="app-shell min-h-dvh bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-5">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-700 text-white">
          <Leaf aria-hidden="true" size={23} strokeWidth={2.5} />
        </span>
        <div>
          <p className="font-bold tracking-tight">{hinglish.appName}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{hinglish.tagline}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-5 pb-36 pt-6">
        <Outlet />
      </main>

      <nav
        aria-label={hinglish.navigationLabel}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
          <NavLink className={({ isActive }) => navClassName(isActive)} to="/">
            <House aria-hidden="true" size={20} />
            <span>{hinglish.home}</span>
          </NavLink>
          <NavLink className={({ isActive }) => navClassName(isActive)} to="/items">
            <Boxes aria-hidden="true" size={20} />
            <span>{hinglish.items}</span>
          </NavLink>
          <NavLink
            aria-label={hinglish.addBatch}
            className="mx-auto flex min-h-14 min-w-14 -translate-y-1 flex-col items-center justify-center gap-0.5 rounded-2xl bg-teal-700 px-3 text-white shadow-lg transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            to="/add"
          >
            <Plus aria-hidden="true" size={25} strokeWidth={2.5} />
            <span className="text-xs font-semibold">{hinglish.add}</span>
          </NavLink>
          <span aria-hidden="true" />
          <NavLink className={({ isActive }) => navClassName(isActive)} to="/settings">
            <Settings aria-hidden="true" size={20} />
            <span>{hinglish.settings}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

function navClassName(isActive: boolean): string {
  return [
    "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
    isActive
      ? "text-teal-800 dark:text-teal-300"
      : "text-slate-600 hover:text-teal-800 dark:text-slate-300 dark:hover:text-teal-300",
  ].join(" ");
}

function HomeScreen() {
  return (
    <section
      aria-labelledby="welcome-heading"
      className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
    >
      <h1 id="welcome-heading" className="text-2xl font-bold tracking-tight">
        {hinglish.welcome}
      </h1>
      <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{hinglish.setupMessage}</p>
      <div className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-900 dark:bg-teal-950 dark:text-teal-100">
        {hinglish.offlineLabel}
      </div>
    </section>
  );
}

function ItemsPlaceholder() {
  return <EmptyState title={hinglish.itemsPlaceholderTitle} description={hinglish.itemsPlaceholder} />;
}

function SettingsPlaceholder() {
  return (
    <EmptyState
      title={hinglish.settingsPlaceholderTitle}
      description={hinglish.settingsPlaceholder}
    />
  );
}

export function App() {
  useEffect(() => {
    if (!import.meta.env.DEV || new URLSearchParams(window.location.search).get("seed") !== "1") {
      return;
    }
    if (seedImportStarted) {
      return;
    }
    seedImportStarted = true;

    void import("./db/seed")
      .then(({ seedDemoData }) => seedDemoData())
      .catch((error: unknown) => {
        seedImportStarted = false;
        console.error("Could not seed the development database.", error);
      });
  }, []);

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomeScreen />} />
        <Route
          path="add"
          element={
            <Suspense fallback={<p role="status">{hinglish.loading}</p>}>
              <AddItemScreen />
            </Suspense>
          }
        />
        <Route path="items" element={<ItemsPlaceholder />} />
        <Route path="settings" element={<SettingsPlaceholder />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}
