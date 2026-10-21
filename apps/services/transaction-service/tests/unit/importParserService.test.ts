import * as XLSX from 'xlsx';
import { normalizeFinancialLabel, parseXLSXBuffer, parseImportFile } from '../../src/services/importParserService';

describe('ImportParserService', () => {
  describe('Excel header formats', () => {
    it.each(['xlsx', 'xls'] as const)('parses %s workbooks and trims imported values', (bookType) => {
      const sheet = XLSX.utils.aoa_to_sheet([
        ['reference ', 'date', 'montant', 'matricule', 'nom payeur', 'produit'],
        [' REF-TRIM ', '2026-07-01T09:00:00Z', 5000, '21p-0154', ' KONE ', ' ANNEXE '],
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Transactions');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType });
      const result = parseImportFile(buffer, 'XLSX');
      expect(result).toHaveLength(1);
      expect(result[0].refTresor).toBe('REF-TRIM');
      expect(result[0].etudiantMatricule).toBe('21P-0154');
      expect(result[0].nomPayeurBrut).toBe('KONE');
      expect(result[0].libelleProduitBrut).toBe('ANNEXE');
    });
  });

  describe('parseXLSXBuffer', () => {
    it('should correctly parse Excel data', () => {
      // Generate a mock Excel workbook in memory
      const headers = ['REFERENCE', 'DATE', 'MONTANT', 'MATRICULE', 'NOM PAYEUR', 'PRODUIT'];
      const data = [
        ['REF-XLS-1', new Date('2026-07-01T10:00:00Z'), 75000, '22P-1234', 'KOFFI', 'SCOLARITE'],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DONNEE');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      const result = parseXLSXBuffer(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].refTresor).toBe('REF-XLS-1');
      expect(result[0].montant).toBe(75000);
      expect(result[0].etudiantMatricule).toBe('22P-1234');
      expect(result[0].nomPayeurBrut).toBe('KOFFI');
      expect(result[0].libelleProduitBrut).toBe('SCOLARITE');
      expect(result[0].typeFluxId).toBeUndefined();
    });
  });

  describe('normalizeFinancialLabel', () => {
    it('should normalize labels before dynamic nomenclature matching', () => {
      expect(normalizeFinancialLabel('  Frais  d’inscription_L1-école  ')).toBe("FRAIS D'INSCRIPTION L1 ECOLE");
    });
  });

  describe('parseImportFile', () => {
    it('parses an Excel workbook using the import type', () => {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ['reference', 'date', 'montant', 'matricule', 'payeur', 'produit'],
        ['REF-EXCEL', '2026-07-01T09:00:00.000Z', 1000, '21P-0001', 'KONE', 'SCOLARITE'],
      ]), 'Transactions');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const result = parseImportFile(buffer, 'XLSX');
      expect(result).toHaveLength(1);
      expect(result[0].refTresor).toBe('REF-EXCEL');
    });
  });
});
