import * as XLSX from 'xlsx';
import { normalizeFinancialLabel, parseCSVBuffer, parseXLSXBuffer, parseImportFile } from '../../src/services/importParserService';

describe('ImportParserService', () => {
  describe('parseCSVBuffer', () => {
    it('should correctly parse CSV data with various header formats', () => {
      const csvContent = 
        'REFERENCE;DATE/HEURE;MONTANT;MATRICULE;NOM PAYEUR;PRODUIT\n' +
        'REF-001;2026-07-01T09:00:00.000Z;150000;21p-0154asib;KOUAME AFFOUE MARIE;Frais Scolarite\n' +
        'REF-002;2026-07-01T10:00:00.000Z;30000;22p-0987bke;TRAORE BAKARY;Frais Annexes';

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = parseCSVBuffer(buffer);

      expect(result).toHaveLength(2);
      expect(result[0].refTresor).toBe('REF-001');
      expect(result[0].montant).toBe(150000);
      expect(result[0].dateHeure).toBeInstanceOf(Date);
      expect(result[0].etudiantMatricule).toBe('21P-0154ASIB'); // Checked uppercase conversion
      expect(result[0].nomPayeurBrut).toBe('KOUAME AFFOUE MARIE');
      expect(result[0].libelleProduitBrut).toBe('Frais Scolarite');
      expect(result[0].typeFluxId).toBeUndefined();
      expect(result[0].typeFrais).toBeUndefined();

      expect(result[1].refTresor).toBe('REF-002');
      expect(result[1].etudiantMatricule).toBe('22P-0987BKE');
      expect(result[1].typeFluxId).toBeUndefined();
      expect(result[1].typeFrais).toBeUndefined();
    });

    it('should clean string values and trim spaces', () => {
      const csvContent = 
        'reference ; date ; montant ; matricule ; nom payeur ; produit \n' +
        ' REF-TRIM ; 2026-07-01T09:00:00Z ; 5000 ; 21P-0154 ; KONE ; ANNEXE ';

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = parseCSVBuffer(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].refTresor).toBe('REF-TRIM');
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
    it('should parse based on the type parameter', () => {
      const csvContent = 
        'REFERENCE;DATE/HEURE;MONTANT\n' +
        'REF-CSV;2026-07-01T09:00:00.000Z;1000';
      const buffer = Buffer.from(csvContent, 'utf-8');

      const result = parseImportFile(buffer, 'CSV');
      expect(result).toHaveLength(1);
      expect(result[0].refTresor).toBe('REF-CSV');
    });
  });
});
