import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import * as XLSX from 'xlsx';

const rowValue = (row: any, key: string | undefined): string => {
  return key ? String(row[key] ?? '').trim() : '';
};

// Robust helper to parse Excel sheet, skipping empty top rows and auto-detecting headers
function parseExcelSheet(worksheet: XLSX.WorkSheet): any[] {
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
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

export const importEtudiants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
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

    const firstRowKeys = Object.keys(rows[0]);
    const findKey = (name: string) => firstRowKeys.find(k => k.trim().toLowerCase() === name.toLowerCase());

    const matriculeKey = findKey('matricule');
    const nomKey = findKey('nom');
    const prenomKey = findKey('prenom');
    const nomCompletKey = findKey('nom complet') || findKey('nomcomplet');
    const antenneIdKey = findKey('antenneid') || findKey('antenne') || findKey('antenne infas');
    const niveauIdKey = findKey('niveauid') || findKey('niveau') || findKey('niveaucode') || findKey('filiereid');
    const statutIdKey = findKey('statutid') || findKey('statut') || findKey('statutcode');
    const matriculeTresorPayKey = findKey('matriculetresorpay') || findKey('matricule tresor pay') || findKey('tresorpay');
    const promotionNomKey = findKey('promotionnom') || findKey('promotion');
    const promotionIdKey = findKey('promotionid');

    // We only strictly require Matricule and either (Nom/Prenom) or Nom Complet
    if (!matriculeKey || (!nomCompletKey && (!nomKey || !prenomKey))) {
      res.status(400).json({
        error: 'Colonnes requises manquantes. Le fichier doit au moins contenir la colonne : matricule, et soit nom/prenom soit nom complet.'
      });
      return;
    }

    const [antennes, niveaux, statuts, promotions] = await Promise.all([
      prisma.antenne.findMany({ select: { id: true, code: true, nom: true } }),
      prisma.niveau.findMany({ select: { id: true, code: true, libelle: true } }),
      prisma.statutEtudiant.findMany({ select: { id: true, code: true, libelle: true } }),
      prisma.promotion.findMany({ select: { id: true, nom: true } })
    ]);

    // Build lookup maps
    const antenneMap = new Map<string, number>();
    antennes.forEach(a => {
      antenneMap.set(a.code.toLowerCase(), a.id);
      antenneMap.set(a.nom.toLowerCase(), a.id);
      antenneMap.set(a.nom.toLowerCase().replace(/\s+/g, ''), a.id);
    });

    const niveauMap = new Map<string, number>();
    niveaux.forEach(n => {
      niveauMap.set(n.code.toLowerCase(), n.id);
      niveauMap.set(n.libelle.toLowerCase(), n.id);
    });

    const statutMap = new Map<string, number>();
    statuts.forEach(s => {
      statutMap.set(s.code.toLowerCase(), s.id);
      statutMap.set(s.libelle.toLowerCase(), s.id);
    });

    const promotionByIdSet = new Set(promotions.map(p => p.id));
    const promotionByNameMap = new Map<string, number>();
    promotions.forEach((p) => {
      promotionByNameMap.set(p.nom.toLowerCase(), p.id);
    });

    // Default Fallbacks
    const defaultAntenneId = antennes[0]?.id || 1;
    const defaultNiveauId = niveaux.find(n => n.code.toUpperCase() === 'L1')?.id || niveaux[0]?.id || 1;
    const defaultStatutId = statuts.find(s => s.code.toUpperCase() === 'PUBLIC')?.id || statuts[0]?.id || 1;
    const defaultPromotion = promotions[0] || { id: 1, nom: 'Première année' };

    const etudiantToCreate: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const matricule = rowValue(row, matriculeKey);
      
      let nom = '';
      let prenom = '';

      if (nomKey || prenomKey) {
        nom = rowValue(row, nomKey);
        prenom = rowValue(row, prenomKey);
      } else if (nomCompletKey) {
        const fullName = rowValue(row, nomCompletKey);
        const parts = fullName.trim().split(/\s+/);
        nom = parts[0] || '';
        prenom = parts.slice(1).join(' ') || 'Élève';
      }

      // Resolve Antenne
      let antenneId = defaultAntenneId;
      if (antenneIdKey) {
        const rawAnt = rowValue(row, antenneIdKey);
        const parsedVal = parseInt(rawAnt, 10);
        if (!isNaN(parsedVal)) {
          antenneId = parsedVal;
        } else {
          const clean = rawAnt.toLowerCase().trim();
          antenneId = antenneMap.get(clean) || 0;
          if (!antenneId) {
            const found = antennes.find(a => 
              clean.includes(a.nom.toLowerCase()) || 
              a.nom.toLowerCase().includes(clean) ||
              clean.includes(a.code.toLowerCase())
            );
            antenneId = found ? found.id : defaultAntenneId;
          }
        }
      }

      // Resolve Niveau
      let niveauId = defaultNiveauId;
      if (niveauIdKey) {
        const rawNiv = rowValue(row, niveauIdKey);
        const parsedVal = parseInt(rawNiv, 10);
        if (!isNaN(parsedVal)) {
          niveauId = parsedVal;
        } else {
          const clean = rawNiv.toLowerCase().trim();
          niveauId = niveauMap.get(clean) || defaultNiveauId;
        }
      }

      // Resolve Statut
      let statutId = defaultStatutId;
      if (statutIdKey) {
        const rawStat = rowValue(row, statutIdKey);
        const parsedVal = parseInt(rawStat, 10);
        if (!isNaN(parsedVal)) {
          statutId = parsedVal;
        } else {
          const clean = rawStat.toLowerCase().trim();
          statutId = statutMap.get(clean) || defaultStatutId;
        }
      }

      // Resolve Promotion
      const promotionNomVal = promotionNomKey ? rowValue(row, promotionNomKey) : undefined;
      const promotionIdVal = promotionIdKey ? parseInt(rowValue(row, promotionIdKey), 10) : NaN;

      let promotionId = defaultPromotion.id;
      let promotionString = defaultPromotion.nom;

      if (!isNaN(promotionIdVal) && promotionByIdSet.has(promotionIdVal)) {
        promotionId = promotionIdVal;
        const promo = promotions.find(p => p.id === promotionId);
        promotionString = promo ? promo.nom : defaultPromotion.nom;
      } else if (promotionNomVal) {
        const resolvedId = promotionByNameMap.get(promotionNomVal.toLowerCase());
        if (resolvedId) {
          promotionId = resolvedId;
          const promo = promotions.find(p => p.id === promotionId);
          promotionString = promo ? promo.nom : defaultPromotion.nom;
        }
      }

      // Resolve Matricule Trésor Pay
      let matriculeTresorPay = matriculeTresorPayKey ? rowValue(row, matriculeTresorPayKey) : undefined;
      if (!matriculeTresorPay || matriculeTresorPay.trim() === '') {
        matriculeTresorPay = matricule;
      }

      const rowNum = i + 2;

      if (!matricule) { errors.push(`Ligne ${rowNum} : Matricule manquant.`); continue; }
      if (!nom) { errors.push(`Ligne ${rowNum} : Nom manquant.`); continue; }
      
      etudiantToCreate.push({
        matricule: matricule.toUpperCase(),
        nom: nom.toUpperCase(),
        prenom,
        antenneId,
        niveauId,
        statutId,
        prefixeMatricule: null,
        promotionString,
        promotionId,
        matriculeTresorPay: matriculeTresorPay.trim(),
      });
    }

    let createdCount = 0;
    let duplicateCount = 0;

    if (etudiantToCreate.length > 0) {
      // Create in chunks of 5000 to prevent database query parameter limits
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
    const findKey = (name: string) => rowKeys.find(k => k.trim().toLowerCase() === name.toLowerCase());

    let createdCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];

    if (entity === 'promotions') {
      const nomKey = findKey('nom');
      const ordreKey = findKey('ordre');
      if (!nomKey || !ordreKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit contenir : nom, ordre.' });
        return;
      }
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nom = rowValue(row, nomKey);
        const ordre = parseInt(rowValue(row, ordreKey), 10);
        if (!nom) { errors.push(`Ligne ${i+2} : Nom de promotion manquant.`); continue; }
        if (isNaN(ordre)) { errors.push(`Ligne ${i+2} : Ordre invalide.`); continue; }
        dataToCreate.push({ nom, ordre });
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
        const result = await prisma.filiere.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    }
    else if (entity === 'niveaux') {
      const codeKey = findKey('code');
      const libelleKey = findKey('libelle');
      const cycleKey = findKey('cycle');
      const anneeEtudeKey = findKey('anneeetude');
      const filiereCodeKey = findKey('filierecode');
      if (!codeKey || !libelleKey || !cycleKey || !anneeEtudeKey || !filiereCodeKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit contenir : code, libelle, cycle, anneeetude, filierecode.' });
        return;
      }
      const filieres = await prisma.filiere.findMany({ select: { id: true, code: true } });
      const filiereMap = new Map(filieres.map(f => [f.code.toUpperCase(), f.id]));
      
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const code = rowValue(row, codeKey);
        const libelle = rowValue(row, libelleKey);
        const cycle = rowValue(row, cycleKey);
        const anneeEtude = parseInt(rowValue(row, anneeEtudeKey), 10);
        const fCode = rowValue(row, filiereCodeKey).toUpperCase();
        if (!code || !libelle || !cycle || isNaN(anneeEtude) || !fCode) { errors.push(`Ligne ${i+2} : Informations incomplètes.`); continue; }
        const filiereId = filiereMap.get(fCode);
        if (!filiereId) { errors.push(`Ligne ${i+2} : Filière avec le code ${fCode} inexistante.`); continue; }
        dataToCreate.push({ code, libelle, cycle, anneeEtude, filiereId });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.niveau.createMany({ data: dataToCreate, skipDuplicates: true });
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
      const typeFluxCodeKey = findKey('typefluxcode');
      if (!codeKey || !libelleKey || !typeFluxCodeKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit contenir : code, libelle, typefluxcode.' });
        return;
      }
      const fluxList = await prisma.typeFlux.findMany({ select: { id: true, code: true } });
      const fluxMap = new Map(fluxList.map(f => [f.code.toUpperCase(), f.id]));
      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const code = rowValue(row, codeKey);
        const libelle = rowValue(row, libelleKey);
        const fCode = rowValue(row, typeFluxCodeKey).toUpperCase();
        if (!code || !libelle || !fCode) { errors.push(`Ligne ${i+2} : Informations manquantes.`); continue; }
        const typeFluxId = fluxMap.get(fCode);
        if (!typeFluxId) { errors.push(`Ligne ${i+2} : TypeFlux avec le code ${fCode} inexistant.`); continue; }
        dataToCreate.push({ code, libelle, typeFluxId });
      }
      if (dataToCreate.length > 0) {
        const result = await prisma.typeRecette.createMany({ data: dataToCreate, skipDuplicates: true });
        createdCount = result.count;
        duplicateCount = dataToCreate.length - createdCount;
      }
    }
    else if (entity === 'nomenclatures') {
      const libelleBrutKey = findKey('libellebrut');
      const codeProduitKey = findKey('codeproduit');
      const libelleStandardKey = findKey('libellestandard');
      const typeRecetteCodeKey = findKey('typerecettecode');
      const niveauCodeKey = findKey('niveaucode');
      const statutCodeKey = findKey('statutcode');
      const numVersementKey = findKey('numversement');
      const montantKey = findKey('montant');
      const regexPatternKey = findKey('regexpattern') || findKey('regex') || findKey('pattern');

      if (!libelleBrutKey || !codeProduitKey || !libelleStandardKey || !typeRecetteCodeKey) {
        res.status(400).json({ error: 'Colonnes requises manquantes. Le fichier doit au moins contenir : libellebrut, codeproduit, libellestandard, typerecettecode.' });
        return;
      }

      const [recettes, niveaux, statuts] = await Promise.all([
        prisma.typeRecette.findMany({ select: { id: true, code: true } }),
        prisma.niveau.findMany({ select: { id: true, code: true } }),
        prisma.statutEtudiant.findMany({ select: { id: true, code: true } })
      ]);

      const recetteMap = new Map(recettes.map(r => [r.code.toUpperCase(), r.id]));
      const niveauMap = new Map(niveaux.map(n => [n.code.toUpperCase(), n.id]));
      const statutMap = new Map(statuts.map(s => [s.code.toUpperCase(), s.id]));

      const dataToCreate: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        const libelleBrut = rowValue(row, libelleBrutKey);
        const codeProduit = rowValue(row, codeProduitKey);
        const libelleStandard = rowValue(row, libelleStandardKey);
        const trCode = rowValue(row, typeRecetteCodeKey).toUpperCase();

        const nvCode = niveauCodeKey && row[niveauCodeKey] ? String(row[niveauCodeKey]).trim().toUpperCase() : null;
        const stCode = statutCodeKey && row[statutCodeKey] ? String(row[statutCodeKey]).trim().toUpperCase() : null;
        const numVersementVal = numVersementKey && row[numVersementKey] ? parseInt(String(row[numVersementKey]).trim(), 10) : null;
        const montantVal = montantKey && row[montantKey] ? parseInt(String(row[montantKey]).trim(), 10) : 0;
        const regexPattern = regexPatternKey ? rowValue(row, regexPatternKey) : null;

        if (!libelleBrut || !codeProduit || !libelleStandard || !trCode) { errors.push(`Ligne ${i+2} : Informations indispensables manquantes.`); continue; }

        const typeRecetteId = recetteMap.get(trCode);
        if (!typeRecetteId) { errors.push(`Ligne ${i+2} : TypeRecette avec le code ${trCode} inexistant.`); continue; }

        const niveauId = nvCode ? (niveauMap.get(nvCode) || null) : null;
        const statutId = stCode ? (statutMap.get(stCode) || null) : null;

        dataToCreate.push({
          libelleBrut,
          codeProduit,
          libelleStandard,
          typeRecetteId,
          niveauId,
          statutId,
          numVersement: numVersementVal && !isNaN(numVersementVal) ? numVersementVal : null,
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
