"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSynthese = exports.getGroupedByRecette = exports.exportTransactions = exports.getKpis = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = __importDefault(require("../utils/logger"));
const filterBuilder_1 = require("../utils/filterBuilder");
const kpiCacheService_1 = require("../services/kpiCacheService");
const stream_1 = require("stream");
const events_1 = require("events");
const etudiantServiceClient_1 = require("../utils/etudiantServiceClient");
const escapeCsvValue = (value) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
};
const createCsvTransform = () => new stream_1.Transform({
    writableObjectMode: true,
    transform(row, _encoding, callback) {
        callback(null, `${row.map(escapeCsvValue).join(',')}\n`);
    },
});
const writeCsvRow = async (stream, row) => {
    if (!stream.write(row)) {
        await (0, events_1.once)(stream, 'drain');
    }
};
/**
 * Récupère les KPIs pour le dashboard.
 */
const getKpis = async (req, res, next) => {
    try {
        const cacheKey = (0, kpiCacheService_1.buildKpiCacheKey)(req.query);
        const cached = await (0, kpiCacheService_1.getCachedKpis)(cacheKey);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            res.json(cached);
            return;
        }
        res.setHeader('X-Cache', 'MISS');
        const { dateDebut, dateFin, antenneId } = req.query;
        const where = {};
        if (dateDebut || dateFin) {
            where.dateHeure = {};
            if (dateDebut) {
                where.dateHeure.gte = new Date(dateDebut);
            }
            if (dateFin) {
                where.dateHeure.lte = new Date(dateFin);
            }
        }
        if (antenneId) {
            const aid = parseInt(antenneId, 10);
            if (!isNaN(aid)) {
                where.antenneId = aid;
            }
        }
        // Récupérer les nomenclatures depuis etudiant-service
        const nomMap = new Map();
        try {
            const nomenclatures = await (0, etudiantServiceClient_1.fetchEtudiantJson)('/nomenclatures', undefined, []);
            if (Array.isArray(nomenclatures)) {
                for (const nom of nomenclatures) {
                    const typeStr = nom.typeRecette?.typeFlux?.libelle ||
                        (nom.typeRecette?.typeFluxId === 1 ? 'Budget' : 'Hors Budget');
                    nomMap.set(nom.id, {
                        libelleStandard: nom.libelleStandard,
                        type: typeStr,
                    });
                }
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to fetch nomenclatures from etudiant-service');
        }
        const grouped = await prisma_1.prisma.transaction.groupBy({
            by: ['typeFluxId', 'nomenclatureId', 'libelleProduitBrut'],
            where,
            _sum: {
                montant: true,
            },
        });
        let totalBudget = 0n;
        let totalHorsBudget = 0n;
        const byLibelleMap = new Map();
        for (const group of grouped) {
            const sumMontant = group._sum?.montant || 0n;
            const isBudget = group.typeFluxId === 1;
            if (isBudget) {
                totalBudget += sumMontant;
            }
            else {
                totalHorsBudget += sumMontant;
            }
            let libelle = group.libelleProduitBrut || 'Autre Recette';
            let typeStr = isBudget ? 'Budget' : 'Hors Budget';
            if (group.nomenclatureId && nomMap.has(group.nomenclatureId)) {
                const nom = nomMap.get(group.nomenclatureId);
                libelle = nom.libelleStandard;
                typeStr = nom.type;
            }
            const key = `${libelle}-${typeStr}`;
            const existing = byLibelleMap.get(key);
            if (existing) {
                existing.montant += sumMontant;
            }
            else {
                byLibelleMap.set(key, { libelle, type: typeStr, montant: sumMontant });
            }
        }
        const byLibelle = Array.from(byLibelleMap.values()).map((item) => ({
            libelle: item.libelle,
            type: item.type,
            montant: Number(item.montant),
        }));
        const payload = {
            totalBudget: Number(totalBudget),
            totalHorsBudget: Number(totalHorsBudget),
            byLibelle,
        };
        await (0, kpiCacheService_1.setCachedKpis)(cacheKey, payload);
        res.json(payload);
    }
    catch (err) {
        next(err);
    }
};
exports.getKpis = getKpis;
/**
 * Exporte les transactions sous forme de fichier CSV.
 */
