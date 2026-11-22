import { CalendarClock, Leaf, WifiOff } from "lucide-react";
import { hinglish } from "./i18n/hinglish";

export function App() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8 sm:justify-center sm:px-8">
      <header className="mb-12 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-teal-700 text-white">
          <Leaf aria-hidden="true" size={25} strokeWidth={2.5} />
        </span>
        <div>
          <p className="font-bold tracking-tight text-slate-950">{hinglish.appName}</p>
          <p className="text-sm text-slate-600">{hinglish.tagline}</p>
        </div>
      </header>

      <section
        aria-labelledby="welcome-heading"
        className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm sm:p-8"
      >
        <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
          <CalendarClock aria-hidden="true" size={26} />
        </span>
        <h1 id="welcome-heading" className="text-2xl font-bold tracking-tight text-slate-950">
          {hinglish.welcome}
        </h1>
        <p className="mt-3 leading-7 text-slate-600">{hinglish.setupMessage}</p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">
          <WifiOff aria-hidden="true" size={16} />
          {hinglish.offlineLabel}
        </div>
      </section>
    </main>
  );
}
