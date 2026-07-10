export const MAX_DAILY_TASKS = 3;

export function formatTimeRange(
  startIso: string | null,
  endIso: string | null,
): string | null {
  if (!startIso || !endIso) {
    return null;
  }

  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return `${fmt(start)}–${fmt(end)}`;
}

export function formatPlanDate(planDate: string): string {
  const date = new Date(`${planDate}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