const exportTransactions = async (req, res, next) => {
    try {
        const where = await (0, filterBuilder_1.buildTransactionWhereClause)(req.query);
        // 1. Fetch common referentials once
        const antenneMap = new Map();
        const typeFluxMap = new Map();
        const nomenclatureMap = new Map();
        try {
            const [antennes, flux, nomenclatures] = await Promise.all([
                (0, etudiantServiceClient_1.fetchEtudiantJson)('/antennes', undefined, []),
                (0, etudiantServiceClient_1.fetchEtudiantJson)('/types-flux', undefined, []),
                (0, etudiantServiceClient_1.fetchEtudiantJson)('/nomenclatures', undefined, [])
            ]);
            if (Array.isArray(antennes)) {
                for (const a of antennes)
                    antenneMap.set(a.id, a.nom);
            }
            if (Array.isArray(flux)) {
                for (const f of flux)
                    typeFluxMap.set(f.id, f.libelle);
            }
            if (Array.isArray(nomenclatures)) {
                for (const n of nomenclatures)
                    nomenclatureMap.set(n.id, n.libelleStandard);
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to fetch static referentials in exportTransactions');
        }
        const opMap = new Map();
        try {
            const ops = await prisma_1.prisma.ordrePaiementMiroir.findMany();
            for (const op of ops) {
                opMap.set(op.id, op.codeOp);
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to fetch OPs in exportTransactions');
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=transactions_export_${Date.now()}.csv`);
        // Write UTF-8 BOM for Excel
        res.write('\uFEFF');
        const csvStream = createCsvTransform();
        csvStream.pipe(res);
        const headers = [
            'Référence Trésor',
            'Date/Heure',
            'Montant',
            'Étudiant',
            'Promotion',
            'Antenne',
            'Nomenclature',
            'Type de flux',
            'Ordre de paiement',
            'Payeur',
            'Libellé produit',
            'Statut'
        ];
        await writeCsvRow(csvStream, headers);
        let cursor = undefined;
        const batchSize = 5000;
        while (true) {
            const transactions = await prisma_1.prisma.transaction.findMany({
                where,
                take: batchSize,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { id: 'asc' },
            });
            if (transactions.length === 0)
                break;
            // Batch resolve etudiant IDs for this chunk
            const etudiantIds = Array.from(new Set(transactions
                .map((t) => t.etudiantId)
                .filter((id) => id !== null)));
            const etudiantMap = new Map();
            if (etudiantIds.length > 0) {
                try {
                    const etudiant = await (0, etudiantServiceClient_1.fetchEtudiantJson)('/batch-ids', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: etudiantIds }),
                    }, []);
                    for (const s of etudiant) {
                        etudiantMap.set(s.id, s);
                    }
                }
                catch (err) {
                    logger_1.default.warn(err, 'Failed to batch fetch etudiant from etudiant-service during export batch');
                }
            }
            for (const tx of transactions) {
                const etudiant = tx.etudiantId ? etudiantMap.get(tx.etudiantId) : null;
                const etudiantName = etudiant
                    ? `${etudiant.matricule} - ${etudiant.nom} ${etudiant.prenom}`
                    : tx.etudiantId
                        ? `ID: ${tx.etudiantId}`
                        : '';
                const antenneName = tx.antenneId
                    ? antenneMap.get(tx.antenneId) || etudiant?.antenne?.nom || `ID: ${tx.antenneId}`
                    : '';
                const nomenclatureLibelle = tx.nomenclatureId
                    ? nomenclatureMap.get(tx.nomenclatureId) || `ID: ${tx.nomenclatureId}`
                    : '';
                const typeFluxLibelle = tx.typeFluxId
                    ? typeFluxMap.get(tx.typeFluxId) || `ID: ${tx.typeFluxId}`
                    : '';
                const opCode = tx.ordrePaiementId ? opMap.get(tx.ordrePaiementId) || `ID: ${tx.ordrePaiementId}` : '';
                const row = [
                    tx.refTresor,
                    tx.dateHeure.toISOString(),
                    Number(tx.montant).toString(),
                    etudiantName,
                    etudiant?.promotionString || etudiant?.promotion?.nom || '',
                    antenneName,
                    nomenclatureLibelle,
                    typeFluxLibelle,
                    opCode,
                    tx.nomPayeurBrut || '',
                    tx.libelleProduitBrut || '',
                    tx.statutTraitement
                ];
                await writeCsvRow(csvStream, row);
            }
            cursor = transactions[transactions.length - 1].id;
        }
        csvStream.end();
    }
    catch (err) {
        next(err);
    }
};
exports.exportTransactions = exportTransactions;
const getGroupedByRecette = async (req, res, next) => {
    try {
        const where = await (0, filterBuilder_1.buildTransactionWhereClause)(req.query);
        // Fetch nomenclatures from etudiant-service
        const nomMap = new Map();
        try {
            const nomenclatures = await (0, etudiantServiceClient_1.fetchEtudiantJson)('/nomenclatures', undefined, []);
            if (Array.isArray(nomenclatures)) {
                for (const nom of nomenclatures) {
                    nomMap.set(nom.id, {
                        libelleStandard: nom.libelleStandard,
                        typeRecetteLibelle: nom.typeRecette?.libelle || 'Autre',
                        typeFluxId: nom.typeRecette?.typeFluxId || 1,
                    });
                }
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to fetch nomenclatures from etudiant-service');
        }
        const grouped = await prisma_1.prisma.transaction.groupBy({
            by: ['nomenclatureId', 'typeFluxId', 'libelleProduitBrut'],
            where,
            _sum: {
                montant: true,
            },
        });
        // Grouping structure: key is nomenclatureId (or raw libelle if null)
        // We map it to: { libelleStandard, typeRecette, montantBudget, montantHorsBudget, montantTotal }
        const resultsMap = new Map();
        for (const group of grouped) {
            const sumMontant = group._sum?.montant || 0n;
            const isBudget = group.typeFluxId === 1;
            let key = '';
            let libelleStandard = '';
            let typeRecette = '';
            let nomenclatureId = null;
            if (group.nomenclatureId && nomMap.has(group.nomenclatureId)) {
                const nom = nomMap.get(group.nomenclatureId);
                nomenclatureId = group.nomenclatureId;
                libelleStandard = nom.libelleStandard;
                typeRecette = nom.typeRecetteLibelle;
                key = `nom-${group.nomenclatureId}`;
            }
            else {
                libelleStandard = group.libelleProduitBrut || 'Autre Recette';
                typeRecette = 'Non classifié';
                key = `raw-${libelleStandard}`;
            }
            const existing = resultsMap.get(key);
            if (existing) {
                if (isBudget) {
                    existing.montantBudget += sumMontant;
                }
                else {
                    existing.montantHorsBudget += sumMontant;
                }
                existing.montantTotal += sumMontant;
            }
            else {
                resultsMap.set(key, {
                    nomenclatureId,
                    libelleStandard,
                    typeRecette,
                    montantBudget: isBudget ? sumMontant : 0n,
                    montantHorsBudget: isBudget ? 0n : sumMontant,
                    montantTotal: sumMontant,
                });
            }
        }
        const results = Array.from(resultsMap.values()).map((r) => ({
            nomenclatureId: r.nomenclatureId,
            libelleStandard: r.libelleStandard,
            typeRecette: r.typeRecette,
            montantBudget: Number(r.montantBudget),
            montantHorsBudget: Number(r.montantHorsBudget),
            montantTotal: Number(r.montantTotal),
        }));
        res.json(results);
    }
    catch (err) {
        next(err);
    }
};
exports.getGroupedByRecette = getGroupedByRecette;
/**
 * Exporte la synthèse des recettes sous forme de fichier CSV.
 */
const exportSynthese = async (req, res, next) => {
    try {
        const where = await (0, filterBuilder_1.buildTransactionWhereClause)(req.query);
        // Fetch nomenclatures from etudiant-service
        const nomMap = new Map();
        try {
            const nomenclatures = await (0, etudiantServiceClient_1.fetchEtudiantJson)('/nomenclatures', undefined, []);
            if (Array.isArray(nomenclatures)) {
                for (const nom of nomenclatures) {
                    nomMap.set(nom.id, {
                        libelleStandard: nom.libelleStandard,
                        typeRecetteLibelle: nom.typeRecette?.libelle || 'Autre',
                        typeFluxId: nom.typeRecette?.typeFluxId || 1,
                    });
                }
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to fetch nomenclatures from etudiant-service');
        }
        const grouped = await prisma_1.prisma.transaction.groupBy({
            by: ['nomenclatureId', 'typeFluxId', 'libelleProduitBrut'],
            where,
            _sum: {
                montant: true,
            },
        });
        const resultsMap = new Map();
        for (const group of grouped) {
            const sumMontant = group._sum?.montant || 0n;
            const isBudget = group.typeFluxId === 1;
            let key = '';
            let libelleStandard = '';
            let typeRecette = '';
            if (group.nomenclatureId && nomMap.has(group.nomenclatureId)) {
                const nom = nomMap.get(group.nomenclatureId);
                libelleStandard = nom.libelleStandard;
                typeRecette = nom.typeRecetteLibelle;
                key = `nom-${group.nomenclatureId}`;
            }
            else {
                libelleStandard = group.libelleProduitBrut || 'Autre Recette';
                typeRecette = 'Non classifié';
                key = `raw-${libelleStandard}`;
            }
            const existing = resultsMap.get(key);
            if (existing) {
                if (isBudget) {
                    existing.montantBudget += sumMontant;
                }
                else {
                    existing.montantHorsBudget += sumMontant;
                }
                existing.montantTotal += sumMontant;
            }
            else {
                resultsMap.set(key, {
                    libelleStandard,
                    typeRecette,
                    montantBudget: isBudget ? sumMontant : 0n,
                    montantHorsBudget: isBudget ? 0n : sumMontant,
                    montantTotal: sumMontant,
                });
            }
        }
        const headers = ['Type de recette', 'Nomenclature', 'Budget', 'Hors-Budget', 'Total'];
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=synthese_recettes_export_${Date.now()}.csv`);
        res.write('\uFEFF');
        const csvStream = createCsvTransform();
        csvStream.pipe(res);
        await writeCsvRow(csvStream, headers);
        for (const r of resultsMap.values()) {
            const row = [
                r.typeRecette,
                r.libelleStandard,
                Number(r.montantBudget).toString(),
                Number(r.montantHorsBudget).toString(),
                Number(r.montantTotal).toString()
            ];
            await writeCsvRow(csvStream, row);
        }
        csvStream.end();
    }
    catch (err) {
        next(err);
    }
};
exports.exportSynthese = exportSynthese;
