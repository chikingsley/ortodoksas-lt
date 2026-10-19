export function hasText(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.length > 0;
}

export function firstText(...values: (string | null | undefined)[]): string {
  return values.find(hasText) ?? "";
}

export function parsePageNumber(value: string | null): number {
  const page = Number(value);

  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10_000) : 1;
}
