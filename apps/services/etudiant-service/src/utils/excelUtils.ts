import * as XLSX from 'xlsx';

export const rowValue = (row: any, key: string | undefined): string => {
  return key ? String(row[key] ?? '').trim() : '';
};

// Robust helper to parse Excel sheet, skipping empty top rows and auto-detecting headers
export function parseExcelSheet(worksheet: XLSX.WorkSheet): any[] {
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
  if (rawRows.length === 0) return [];

  // Find the first row containing at least one non-empty value
  let headerIndex = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row && row.some(cell => String(cell ?? '').trim() !== '')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return [];

  const headers = rawRows[headerIndex].map(h => String(h ?? '').trim());

  const parsedRows: any[] = [];
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every(cell => String(cell ?? '').trim() === '')) {
      continue; // Skip empty rows
    }
    const parsedRow: any = {};
    headers.forEach((header, colIndex) => {
      if (header) {
        parsedRow[header] = row[colIndex] ?? '';
      }
    });
    parsedRows.push(parsedRow);
  }

  return parsedRows;
}
