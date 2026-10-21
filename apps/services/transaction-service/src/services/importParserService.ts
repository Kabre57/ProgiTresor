import * as XLSX from 'xlsx';
import { AppError } from '../utils/errors';

export interface ParsedTransactionItem {
  refTresor: string;
  montant: number;
  dateHeure: Date;
  typeFluxId?: number | null;
  antenneId?: number | null;
  nomenclatureId?: number | null;
  nomenclature?: string | null;
  matriculeTresorPay?: string | null;
  etudiantMatricule?: string | null;
  nomPayeurBrut?: string | null;
  contactPayeur?: string | null;
  libelleProduitBrut?: string | null;
  filiere?: string | null;
  niveau?: string | null;
  versement?: string | null;
  typeFrais?: string | null;
  antenne?: string | null;
  typeRecette?: string | null;
  typeFlux?: string | null;
}

const requiredFields: Array<{ field: keyof ParsedTransactionItem; label: string }> = [
  { field: 'refTresor', label: 'reference' },
  { field: 'dateHeure', label: 'date' },
  { field: 'montant', label: 'montant' },
  { field: 'etudiantMatricule', label: 'matricule' },
  { field: 'nomPayeurBrut', label: 'payeur' },
  { field: 'libelleProduitBrut', label: 'produit' },
];

