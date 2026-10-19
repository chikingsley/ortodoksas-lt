export function hasText(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.length > 0;
}

export function firstText(...values: (string | null | undefined)[]): string {
  return values.find(hasText) ?? "";
}
