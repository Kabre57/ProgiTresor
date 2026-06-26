"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllOrdrePaiementMiroirs = exports.findOrdrePaiementMiroirByCode = exports.findOrdrePaiementMiroirById = exports.upsertOrdrePaiementMiroir = void 0;
const prisma_1 = require("../utils/prisma");
const metrics_1 = require("../utils/metrics");
const upsertOrdrePaiementMiroir = async (id, codeOp, statut) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'ordre_paiement_miroir_upsert' });
    try {
        return await prisma_1.prisma.ordrePaiementMiroir.upsert({
            where: { id },
            update: { codeOp, statut },
            create: { id, codeOp, statut },
        });
    }
    finally {
        end();
    }
};
exports.upsertOrdrePaiementMiroir = upsertOrdrePaiementMiroir;
const findOrdrePaiementMiroirById = async (id) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'ordre_paiement_miroir_find_by_id' });
    try {
        return await prisma_1.prisma.ordrePaiementMiroir.findUnique({
            where: { id },
        });
    }
    finally {
        end();
    }
};
exports.findOrdrePaiementMiroirById = findOrdrePaiementMiroirById;
const findOrdrePaiementMiroirByCode = async (codeOp) => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'ordre_paiement_miroir_find_by_code' });
    try {
        return await prisma_1.prisma.ordrePaiementMiroir.findUnique({
            where: { codeOp },
        });
    }
    finally {
        end();
    }
};
exports.findOrdrePaiementMiroirByCode = findOrdrePaiementMiroirByCode;
const findAllOrdrePaiementMiroirs = async () => {
    const end = metrics_1.dbQueryDuration.startTimer({ operation: 'ordre_paiement_miroir_find_all' });
    try {
        return await prisma_1.prisma.ordrePaiementMiroir.findMany({
            orderBy: { updatedAt: 'desc' },
        });
    }
    finally {
        end();
    }
};
exports.findAllOrdrePaiementMiroirs = findAllOrdrePaiementMiroirs;
