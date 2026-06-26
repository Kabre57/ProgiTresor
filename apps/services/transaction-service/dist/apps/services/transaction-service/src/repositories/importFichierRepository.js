"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findImportFichierById = exports.countImportFichiers = exports.findImportFichiers = exports.updateImportFichier = exports.createImportFichier = void 0;
const prisma_1 = require("../utils/prisma");
const metrics_1 = require("../utils/metrics");
const createImportFichier = async (data) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'import_fichier_create' });
    try {
        return await prisma_1.prisma.importFichier.create({ data });
    }
    finally {
        end();
    }
};
exports.createImportFichier = createImportFichier;
const updateImportFichier = async (id, data) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'import_fichier_update' });
    try {
        return await prisma_1.prisma.importFichier.update({
            where: { id },
            data,
        });
    }
    finally {
        end();
    }
};
exports.updateImportFichier = updateImportFichier;
const findImportFichiers = async (limit, offset) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'import_fichier_find_many' });
    try {
        return await prisma_1.prisma.importFichier.findMany({
            take: limit,
            skip: offset,
            orderBy: { dateImport: 'desc' },
            include: { transactions: { select: { id: true, refTresor: true, montant: true, statutTraitement: true } } },
        });
    }
    finally {
        end();
    }
};
exports.findImportFichiers = findImportFichiers;
const countImportFichiers = async () => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'import_fichier_count' });
    try {
        return await prisma_1.prisma.importFichier.count();
    }
    finally {
        end();
    }
};
exports.countImportFichiers = countImportFichiers;
const findImportFichierById = async (id) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'import_fichier_find_by_id' });
    try {
        return await prisma_1.prisma.importFichier.findUnique({
            where: { id },
            include: { transactions: true },
        });
    }
    finally {
        end();
    }
};
exports.findImportFichierById = findImportFichierById;
