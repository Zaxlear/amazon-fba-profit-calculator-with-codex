export function formatMoneyAmount(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
}

