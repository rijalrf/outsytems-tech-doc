export function ensureArray<T = any>(data: any): T[] {
  if (data === null || data === undefined) return [];
  if (Array.isArray(data)) return data;
  return [data];
}

export function formatDataType(dataType?: string | null): string {
  if (!dataType) return '-';
  // Strip Entity: or Structure: or ListType: prefixes if desired, or keep them with clean badge
  return dataType;
}

export function formatBoolean(val?: any): boolean {
  if (val === true || val === 'Yes' || val === 'True' || val === 'true') return true;
  return false;
}
