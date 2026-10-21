export const isExcelFileName = (name: string): boolean => /\.(xlsx|xls)$/i.test(name);

/** Reconnaît les classeurs Excel ZIP, OLE et XML Spreadsheet 2003. */
export const isExcelUpload = (file: { originalname: string; buffer: Uint8Array }): boolean => {
  if (!isExcelFileName(file.originalname)) return false;
  const bytes = file.buffer;
  if (/\.xlsx$/i.test(file.originalname)) {
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }
  const oleHeader = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (oleHeader.every((byte, index) => bytes[index] === byte)) return true;
  const xml = String.fromCharCode(...bytes.slice(0, 2048));
  return xml.includes('<Workbook') && xml.includes('urn:schemas-microsoft-com:office:spreadsheet');
};
