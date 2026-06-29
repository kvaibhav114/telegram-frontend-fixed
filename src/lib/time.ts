
export function parseBackendDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasTz ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatLocalTime(iso: string | null | undefined): string {
  const d = parseBackendDate(iso);
  return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

export function formatLocalDateTime(iso: string | null | undefined): string {
  const d = parseBackendDate(iso);
  return d
    ? d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

export function formatDateDivider(iso: string | null | undefined): string | null {
  const d = parseBackendDate(iso);
  if (!d) return null;
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

/** Stable per-day key used to group consecutive messages. */
export function localDayKey(iso: string | null | undefined): string {
  const d = parseBackendDate(iso);
  if (!d) return "";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}