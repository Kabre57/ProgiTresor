import * as XLSX from 'xlsx';
import { AppError } from '../utils/errors';

export interface ParsedTransactionItem {
  refTresor: string;
  montant: number;
  dateHeure: Date;
  typeFluxId?: number | null;
  etudiantMatricule?: string | null;
  nomPayeurBrut?: string | null;
  contactPayeur?: string | null;
  libelleProduitBrut?: string | null;
  filiere: string;
  niveau: string;
  versement?: string | null;
  typeFrais?: string | null;
  antenne: string;
  typeRecette: string;
  typeFlux: string;
}

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
  'type_recette': 'typeRecette',
  'typerecette': 'typeRecette',
  'type flux': 'typeFlux',
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
  if (value instanceof Date) return value;
  if (!value) return new Date();

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
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return new Date(NaN);
};

export const parseCSVBuffer = (buffer: Buffer): ParsedTransactionItem[] => {
  return parseXLSXBuffer(buffer);
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

  const items: ParsedTransactionItem[] = [];

  for (const row of jsonData) {
    const item: Partial<ParsedTransactionItem> = {};

    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeHeader(key);
      const mappedKey = headerMap[normalizedKey];
      if (!mappedKey) continue;

      const rawVal = row[key];

      if (mappedKey === 'montant') {
        item.montant = Number(rawVal) || 0;
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

    if (item.refTresor && item.montant !== undefined && item.dateHeure) {
      items.push(item as ParsedTransactionItem);
    }
  }

  return items;
};

/**
 * Parseur général de fichier selon le type.
 */
export const parseImportFile = (
  buffer: Buffer,
  typeFichier: 'CSV' | 'XLSX'
): ParsedTransactionItem[] => {
  if (typeFichier === 'CSV') {
    return parseCSVBuffer(buffer);
  } else if (typeFichier === 'XLSX') {
    return parseXLSXBuffer(buffer);
  }
  throw new AppError(400, `Type de fichier non supporté pour le traitement : ${typeFichier}`);
};
