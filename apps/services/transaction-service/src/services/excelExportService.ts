type CellValue = string | number | boolean | Date | null | undefined;

export type WorkbookSheet = {
  name: string;
  headers: string[];
  rows: CellValue[][];
  widths?: number[];
  currencyColumns?: number[];
};

export type WorkbookFormat = 'xlsx' | 'xls';

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const escapeXml = (value: CellValue) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const sanitizeSheetName = (name: string, index: number) => {
  const sanitized = name.replace(/[\[\]:*?/\\]/g, ' ').trim() || `Feuille ${index + 1}`;
  return sanitized.slice(0, 31);
};

const getColumnName = (index: number) => {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

const crc32 = (buffer: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const createZip = (files: Array<{ name: string; data: Buffer }>) => {
  const chunks: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name);
    const data = file.data;
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30 + name.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    name.copy(localHeader, 30);

    chunks.push(localHeader, data);

    const centralHeader = Buffer.alloc(46 + name.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    name.copy(centralHeader, 46);
    centralDirectory.push(centralHeader);

    offset += localHeader.length + data.length;
  }

  const centralStart = offset;
  const centralBuffer = Buffer.concat(centralDirectory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuffer, end]);
};

const buildXlsxSheetXml = (sheet: WorkbookSheet) => {
  const widths = sheet.widths ?? sheet.headers.map((header) => Math.max(12, Math.min(36, header.length + 4)));
  const currencyColumns = new Set(sheet.currencyColumns ?? []);
  const cols = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');

  const rows = [sheet.headers, ...sheet.rows]
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${getColumnName(columnIndex)}${rowIndex + 1}`;
          if (rowIndex === 0) {
            return `<c r="${ref}" t="inlineStr" s="1"><is><t>${escapeXml(value)}</t></is></c>`;
          }
          if (typeof value === 'number') {
            const style = currencyColumns.has(columnIndex) ? ' s="2"' : '';
            return `<c r="${ref}"${style}><v>${value}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  return Buffer.from(
    `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${rows}</sheetData></worksheet>`,
  );
};

const buildXlsx = (sheets: WorkbookSheet[]) => {
  const normalizedSheets = sheets.map((sheet, index) => ({
    ...sheet,
    name: sanitizeSheetName(sheet.name, index),
  }));

  const sheetOverrides = normalizedSheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('');
  const workbookSheets = normalizedSheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join('');
  const workbookRels = normalizedSheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('');

  const files = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(
        `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetOverrides}</Types>`,
      ),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(
        `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from(
        `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from(
        `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      ),
    },
    {
      name: 'xl/styles.xml',
      data: Buffer.from(
        `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
      ),
    },
    ...normalizedSheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: buildXlsxSheetXml(sheet),
    })),
  ];

  return createZip(files);
};

const getSpreadsheetXmlCell = (value: CellValue, styleId?: string) => {
  const type = typeof value === 'number' ? 'Number' : 'String';
  const style = styleId ? ` ss:StyleID="${styleId}"` : '';
  return `<Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
};

const buildXls = (sheets: WorkbookSheet[]) => {
  const worksheetXml = sheets
    .map((sheet, index) => {
      const name = sanitizeSheetName(sheet.name, index);
      const currencyColumns = new Set(sheet.currencyColumns ?? []);
      const widths = sheet.widths ?? sheet.headers.map((header) => Math.max(70, header.length * 7));
      const columns = widths.map((width) => `<Column ss:Width="${Math.max(width, 12)}"/>`).join('');
      const headerRow = `<Row>${sheet.headers.map((header) => getSpreadsheetXmlCell(header, 'header')).join('')}</Row>`;
      const rows = sheet.rows
        .map(
          (row) =>
            `<Row>${row
              .map((value, columnIndex) => getSpreadsheetXmlCell(value, currencyColumns.has(columnIndex) ? 'currency' : undefined))
              .join('')}</Row>`,
        )
        .join('');
      return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${columns}${headerRow}${rows}</Table></Worksheet>`;
    })
    .join('');

  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="header"><Font ss:Bold="1"/></Style><Style ss:ID="currency"><NumberFormat ss:Format="#,##0"/></Style></Styles>${worksheetXml}</Workbook>`,
    'utf8',
  );
};

export const buildWorkbook = (sheets: WorkbookSheet[], format: WorkbookFormat) =>
  format === 'xls' ? buildXls(sheets) : buildXlsx(sheets);

export const getWorkbookContentType = (format: WorkbookFormat) =>
  format === 'xls'
    ? 'application/vnd.ms-excel; charset=utf-8'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
