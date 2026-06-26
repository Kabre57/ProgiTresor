import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';

export const importEtudiants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(req as any).file) {
      res.status(400).json({ error: 'Fichier manquant.' });
      return;
    }

    const csvText = (req as any).file.buffer.toString('utf-8');
    const lines = csvText.split(/\r?\n/).filter((line: string) => line.trim() !== '');
    if (lines.length < 2) {
      res.status(400).json({ error: 'Le fichier CSV est vide ou invalide.' });
      return;
    }

    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(separator).map((h: string) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

    // Trouver les index des colonnes requises
    const matriculeIndex = headers.indexOf('matricule');
    const nomIndex = headers.indexOf('nom');
    const prenomIndex = headers.indexOf('prenom');
    const antenneIdIndex = headers.indexOf('antenneid');
    const filiereIdIndex = headers.indexOf('filiereid') !== -1
      ? headers.indexOf('filiereid')
      : headers.indexOf('niveauid');
    const statutIdIndex = headers.indexOf('statutid');
    const matriculeTresorPayIndex = headers.indexOf('matriculetresorpay');
    const promotionNomIndex = headers.indexOf('promotionnom');
    const promotionIdIndex = headers.indexOf('promotionid');

    if (matriculeIndex === -1 || nomIndex === -1 || prenomIndex === -1 ||
        antenneIdIndex === -1 || filiereIdIndex === -1 || statutIdIndex === -1) {
      res.status(400).json({
        error: 'Colonnes requises manquantes. Le CSV doit contenir : matricule, nom, prenom, antenneId, filiereId, statutId.'
      });
      return;
    }

    // Récupérer les IDs existants pour validation des clés étrangères
    const [antennes, filieres, statuts, promotions] = await Promise.all([
      prisma.antenne.findMany({ select: { id: true } }),
      prisma.filiere.findMany({ select: { id: true } }),
      prisma.statutEtudiant.findMany({ select: { id: true } }),
      prisma.promotion.findMany({ select: { id: true, nom: true } })
    ]);

    const antenneIds = new Set(antennes.map(a => a.id));
    const filiereIds = new Set(filieres.map(n => n.id));
    const statutIds = new Set(statuts.map(s => s.id));
    const promotionByIdSet = new Set(promotions.map(p => p.id));
    const promotionByNameMap = new Map<string, number>();
    promotions.forEach((p: { id: number; nom: string }) => {
      promotionByNameMap.set(p.nom.toLowerCase(), p.id);
    });

    const etudiantToCreate: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(separator).map((v: string) => v.trim().replace(/^["']|["']$/g, ''));
      if (values.length < headers.length) continue; // Ligne incomplète

      const matricule = values[matriculeIndex];
      const nom = values[nomIndex];
      const prenom = values[prenomIndex];
      const antenneId = parseInt(values[antenneIdIndex], 10);
      const filiereId = parseInt(values[filiereIdIndex], 10);
      const statutId = parseInt(values[statutIdIndex], 10);
      const matriculeTresorPay = matriculeTresorPayIndex !== -1 ? values[matriculeTresorPayIndex] : undefined;
      const promotionNomVal = promotionNomIndex !== -1 ? values[promotionNomIndex] : undefined;
      const promotionIdVal = promotionIdIndex !== -1 ? parseInt(values[promotionIdIndex], 10) : NaN;

      const rowNum = i + 1;

      if (!matricule) {
        errors.push(`Ligne ${rowNum} : Matricule manquant.`);
        continue;
      }
      if (!nom) {
        errors.push(`Ligne ${rowNum} : Nom manquant.`);
        continue;
      }
      if (!prenom) {
        errors.push(`Ligne ${rowNum} : Prénom manquant.`);
        continue;
      }
      if (isNaN(antenneId) || !antenneIds.has(antenneId)) {
        errors.push(`Ligne ${rowNum} : AntenneId invalide ou inexistant (${values[antenneIdIndex]}).`);
        continue;
      }
      if (isNaN(filiereId) || !filiereIds.has(filiereId)) {
        errors.push(`Ligne ${rowNum} : FiliereId invalide ou inexistant (${values[filiereIdIndex]}).`);
        continue;
      }
      if (isNaN(statutId) || !statutIds.has(statutId)) {
        errors.push(`Ligne ${rowNum} : StatutId invalide ou inexistant (${values[statutIdIndex]}).`);
        continue;
      }

      let promotionId: number | null = null;
      let promotionString: string | null = null;

      if (!isNaN(promotionIdVal) && promotionByIdSet.has(promotionIdVal)) {
        promotionId = promotionIdVal;
        const promo = promotions.find(p => p.id === promotionId);
        promotionString = promo ? promo.nom : null;
      } else if (promotionNomVal) {
        const resolvedId = promotionByNameMap.get(promotionNomVal.toLowerCase());
        if (resolvedId) {
          promotionId = resolvedId;
          const promo = promotions.find(p => p.id === promotionId);
          promotionString = promo ? promo.nom : null;
        }
      }

      if (!promotionId) {
        errors.push(`Ligne ${rowNum} : Promotion invalide ou manquante (${promotionNomVal || values[promotionIdIndex] || 'non fournie'}).`);
        continue;
      }

      if (!matriculeTresorPay || matriculeTresorPay.trim() === '') {
        errors.push(`Ligne ${rowNum} : Matricule Trésor Pay manquant (obligatoire).`);
        continue;
      }

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
      const result = await prisma.etudiant.createMany({
        data: etudiantToCreate,
        skipDuplicates: true
      });
      createdCount = result.count;
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
