import { useEffect, useState } from "react";

function startKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useCurrentDate(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setToday((current) =>
      startKey(current) === startKey(new Date()) ? current : new Date(),
    );
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    let timeoutId: number | undefined;
    const scheduleMidnight = () => {
      window.clearTimeout(timeoutId);
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timeoutId = window.setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, midnight.getTime() - now.getTime());
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    scheduleMidnight();
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return today;
}
