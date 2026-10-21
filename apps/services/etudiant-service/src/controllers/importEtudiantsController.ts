import { findImportColumn, findImportReferences, normalizeImportLabel } from '../../../../../shared/utils/importReferences';
import { isExcelUpload } from '../../../../../shared/utils/excelFiles';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import * as XLSX from 'xlsx';
import { rowValue, parseExcelSheet } from '../utils/excelUtils';

export const importEtudiants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(req as any).file) {
      res.status(400).json({ error: 'Fichier manquant.' });
      return;
    }

    if (!isExcelUpload((req as any).file)) {
      res.status(400).json({ error: 'Sélectionnez un fichier Excel valide (.xlsx ou .xls).' });
      return;
    }

    const workbook = XLSX.read((req as any).file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = parseExcelSheet(worksheet);

    if (rows.length === 0) {
      res.status(400).json({ error: 'Le fichier est vide ou invalide.' });
      return;
    }

    const findKey = (...names: string[]) => findImportColumn(Object.keys(rows[0]), ...names);
    const matriculeKey = findKey('matricule');
    const nomKey = findKey('nom');
    const prenomKey = findKey('prénom');
    const nomCompletKey = findKey('nom complet');
    const antenneKey = findKey('antenne', 'code antenne', 'nom antenne', 'antenne infas', 'antenneId');
    const filiereKey = findKey('filière', 'code filière', 'libellé filière', 'filiereId');
    const statutKey = findKey('statut', 'code statut', 'libellé statut', 'statutId');
    const promotionKey = findKey('promotion', 'nom promotion', 'promotionNom', 'promotionId');
    const niveauKey = findKey('niveau', 'niveau promotion', 'cycle');
    const matriculeTresorPayKey = findKey('matricule Trésor Pay', 'tresorpay');

    if (!matriculeKey || (!nomCompletKey && (!nomKey || !prenomKey)) || !antenneKey || !filiereKey || !statutKey || !promotionKey) {
      res.status(400).json({
        error: 'Colonnes requises : Matricule, Nom, Prénom (ou Nom complet), Antenne, Filière, Statut et Promotion. Ajouter Niveau si le nom de promotion existe pour plusieurs niveaux.',
      });
      return;
    }

    const [antennes, filieres, statuts, promotions] = await Promise.all([
      prisma.antenne.findMany({ select: { id: true, code: true, nom: true } }),
      prisma.filiere.findMany({ select: { id: true, code: true, libelle: true, abreviation: true } }),
      prisma.statutEtudiant.findMany({ select: { id: true, code: true, libelle: true } }),
      prisma.promotion.findMany({ select: { id: true, nom: true, niveau: true } })
    ]);

    const etudiantToCreate: any[] = [];
    const errors: string[] = [];
    const seenMtp = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const matricule = rowValue(row, matriculeKey).toUpperCase();
      let nom = rowValue(row, nomKey);
      let prenom = rowValue(row, prenomKey);
      if (!nom && !prenom && nomCompletKey) {
        const [familyName, ...givenNames] = rowValue(row, nomCompletKey).split(/\s+/);
        nom = familyName || '';
        prenom = givenNames.join(' ');
      }
      if (!matricule || !nom || !prenom) {
        errors.push(`Ligne ${rowNum} : Matricule, nom et prénom obligatoires.`);
        continue;
      }
      const errorCount = errors.length;
      const resolve = <T extends { id: number }>(
        field: string, key: string | undefined, items: T[],
        codes: (item: T) => unknown[], labels: (item: T) => unknown[],
      ): T | undefined => {
        const value = rowValue(row, key);
        const legacyIdColumn = key && /id$/i.test(key);
        const matches = legacyIdColumn && /^\d+$/.test(value)
          ? items.filter(item => item.id === Number(value))
          : findImportReferences(value, items, codes, labels);
        if (matches.length === 1) return matches[0];
        errors.push(!value
          ? `Ligne ${rowNum} : ${field} manquant.`
          : matches.length > 1
          ? `Ligne ${rowNum} : ${field} « ${value} » ambigu ; préciser son code ou, pour une promotion, la colonne Niveau.`
          : `Ligne ${rowNum} : ${field} « ${value} » introuvable dans les référentiels.`);
        return undefined;
      };
      const antenne = resolve('Antenne', antenneKey, antennes, a => [a.code], a => [a.nom]);
      const filiere = resolve('Filière', filiereKey, filieres, f => [f.code, f.abreviation], f => [f.libelle]);
      const statut = resolve('Statut', statutKey, statuts, s => [s.code], s => [s.libelle]);
      const niveau = rowValue(row, niveauKey);
      const availablePromotions = niveau
        ? promotions.filter(p => normalizeImportLabel(p.niveau) === normalizeImportLabel(niveau))
        : promotions;
      const promotion = resolve('Promotion', promotionKey, availablePromotions, () => [], p => [p.nom]);
      if (errors.length > errorCount || !antenne || !filiere || !statut || !promotion) continue;

      const matriculeTresorPay = rowValue(row, matriculeTresorPayKey) || matricule;
      if (seenMtp.has(matriculeTresorPay.toUpperCase())) {
        errors.push(`Ligne ${rowNum} : Matricule Trésor Pay « ${matriculeTresorPay} » répété dans le fichier.`);
        continue;
      }
      seenMtp.add(matriculeTresorPay.toUpperCase());
      etudiantToCreate.push({
        matricule, nom: nom.toUpperCase(), prenom,
        antenneId: antenne.id, filiereId: filiere.id, statutId: statut.id,
        prefixeMatricule: null, promotionString: promotion.nom, promotionId: promotion.id,
        matriculeTresorPay,
      });
    }

    let createdCount = 0;
    let duplicateCount = 0;

    if (etudiantToCreate.length > 0) {
      const chunkSize = 5000;
      for (let i = 0; i < etudiantToCreate.length; i += chunkSize) {
        const chunk = etudiantToCreate.slice(i, i + chunkSize);
        const result = await prisma.etudiant.createMany({
          data: chunk,
          skipDuplicates: true
        });
        createdCount += result.count;
      }
      duplicateCount = etudiantToCreate.length - createdCount;
    }

    res.json({
      message: 'Importation terminée.',
      created: createdCount,
      duplicates_skipped: duplicateCount,
      errors: errors.length > 0 ? errors : null
    });
  } catch (err) {
    logger.error(err, 'Failed to import etudiant');
    next(err);
  }
};
