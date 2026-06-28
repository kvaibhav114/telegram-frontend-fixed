
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