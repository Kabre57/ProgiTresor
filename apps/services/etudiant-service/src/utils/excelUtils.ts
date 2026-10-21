import * as XLSX from 'xlsx';

export const rowValue = (row: any, key: string | undefined): string => {
  return key ? String(row[key] ?? '').trim() : '';
};

// Robust helper to parse Excel sheet, skipping empty top rows and auto-detecting headers
export function parseExcelSheet(worksheet: XLSX.WorkSheet): any[] {
  // Excel peut déclarer une feuille entière utilisée à cause de sa mise en forme.
  // Parcourir uniquement la zone contenant des valeurs évite de matérialiser
  // des millions de lignes et colonnes vides pendant un petit import.
  let firstRow = Infinity, lastRow = -1, firstColumn = Infinity, lastColumn = -1;
  for (const address of Object.keys(worksheet)) {
    if (address.startsWith('!')) continue;
    const cell = worksheet[address] as XLSX.CellObject | undefined;
    if (!cell || cell.v === undefined || cell.v === null || String(cell.v).trim() === '') continue;
    const { r, c } = XLSX.utils.decode_cell(address);
    firstRow = Math.min(firstRow, r); lastRow = Math.max(lastRow, r);
    firstColumn = Math.min(firstColumn, c); lastColumn = Math.max(lastColumn, c);
  }
  if (lastRow < 0) return [];
  const range = { s: { r: firstRow, c: firstColumn }, e: { r: lastRow, c: lastColumn } };
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', range });
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
