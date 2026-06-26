"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransactionsStudentId = exports.deleteTransaction = exports.updateTransaction = exports.unlinkTransactionsFromOp = exports.findAlreadyLinkedTransaction = exports.linkTransactionsToOp = exports.createTransaction = exports.findUnassignedHorsBudget = exports.countTransactions = exports.findTransactions = void 0;
const prisma_1 = require("../utils/prisma");
const metrics_1 = require("../utils/metrics");
const findTransactions = async (limit, offset, where = {}, sortBy = 'dateHeure', sortOrder = 'desc') => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_find_many' });
    let orderBy = { dateHeure: sortOrder };
    if (sortBy === 'montant')
        orderBy = { montant: sortOrder };
    else if (sortBy === 'nomPayeurBrut')
        orderBy = { nomPayeurBrut: sortOrder };
    else if (sortBy === 'matriculeEtudiant')
        orderBy = { etudiantId: sortOrder };
    try {
        return await prisma_1.prisma.transaction.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy,
            include: { importFichier: true },
        });
    }
    finally {
        end();
    }
};
exports.findTransactions = findTransactions;
const countTransactions = async (where = {}) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_count' });
    try {
        return await prisma_1.prisma.transaction.count({ where });
    }
    finally {
        end();
    }
};
exports.countTransactions = countTransactions;
const findUnassignedHorsBudget = async () => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_find_unassigned' });
    try {
        return await prisma_1.prisma.transaction.findMany({
            where: {
                ordrePaiementId: null,
                typeFluxId: 2,
            },
            include: { importFichier: true },
        });
    }
    finally {
        end();
    }
};
exports.findUnassignedHorsBudget = findUnassignedHorsBudget;
const createTransaction = async (data) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_create' });
    try {
        return await prisma_1.prisma.transaction.create({ data });
    }
    finally {
        end();
    }
};
exports.createTransaction = createTransaction;
const linkTransactionsToOp = async (txIds, ordrePaiementId) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_link_op' });
    try {
        const result = await prisma_1.prisma.transaction.updateMany({
            where: { id: { in: txIds } },
            data: {
                ordrePaiementId,
                statutTraitement: 'AFFECTE',
            },
        });
        return result.count;
    }
    finally {
        end();
    }
};
exports.linkTransactionsToOp = linkTransactionsToOp;
const findAlreadyLinkedTransaction = async (txIds) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_find_linked' });
    try {
        return await prisma_1.prisma.transaction.findFirst({
            where: {
                id: { in: txIds },
                NOT: { ordrePaiementId: null },
            },
        });
    }
    finally {
        end();
    }
};
exports.findAlreadyLinkedTransaction = findAlreadyLinkedTransaction;
const unlinkTransactionsFromOp = async (ordrePaiementId) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_unlink_op' });
    try {
        const result = await prisma_1.prisma.transaction.updateMany({
            where: { ordrePaiementId },
            data: {
                ordrePaiementId: null,
                statutTraitement: 'IMPORTE',
                gele: false,
            },
        });
        return result.count;
    }
    finally {
        end();
    }
};
exports.unlinkTransactionsFromOp = unlinkTransactionsFromOp;
const updateTransaction = async (id, data) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_update' });
    try {
        return await prisma_1.prisma.transaction.update({
            where: { id },
            data,
        });
    }
    finally {
        end();
    }
};
exports.updateTransaction = updateTransaction;
const deleteTransaction = async (id) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_delete' });
    try {
        return await prisma_1.prisma.transaction.delete({
            where: { id },
        });
    }
    finally {
        end();
    }
};
exports.deleteTransaction = deleteTransaction;
const updateTransactionsStudentId = async (oldStudentId, newStudentId) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'transaction_merge_students' });
    try {
        const result = await prisma_1.prisma.transaction.updateMany({
            where: { etudiantId: oldStudentId },
            data: { etudiantId: newStudentId }
        });
        return result.count;
    }
    finally {
        end();
    }
};
exports.updateTransactionsStudentId = updateTransactionsStudentId;