export const normalizeFinancialLabel = (value: unknown): string => String(value ?? '')
  .trim()
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’`]/g, "'")
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ');

const headerMap: Record<string, keyof ParsedTransactionItem> = {
  'reference tresor': 'refTresor',
  'reference': 'refTresor',
  'ref_tresor': 'refTresor',
  'reftresor': 'refTresor',
  'date/heure': 'dateHeure',
  'date': 'dateHeure',
  'dateheure': 'dateHeure',
  'date_heure': 'dateHeure',
  'montant': 'montant',
  'etudiant': 'etudiantMatricule',
  'matricule': 'etudiantMatricule',
  'matriculeetudiant': 'etudiantMatricule',
  'etudiantmatricule': 'etudiantMatricule',
  'matricule tresor pay': 'matriculeTresorPay',
  'matriculetresorpay': 'matriculeTresorPay',
  'payeur': 'nomPayeurBrut',
  'nom payeur': 'nomPayeurBrut',
  'nompayeurbrut': 'nomPayeurBrut',
  'nom_payeur_brut': 'nomPayeurBrut',
  'contact payeur': 'contactPayeur',
  'contact_payeur': 'contactPayeur',
  'contactpayeur': 'contactPayeur',
  'libelle produit': 'libelleProduitBrut',
  'produit': 'libelleProduitBrut',
  'libelleproduitbrut': 'libelleProduitBrut',
  'libelle_produit_brut': 'libelleProduitBrut',
  'nomenclature': 'nomenclature',
  'libelle nomenclature': 'nomenclature',
  'designation': 'libelleProduitBrut',
  'type_flux_id': 'typeFluxId',
  'typefluxid': 'typeFluxId',
  'filiere': 'filiere',
  'niveau': 'niveau',
  'versement': 'versement',
  'type frais': 'typeFrais',
  'type_frais': 'typeFrais',
  'typefrais': 'typeFrais',
  'antenne': 'antenne',
  'antenneid': 'antenne',
  'antenne id': 'antenne',
  'antenne_id': 'antenne',
  'type recette': 'typeRecette',
  'type de recette': 'typeRecette',
  'type_recette': 'typeRecette',
  'typerecette': 'typeRecette',
  'type flux': 'typeFlux',
  'type de flux': 'typeFlux',
  'flux': 'typeFlux',
  'type_flux': 'typeFlux',
  'typeflux': 'typeFlux',
};

/**
 * Normalise un libellé d'en-tête (minuscules, sans accents ni espaces superflus).
 */
const normalizeHeader = (header: string): string => {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Nettoie une valeur de cellule brute de type string.
 */
const cleanStringValue = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
};

/**
 * Parse une date de manière flexible (supporte ISO et DD/MM/YYYY HH:mm:ss).
 */
const parseFlexibleDate = (value: unknown): Date => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date(NaN) : value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = XLSX.SSF.parse_date_code(value);
    return date
      ? new Date(date.y, date.m - 1, date.d, date.H, date.M, date.S)
      : new Date(NaN);
  }
  if (value === undefined || value === null || String(value).trim() === '') return new Date(NaN);

  const str = String(value).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;

    const parsedDate = new Date(year, month, day, hour, min, sec);
    if (parsedDate.getFullYear() === year && parsedDate.getMonth() === month && parsedDate.getDate() === day) return parsedDate;
  }

  return new Date(NaN);
};

/**
 * Parse un fichier Excel (XLSX/XLS) depuis un buffer.
 */
export const parseXLSXBuffer = (buffer: Buffer): ParsedTransactionItem[] => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new AppError(400, 'Le fichier Excel ne contient aucune feuille.');
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (jsonData.length === 0) {
    throw new AppError(400, 'Le fichier ne contient aucune transaction à importer.');
  }

  const availableFields = new Set(Object.keys(jsonData[0]).map(key => headerMap[normalizeHeader(key)]).filter(Boolean));
  const missingHeaders = requiredFields.filter(({ field }) => !availableFields.has(field)).map(({ label }) => label);
  if (missingHeaders.length > 0) {
    throw new AppError(400, `Colonnes requises manquantes : ${missingHeaders.join(', ')}. Modèle attendu : reference, date, montant, matricule, payeur, produit.`);
  }

  const items: ParsedTransactionItem[] = [];
  const rowErrors: string[] = [];

  for (const [rowIndex, row] of jsonData.entries()) {
    const item: Partial<ParsedTransactionItem> = {};

    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeHeader(key);
      const mappedKey = headerMap[normalizedKey];
      if (!mappedKey) continue;

      const rawVal = row[key];

      if (mappedKey === 'montant') {
        const normalizedAmount = typeof rawVal === 'string'
          ? rawVal.trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.')
          : rawVal;
        item.montant = Number(normalizedAmount);
      } else if (mappedKey === 'typeFluxId') {
        item.typeFluxId = Number(rawVal) || null;
      } else if (mappedKey === 'dateHeure') {
        item.dateHeure = parseFlexibleDate(rawVal);
      } else if (mappedKey === 'etudiantMatricule') {
        item.etudiantMatricule = rawVal ? String(rawVal).trim().toUpperCase() : null;
      } else {
        (item as any)[mappedKey] = cleanStringValue(rawVal);
      }
    }

    const rowNumber = rowIndex + 2;
    const rowMissing = requiredFields
      .filter(({ field }) => {
        const value = item[field];
        if (field === 'dateHeure') return !(value instanceof Date) || Number.isNaN(value.getTime());
        if (field === 'montant') return typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0;
        return typeof value !== 'string' || value.trim() === '';
      })
      .map(({ label }) => label);

    if (rowMissing.length > 0) {
      rowErrors.push(`Ligne ${rowNumber} : ${rowMissing.join(', ')} ${rowMissing.length === 1 ? 'manquant ou invalide' : 'manquants ou invalides'}.`);
      continue;
    }

    items.push(item as ParsedTransactionItem);
  }

  if (rowErrors.length > 0) {
    const details = rowErrors.slice(0, 10).join(' ');
    const remaining = rowErrors.length > 10 ? ` ${rowErrors.length - 10} autre(s) ligne(s) invalide(s).` : '';
    throw new AppError(400, `${details}${remaining}`);
  }

  return items;
};

/**
 * Parseur général de fichier selon le type.
 */
export const parseImportFile = (
  buffer: Buffer,
  typeFichier: 'XLSX'
): ParsedTransactionItem[] => {
  if (typeFichier === 'XLSX') {
    return parseXLSXBuffer(buffer);
  }
  throw new AppError(400, `Type de fichier non supporté pour le traitement : ${typeFichier}`);
};
