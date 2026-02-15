/**
 * Simple CSV parser that handles quoted fields (commas, newlines inside quotes).
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          cell += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cell += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
        i++;
      } else if (ch === '\r' || ch === '\n') {
        row.push(cell);
        cell = '';
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
        i++;
        if (row.some(c => c.trim() !== '') || row.length > 1) rows.push(row);
        row = [];
      } else {
        cell += ch;
        i++;
      }
    }
  }

  // Last cell/row
  row.push(cell);
  if (row.some(c => c.trim() !== '') || row.length > 1) rows.push(row);

  return rows;
}

export type DetectedType = 'number' | 'email' | 'url' | 'date' | 'currency' | 'phone' | 'text';

export function detectColumnType(values: string[]): DetectedType {
  const nonEmpty = values.filter(v => v.trim() !== '');
  if (nonEmpty.length === 0) return 'text';

  const all = (fn: (v: string) => boolean) => nonEmpty.every(fn);

  if (all(v => /^\$[\d,]+(\.\d+)?$/.test(v.trim()))) return 'currency';
  if (all(v => /^-?[\d,]+\.?\d*$/.test(v.trim().replace(/,/g, '')))) return 'number';
  if (all(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))) return 'email';
  if (all(v => /^https?:\/\/.+/.test(v.trim()))) return 'url';
  if (all(v => /^[\+]?[\d\s\-\(\)]{7,}$/.test(v.trim()))) return 'phone';
  if (all(v => !isNaN(Date.parse(v.trim())) && /[\-\/]/.test(v.trim()))) return 'date';

  return 'text';
}

export function csvToColumns(headers: string[], dataRows: string[][]) {
  return headers.map((h, i) => {
    const values = dataRows.map(r => r[i] || '');
    const detected = detectColumnType(values);
    const key = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `col_${i}`;
    return {
      key,
      label: h.trim() || `Column ${i + 1}`,
      type: detected as string,
    };
  });
}

export function csvToRows(headers: string[], dataRows: string[][], columns: { key: string }[]) {
  return dataRows.map((row, i) => {
    const obj: Record<string, any> = { id: `import-${i}-${Date.now()}` };
    columns.forEach((col, ci) => {
      obj[col.key] = row[ci]?.trim() ?? '';
    });
    return obj;
  });
}
