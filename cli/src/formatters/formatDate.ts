export function formatDate(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "-";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}
