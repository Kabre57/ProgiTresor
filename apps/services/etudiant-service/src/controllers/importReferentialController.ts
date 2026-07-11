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

    const workbook = XLSX.read((req as any).file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = parseExcelSheet(worksheet);

    if (rows.length === 0) {
      res.status(400).json({ error: 'Le fichier est vide ou invalide.' });
      return;
    }

    const rowKeys = Object.keys(rows[0]);
    const findKey = (name: string) => {
      const cleanName = name.replace(/[\s_-]/g, '').toLowerCase();
      return rowKeys.find(k => k.trim().replace(/[\s_-]/g, '').toLowerCase() === cleanName);
    };

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
      const libelleKey = findKey('libelle');
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
      const libelleKey = findKey('libelle');
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
      const libelleKey = findKey('libelle');
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
      const libelleKey = findKey('libelle');
      const typeFluxCodeKey = findKey('typefluxcode') || findKey('type flux') || findKey('typeflux') || findKey('flux');
      if (!codeKey || !libelleKey || !typeFluxCodeKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit contenir : code, libelle, typefluxcode.' });
        return;
      }
      const fluxList = await prisma.typeFlux.findMany({ select: { id: true, code: true, libelle: true } });
      const fluxMap = new Map<string, number>();
      fluxList.forEach(f => {
        fluxMap.set(f.code.toUpperCase(), f.id);
        fluxMap.set(f.libelle.toUpperCase(), f.id);
      });
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const code = rowValue(row, codeKey);
        const libelle = rowValue(row, libelleKey);
        const fCode = rowValue(row, typeFluxCodeKey).toUpperCase();
        if (!code || !libelle || !fCode) { errors.push(`Ligne ${i+2} : Informations manquantes.`); continue; }
        const typeFluxId = fluxMap.get(fCode);
        if (!typeFluxId) { errors.push(`Ligne ${i+2} : TypeFlux avec le code ou libellé ${fCode} inexistant.`); continue; }
        dataToCreate.push({ code, libelle, typeFluxId });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.typeRecette.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    }
    else if (entity === 'nomenclatures') {
      const codeProduitKey = findKey('codeproduit') || findKey('code');
      let libelleKey = findKey('libelle') || findKey('libellestandard') || findKey('libelle standard');
      
      // Fallback for unnamed/empty second column (commonly index 1)
      if (!libelleKey && rowKeys.length > 1) {
        const secondKey = rowKeys[1];
        if (secondKey.toLowerCase().startsWith('unnamed') || secondKey.trim() === '') {
          libelleKey = secondKey;
        }
      }

      const typeRecetteCodeKey = findKey('typerecettecode') || findKey('type recette') || findKey('typerecette');
      const montantKey = findKey('montant');
      const regexPatternKey = findKey('regexpattern') || findKey('regex') || findKey('pattern');

      if (!codeProduitKey || !libelleKey || !typeRecetteCodeKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit au moins contenir : codeproduit, libelle, typerecettecode.' });
        return;
      }

      // Auto-create missing TypeRecettes if they don't exist in the database
      const trCodes = new Set<string>();
      const trLibKey = findKey('typerecettelibelle');
      rows.forEach(row => {
        const val = rowValue(row, typeRecetteCodeKey).trim().toUpperCase();
        if (val) trCodes.add(val);
      });

      if (trCodes.size > 0) {
        const existingRecettes = await prisma.typeRecette.findMany({
          where: { code: { in: Array.from(trCodes) } },
          select: { code: true }
        });
        const existingCodes = new Set(existingRecettes.map(r => r.code.toUpperCase()));
        const missingCodes = Array.from(trCodes).filter(c => !existingCodes.has(c));

        if (missingCodes.length > 0) {
          const defaultFlux = await prisma.typeFlux.findFirst();
          if (!defaultFlux) {
            res.status(400).json({ error: "Impossible de créer automatiquement les types de recettes car aucun type de flux n'existe." });
            return;
          }

          const trData = missingCodes.map(code => {
            // Check if there is a custom libelle in the row
            let libelle = code;
            if (trLibKey) {
              const matchingRow = rows.find(r => rowValue(r, typeRecetteCodeKey).trim().toUpperCase() === code);
              if (matchingRow) {
                libelle = rowValue(matchingRow, trLibKey) || code;
              }
            }
            return { code, libelle, typeFluxId: defaultFlux.id };
          });

          await prisma.typeRecette.createMany({ data: trData, skipDuplicates: true });
          logger.info(`Auto-created ${trData.length} missing TypeRecette records during nomenclatures import.`);
        }
      }

      const [recettes] = await Promise.all([
        prisma.typeRecette.findMany({ select: { id: true, code: true, libelle: true } })
      ]);

      const recetteMap = new Map<string, number>();
      recettes.forEach(r => {
        recetteMap.set(r.code.toUpperCase(), r.id);
        recetteMap.set(r.libelle.toUpperCase(), r.id);
      });





      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        const codeProduit = rowValue(row, codeProduitKey);
        const libelle = rowValue(row, libelleKey);
        const trCode = rowValue(row, typeRecetteCodeKey).toUpperCase();

        const montantVal = montantKey && row[montantKey] ? parseInt(String(row[montantKey]).trim(), 10) : 0;
        const regexPattern = regexPatternKey ? rowValue(row, regexPatternKey) : null;

        if (!codeProduit || !libelle || !trCode) { errors.push(`Ligne ${i+2} : Informations indispensables manquantes.`); continue; }

        const typeRecetteId = recetteMap.get(trCode);
        if (!typeRecetteId) { errors.push(`Ligne ${i+2} : TypeRecette avec le code ou libellé ${trCode} inexistant.`); continue; }



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
