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

    const workbook = XLSX.read((req as any).file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = parseExcelSheet(worksheet);

    if (rows.length === 0) {
      res.status(400).json({ error: 'Le fichier est vide ou invalide.' });
      return;
    }

    const firstRowKeys = Object.keys(rows[0]);
    const findKey = (name: string) => {
      const cleanName = name.replace(/[\s_-]/g, '').toLowerCase();
      return firstRowKeys.find(k => k.trim().replace(/[\s_-]/g, '').toLowerCase() === cleanName);
    };

    const matriculeKey = findKey('matricule');
    const nomKey = findKey('nom');
    const prenomKey = findKey('prenom');
    const nomCompletKey = findKey('nom complet') || findKey('nomcomplet');
    const antenneIdKey = findKey('antenneid') || findKey('antenne') || findKey('antenne infas');
    const filiereIdKey = findKey('filiereid') || findKey('filiere') || findKey('filierecode') || findKey('niveau') || findKey('niveauid') || findKey('niveaucode');
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

    const [antennes, filieres, statuts, promotions] = await Promise.all([
      prisma.antenne.findMany({ select: { id: true, code: true, nom: true } }),
      prisma.filiere.findMany({ select: { id: true, code: true, libelle: true, abreviation: true } }),
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

    const filiereMap = new Map<string, number>();
    filieres.forEach(f => {
      filiereMap.set(f.code.toLowerCase(), f.id);
      filiereMap.set(f.libelle.toLowerCase(), f.id);
      filiereMap.set(f.abreviation.toLowerCase(), f.id);
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
    const defaultFiliereId = filieres[0]?.id || 1;
    const defaultStatutId = statuts.find(s => s.code.toUpperCase() === 'PUBLIC')?.id || statuts[0]?.id || 1;
    const defaultPromotion = promotions[0] || { id: 1, nom: 'Première année' };

    const etudiantToCreate: any[] = [];
    const errors: string[] = [];
    const seenMtp = new Set<string>();

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

      // Resolve Filiere
      let filiereId = defaultFiliereId;
      if (filiereIdKey) {
        const rawFil = rowValue(row, filiereIdKey);
        const parsedVal = parseInt(rawFil, 10);
        if (!isNaN(parsedVal)) {
          filiereId = parsedVal;
        } else {
          const clean = rawFil.toLowerCase().trim();
          filiereId = filiereMap.get(clean) || defaultFiliereId;
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
      let matriculeTresorPay = matriculeTresorPayKey ? rowValue(row, matriculeTresorPayKey).trim() : '';
      if (!matriculeTresorPay || seenMtp.has(matriculeTresorPay.toUpperCase())) {
        matriculeTresorPay = matricule;
      }
      seenMtp.add(matriculeTresorPay.toUpperCase());

      const rowNum = i + 2;

      if (!matricule) { errors.push(`Ligne ${rowNum} : Matricule manquant.`); continue; }
      if (!nom) { errors.push(`Ligne ${rowNum} : Nom manquant.`); continue; }
      
      etudiantToCreate.push({
        matricule: matricule.toUpperCase(),
        nom: nom.toUpperCase(),
        prenom,
        antenneId,
        filiereId,
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
