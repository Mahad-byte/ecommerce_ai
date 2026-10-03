export function formatPrice(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return `$${n.toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
