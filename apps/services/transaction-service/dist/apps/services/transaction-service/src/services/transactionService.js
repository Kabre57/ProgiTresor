"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeStudents = exports.deleteTransaction = exports.updateTransaction = exports.syncOpStatus = exports.unlinkTransactionsFromOp = exports.linkTransactionsToOp = exports.getUnassignedTransactions = exports.getTransactions = exports.importTransactions = void 0;
const transactionRepository = __importStar(require("../repositories/transactionRepository"));
const importFichierRepository = __importStar(require("../repositories/importFichierRepository"));
const ordrePaiementMiroirRepository = __importStar(require("../repositories/ordrePaiementMiroirRepository"));
const errors_1 = require("../utils/errors");
const metrics_1 = require("../utils/metrics");
const logger_1 = __importDefault(require("../utils/logger"));
const filterBuilder_1 = require("../utils/filterBuilder");
const prisma_1 = require("../utils/prisma");
const kpiCacheService_1 = require("./kpiCacheService");
const studentServiceClient_1 = require("../utils/studentServiceClient");
const isPrismaError = (error) => {
    return typeof error === 'object' && error !== null && 'code' in error;
};
const importTransactions = async (payload) => {
    const errors = [];
    // 1. Filter out duplicates within the uploaded payload itself
    const uniqueItemsMap = new Map();
    for (const item of payload.items) {
        if (item.refTresor) {
            uniqueItemsMap.set(item.refTresor.trim(), item);
        }
    }
    const uniqueItems = Array.from(uniqueItemsMap.values());
    const fileDuplicatesCount = payload.items.length - uniqueItems.length;
    // 2. Batch resolve students by distinct matricules (internal and external)
    const studentMap = new Map();
    const distinctMatricules = Array.from(new Set(uniqueItems
        .map((item) => (item.matriculeTresorPay || item.etudiantMatricule || '').trim())
        .filter((m) => typeof m === 'string' && m.trim() !== '')));
    if (distinctMatricules.length > 0) {
        try {
            const students = await (0, studentServiceClient_1.fetchStudentJson)('/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ matricules: distinctMatricules }),
            }, []);
            if (Array.isArray(students)) {
                for (const s of students) {
                    const resolvedVal = { id: s.id, antenneId: s.antenneId };
                    if (s.matricule)
                        studentMap.set(s.matricule.toUpperCase(), resolvedVal);
                    if (s.matriculeTresorPay)
                        studentMap.set(s.matriculeTresorPay.toUpperCase(), resolvedVal);
                }
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to resolve students in batch');
        }
    }
    // 3. Fetch all nomenclatures to resolve by libelle
    const nomenclatureMap = new Map();
    try {
        const noms = await (0, studentServiceClient_1.fetchStudentJson)('/nomenclatures', {
            headers: {
                'Accept': 'application/json',
            },
        }, []);
        if (Array.isArray(noms)) {
            for (const nom of noms) {
                if (nom.libelleBrut) {
                    nomenclatureMap.set(nom.libelleBrut.toUpperCase(), { id: nom.id, typeFluxId: nom.typeRecette?.typeFluxId || 1 });
                }
                if (nom.libelleStandard) {
                    nomenclatureMap.set(nom.libelleStandard.toUpperCase(), { id: nom.id, typeFluxId: nom.typeRecette?.typeFluxId || 1 });
                }
            }
        }
    }
    catch (err) {
        logger_1.default.warn(err, 'Failed to fetch nomenclatures for import resolution');
    }
    // Create ImportFichier log record
    const importFichier = await importFichierRepository.createImportFichier({
        nomFichier: payload.nomFichier,
        typeFichier: payload.typeFichier,
        auteurId: payload.auteurId,
        periodeDebut: payload.periodeDebut,
        periodeFin: payload.periodeFin,
        nbLignesLues: payload.items.length,
        nbLignesTraitees: 0,
        nbErreurs: 0,
        statut: 'EN_COURS',
    });
    const transactionsToCreate = [];
    // 4. Map transactions with pre-resolved relations
    for (const item of uniqueItems) {
        try {
            let etudiantId = item.etudiantId;
            let antenneId = item.antenneId;
            let nomenclatureId = item.nomenclatureId;
            let typeFluxId = item.typeFluxId;
            const matCandidate = (item.matriculeTresorPay || item.matricule || item.etudiantMatricule || '').trim();
            if (!etudiantId && matCandidate) {
                if (studentMap.has(matCandidate.toUpperCase())) {
                    const resolved = studentMap.get(matCandidate.toUpperCase());
                    etudiantId = resolved.id;
                    if (!antenneId)
                        antenneId = resolved.antenneId;
                }
                else {
                    // Si non trouvé dans le batch initial, tenter une résolution par matricule externe (création temporaire)
                    try {
                        const res = await (0, studentServiceClient_1.fetchStudentResult)(`/tresor-pay/${encodeURIComponent(matCandidate)}`, undefined, null);
                        if (res.ok && res.data) {
                            const student = res.data;
                            etudiantId = student.id;
                            if (!antenneId)
                                antenneId = student.antenneId;
                            studentMap.set(matCandidate.toUpperCase(), { id: student.id, antenneId: student.antenneId });
                        }
                        else if (res.status === 404) {
                            const createRes = await (0, studentServiceClient_1.fetchStudentResult)('/tresor-pay/temporary', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    matriculeTresorPay: matCandidate,
                                    nomPayeur: item.nomPayeurBrut || 'Payeur Inconnu'
                                })
                            }, null);
                            if (createRes.ok && createRes.data) {
                                const tempStudent = createRes.data;
                                etudiantId = tempStudent.id;
                                if (!antenneId)
                                    antenneId = tempStudent.antenneId;
                                studentMap.set(matCandidate.toUpperCase(), { id: tempStudent.id, antenneId: tempStudent.antenneId });
                            }
                        }
                    }
                    catch (err) {
                        logger_1.default.error(err, `Erreur lors de la résolution de l'étudiant pour le matricule ${matCandidate}`);
                    }
                }
            }
            const libelle = item.libelleProduitBrut;
            if (!nomenclatureId && libelle && nomenclatureMap.has(libelle.toUpperCase())) {
                const resolved = nomenclatureMap.get(libelle.toUpperCase());
                nomenclatureId = resolved.id;
                if (!typeFluxId) {
                    typeFluxId = resolved.typeFluxId;
                }
            }
            transactionsToCreate.push({
                refTresor: item.refTresor.trim(),
                dateHeure: new Date(item.dateHeure),
                montant: BigInt(item.montant),
                etudiantId: etudiantId ?? null,
                antenneId: antenneId ?? null,
                nomenclatureId: nomenclatureId ?? null,
                typeFluxId: typeFluxId ?? null,
                importId: importFichier.id,
                ordrePaiementId: item.ordrePaiementId ?? null,
                mois: item.mois ?? null,
                nomPayeurBrut: item.nomPayeurBrut?.trim() ?? null,
                libelleProduitBrut: item.libelleProduitBrut?.trim() ?? null,
                statutTraitement: item.ordrePaiementId ? 'AFFECTE' : 'IMPORTE',
            });
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            errors.push(`${item.refTresor}: ${message}`);
        }
    }
    // 5. Execute DB bulk insertion (createMany)
    let importedCount = 0;
    let dbDuplicatesCount = 0;
    if (transactionsToCreate.length > 0) {
        try {
            const dbResult = await prisma_1.prisma.transaction.createMany({
                data: transactionsToCreate,
                skipDuplicates: true,
            });
            importedCount = dbResult.count;
            dbDuplicatesCount = transactionsToCreate.length - dbResult.count;
        }
        catch (err) {
            logger_1.default.error(err, 'Bulk transaction insertion failed');
            errors.push(`BulkInsertError: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    const duplicatesCount = fileDuplicatesCount + dbDuplicatesCount;
    // Update ImportFichier log record
    await importFichierRepository.updateImportFichier(importFichier.id, {
        nbLignesTraitees: importedCount,
        nbErreurs: errors.length,
        statut: errors.length > 0 ? 'TERMINE_AVEC_ERREURS' : 'TERMINE',
        logsErreurs: errors.length > 0 ? errors.join('\n') : null,
    });
    metrics_1.importCounter.inc({ status: errors.length > 0 ? 'partial' : 'success' });
    await (0, kpiCacheService_1.invalidateKpiCache)();
    return { imported: importedCount, duplicatesSkipped: duplicatesCount, importId: importFichier.id };
};
exports.importTransactions = importTransactions;
const getTransactions = async (query) => {
    const limit = parseInt(query.limit, 10) || 20;
    const offset = parseInt(query.offset, 10) || 0;
    const sortBy = query.sortBy || 'dateHeure';
    const sortOrder = query.sortOrder || 'desc';
    const where = await (0, filterBuilder_1.buildTransactionWhereClause)(query);
    const [list, total, sums] = await Promise.all([
        transactionRepository.findTransactions(limit, offset, where, sortBy, sortOrder),
        transactionRepository.countTransactions(where),
        prisma_1.prisma.transaction.groupBy({
            by: ['typeFluxId'],
            where,
            _sum: {
                montant: true
            }
        })
    ]);
    // Aggregate totals
    let totalBudget = 0n;
    let totalHorsBudget = 0n;
    for (const s of sums) {
        if (s.typeFluxId === 1)
            totalBudget = s._sum.montant || 0n;
        if (s.typeFluxId === 2)
            totalHorsBudget = s._sum.montant || 0n;
    }
    const totals = {
        budget: Number(totalBudget),
        horsBudget: Number(totalHorsBudget),
        total: Number(totalBudget + totalHorsBudget)
    };
    // Cross-service resolution
    const studentMap = new Map();
    const nomenclatureMap = new Map();
    const etudiantIds = Array.from(new Set(list.map(tx => tx.etudiantId).filter((id) => id !== null)));
    const nomenclatureIds = Array.from(new Set(list.map(tx => tx.nomenclatureId).filter((id) => id !== null)));
    if (etudiantIds.length > 0) {
        try {
            const students = await (0, studentServiceClient_1.fetchStudentJson)('/batch-ids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: etudiantIds })
            }, []);
            if (Array.isArray(students)) {
                for (const s of students) {
                    studentMap.set(s.id, s);
                }
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to batch lookup students by IDs in getTransactions');
        }
    }
    if (nomenclatureIds.length > 0) {
        try {
            const noms = await (0, studentServiceClient_1.fetchStudentJson)('/nomenclatures', undefined, []);
            if (Array.isArray(noms)) {
                for (const n of noms) {
                    nomenclatureMap.set(n.id, n);
                }
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to fetch nomenclatures in getTransactions');
        }
    }
    const enrichedList = list.map(tx => ({
        ...tx,
        montant: Number(tx.montant),
        student: tx.etudiantId ? studentMap.get(tx.etudiantId) || null : null,
        nomenclature: tx.nomenclatureId ? nomenclatureMap.get(tx.nomenclatureId) || null : null
    }));
    return { list: enrichedList, total, limit, offset, totals };
};
exports.getTransactions = getTransactions;
const getUnassignedTransactions = async () => {
    return transactionRepository.findUnassignedHorsBudget();
};
exports.getUnassignedTransactions = getUnassignedTransactions;
const linkTransactionsToOp = async (ordrePaiementId, codeOp, transactionIds) => {
    await ordrePaiementMiroirRepository.upsertOrdrePaiementMiroir(ordrePaiementId, codeOp, 'Brouillon');
    const alreadyLinked = await transactionRepository.findAlreadyLinkedTransaction(transactionIds);
    if (alreadyLinked) {
        throw new errors_1.AppError(400, `Transaction ${alreadyLinked.id.toString()} is already assigned to OP ${alreadyLinked.ordrePaiementId}`);
    }
    const count = await transactionRepository.linkTransactionsToOp(transactionIds, ordrePaiementId);
    return { message: 'Linked successfully', updatedCount: count };
};
exports.linkTransactionsToOp = linkTransactionsToOp;
const unlinkTransactionsFromOp = async (ordrePaiementId) => {
    const count = await transactionRepository.unlinkTransactionsFromOp(ordrePaiementId);
    return { message: 'Unlinked successfully', count };
};
exports.unlinkTransactionsFromOp = unlinkTransactionsFromOp;
const syncOpStatus = async (ordrePaiementId, codeOp, statut) => {
    return ordrePaiementMiroirRepository.upsertOrdrePaiementMiroir(ordrePaiementId, codeOp, statut);
};
exports.syncOpStatus = syncOpStatus;
const updateTransaction = async (id, data) => {
    const { ordrePaiementId, ordrePaiement, codeOp, ...cleanData } = data;
    if (cleanData.montant !== undefined) {
        cleanData.montant = BigInt(cleanData.montant);
    }
    const transaction = await transactionRepository.updateTransaction(id, cleanData);
    await (0, kpiCacheService_1.invalidateKpiCache)();
    return transaction;
};
exports.updateTransaction = updateTransaction;
const deleteTransaction = async (id) => {
    const transaction = await transactionRepository.deleteTransaction(id);
    await (0, kpiCacheService_1.invalidateKpiCache)();
    return transaction;
};
exports.deleteTransaction = deleteTransaction;
const mergeStudents = async (oldStudentId, newStudentId) => {
    const count = await transactionRepository.updateTransactionsStudentId(oldStudentId, newStudentId);
    await (0, kpiCacheService_1.invalidateKpiCache)();
    logger_1.default.info({ oldStudentId, newStudentId, count }, 'Merged student transactions');
    return count;
};
exports.mergeStudents = mergeStudents;
