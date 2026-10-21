import { findImportColumn, findImportReferences } from '../../../../../shared/utils/importReferences';
import { isExcelUpload } from '../../../../../shared/utils/excelFiles';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import * as XLSX from 'xlsx';
import { rowValue, parseExcelSheet } from '../utils/excelUtils';
import { invalidateReferential } from '../services/referentialCache';

export const importReferential = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { entity } = req.params;
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

    const rowKeys = Object.keys(rows[0]);
    const findKey = (...names: string[]) => findImportColumn(rowKeys, ...names);

    let createdCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];

    if (entity === 'promotions') {
      const nomKey = findKey('nom');
      const ordreKey = findKey('ordre');
      const niveauKey = findKey('niveau');
      if (!nomKey || !ordreKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit contenir : nom, ordre.' });
        return;
      }
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nom = rowValue(row, nomKey);
        const ordre = parseInt(rowValue(row, ordreKey), 10);
        const niveau = niveauKey ? rowValue(row, niveauKey) : '';
        if (!nom) { errors.push(`Ligne ${i+2} : Nom de promotion manquant.`); continue; }
        if (isNaN(ordre)) { errors.push(`Ligne ${i+2} : Ordre invalide.`); continue; }
        dataToCreate.push({ nom, ordre, niveau });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.promotion.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    }
    else if (entity === 'antennes') {
      const codeKey = findKey('code');
      const nomKey = findKey('nom');
      const villeKey = findKey('ville');
      if (!codeKey || !nomKey || !villeKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit contenir : code, nom, ville.' });
        return;
      }
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const code = rowValue(row, codeKey);
        const nom = rowValue(row, nomKey);
        const ville = rowValue(row, villeKey);
        if (!code || !nom || !ville) { errors.push(`Ligne ${i+2} : Informations manquantes (code, nom, ou ville).`); continue; }
        dataToCreate.push({ code, nom, ville });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.antenne.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    }
    else if (entity === 'filieres') {
      const codeKey = findKey('code');
      const libelleKey = findKey('libellé', 'désignation');
      const abreviationKey = findKey('abreviation') || findKey('abbreviation');
      if (!libelleKey) {
        res.status(400).json({ error: 'Colonne requise manquante. Le fichier doit au moins contenir la colonne : libelle.' });
        return;
      }
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const libelle = rowValue(row, libelleKey);
        if (!libelle || libelle.trim() === '') { errors.push(`Ligne ${i+2} : Libellé manquant.`); continue; }

        // Génération automatique (3 premières lettres majuscules sans accent ni caractères spéciaux)
        const cleanLib = libelle.trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");
        const autoValue = cleanLib.substring(0, 3) || 'FIL';

        let code = codeKey ? rowValue(row, codeKey).trim().toUpperCase() : '';
        if (!code) code = autoValue;

        let abreviation = abreviationKey ? rowValue(row, abreviationKey).trim() : '';
        if (!abreviation) abreviation = autoValue;

        dataToCreate.push({ code, libelle: libelle.trim(), abreviation });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.filiere.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    }

    else if (entity === 'statuts-etudiants' || entity === 'statuts') {
      const codeKey = findKey('code');
      const libelleKey = findKey('libellé', 'désignation');
      if (!codeKey || !libelleKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit contenir : code, libelle.' });
        return;
      }
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const code = rowValue(row, codeKey);
        const libelle = rowValue(row, libelleKey);
        if (!code || !libelle) { errors.push(`Ligne ${i+2} : Code ou libellé manquant.`); continue; }
        dataToCreate.push({ code, libelle });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.statutEtudiant.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    }
    else if (entity === 'types-flux') {
      const codeKey = findKey('code');
      const libelleKey = findKey('libellé', 'désignation');
      if (!codeKey || !libelleKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit contenir : code, libelle.' });
        return;
      }
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const code = rowValue(row, codeKey);
        const libelle = rowValue(row, libelleKey);
        if (!code || !libelle) { errors.push(`Ligne ${i+2} : Code ou libellé manquant.`); continue; }
        dataToCreate.push({ code, libelle });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.typeFlux.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    }
    else if (entity === 'types-recettes') {
      const codeKey = findKey('code');
      const libelleKey = findKey('libellé', 'désignation');
      const typeFluxCodeKey = findKey('Flux', 'Type de flux', 'Type flux', 'typefluxcode', 'typeflux');
      if (!codeKey || !libelleKey || !typeFluxCodeKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit contenir : Code, Libellé, Flux (code ou libellé).' });
        return;
      }
      const fluxList = await prisma.typeFlux.findMany({ select: { id: true, code: true, libelle: true } });
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const code = rowValue(row, codeKey);
        const libelle = rowValue(row, libelleKey);
        const fCode = rowValue(row, typeFluxCodeKey).toUpperCase();
        if (!code || !libelle || !fCode) { errors.push(`Ligne ${i+2} : Informations manquantes.`); continue; }
        const matches = findImportReferences(fCode, fluxList, f => [f.code], f => [f.libelle]);
        if (matches.length !== 1) {
          errors.push(`Ligne ${i+2} : Flux « ${fCode} » ${matches.length ? 'ambigu ; utiliser son code' : 'introuvable'}.`);
          continue;
        }
        dataToCreate.push({ code, libelle, typeFluxId: matches[0].id });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.typeRecette.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    }
    else if (entity === 'nomenclatures') {
      const codeProduitKey = findKey('codeproduit') || findKey('code');
      let libelleKey = findKey('libellé', 'désignation') || findKey('libellestandard') || findKey('libelle standard');
      
      // Fallback for unnamed/empty second column (commonly index 1)
      if (!libelleKey && rowKeys.length > 1) {
        const secondKey = rowKeys[1];
        if (secondKey.toLowerCase().startsWith('unnamed') || secondKey.trim() === '') {
          libelleKey = secondKey;
        }
      }

      const typeRecetteCodeKey = findKey('Type de recette', 'Type recette', 'Recette', 'typerecettecode', 'typerecettelibelle');
      const montantKey = findKey('montant');
      const regexPatternKey = findKey('regexpattern') || findKey('regex') || findKey('pattern');

      if (!codeProduitKey || !libelleKey || !typeRecetteCodeKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit au moins contenir : Code produit, Libellé, Type de recette (code ou libellé).' });
        return;
      }

      const recettes = await prisma.typeRecette.findMany({ include: { typeFlux: true } });
      const fluxKey = findKey('Flux', 'Type de flux', 'typefluxcode');

      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        const codeProduit = rowValue(row, codeProduitKey);
        const libelle = rowValue(row, libelleKey);
        const trCode = rowValue(row, typeRecetteCodeKey).toUpperCase();

        const montantVal = montantKey && row[montantKey] ? parseInt(String(row[montantKey]).trim(), 10) : 0;
        const regexPattern = regexPatternKey ? rowValue(row, regexPatternKey) : null;

        if (!codeProduit || !libelle || !trCode) { errors.push(`Ligne ${i+2} : Informations indispensables manquantes.`); continue; }

        const fluxValue = rowValue(row, fluxKey);
        const matches = findImportReferences(trCode, recettes, r => [r.code], r => [r.libelle]);
        const selected = fluxValue ? matches.filter(r =>
          findImportReferences(fluxValue, [r.typeFlux], f => [f.code], f => [f.libelle]).length === 1
        ) : matches;
        if (selected.length !== 1) {
          errors.push(`Ligne ${i+2} : Type de recette « ${trCode} » ${selected.length ? 'ambigu ; préciser son code ou la colonne Flux' : 'introuvable dans le flux indiqué ou les référentiels'}.`);
          continue;
        }
        const typeRecetteId = selected[0].id;

        dataToCreate.push({
          codeProduit,
          libelle,
          typeRecetteId,
          montant: !isNaN(montantVal) ? montantVal : 0,
          regexPattern: regexPattern || null,
        });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.nomenclatureProduit.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    } else {
      res.status(400).json({ error: `Type de référentiel non supporté : ${entity}` });
      return;
    }

    // Invalidate caches if needed
    if (['promotions', 'antennes', 'filieres'].includes(entity)) {
      const cacheKey = `referential:${entity}`;
      await invalidateReferential(cacheKey);
    }

    res.json({
      message: 'Importation terminée.',
      created: createdCount,
      duplicates_skipped: duplicateCount,
      errors: errors.length > 0 ? errors : null
    });
  } catch (err) {
    logger.error(err, 'Failed to import referential');
    next(err);
  }
};
