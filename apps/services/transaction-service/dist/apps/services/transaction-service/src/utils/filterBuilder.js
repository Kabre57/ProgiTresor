"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTransactionWhereClause = void 0;
const logger_1 = __importDefault(require("./logger"));
const studentServiceClient_1 = require("./studentServiceClient");
const isPresent = (val) => {
    if (val === undefined || val === null)
        return false;
    if (typeof val === 'string' && (val.trim() === '' || val.trim() === '0'))
        return false;
    if (typeof val === 'number' && val === 0)
        return false;
    return true;
};
const parseMultiSelect = (val) => {
    if (val === undefined || val === null)
        return undefined;
    if (Array.isArray(val)) {
        const arr = val.map(v => parseInt(String(v), 10)).filter(n => !isNaN(n));
        return arr.length > 0 ? arr : undefined;
    }
    if (typeof val === 'string') {
        if (val.trim() === '' || val.trim() === '0')
            return undefined;
        const arr = val.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n));
        return arr.length > 0 ? arr : undefined;
    }
    if (typeof val === 'number') {
        if (val === 0)
            return undefined;
        return [val];
    }
    return undefined;
};
const buildTransactionWhereClause = async (query) => {
    const where = {};
    const { dateDebut, dateFin, etudiantMatricule, etudiantNom, antenneId, filiereId, statutId, typeFluxId, typeRecetteId, nomenclatureId, libelleProduit, promotion, promotionId, } = query;
    // 1. Date Filter
    if (isPresent(dateDebut) || isPresent(dateFin)) {
        where.dateHeure = {};
        if (isPresent(dateDebut)) {
            where.dateHeure.gte = new Date(dateDebut);
        }
        if (isPresent(dateFin)) {
            where.dateHeure.lte = new Date(dateFin);
        }
    }
    // Parse Multi-Select Fields
    const parsedTypeFluxIds = parseMultiSelect(typeFluxId);
    const parsedNomenclatureIds = parseMultiSelect(nomenclatureId);
    const parsedTypeRecetteIds = parseMultiSelect(typeRecetteId);
    const parsedAntenneIds = parseMultiSelect(antenneId);
    const parsedFiliereIds = parseMultiSelect(filiereId ?? query.niveauId);
    const parsedStatutIds = parseMultiSelect(statutId);
    // 2. Direct simple filters
    if (parsedTypeFluxIds) {
        where.typeFluxId = { in: parsedTypeFluxIds };
    }
    if (parsedNomenclatureIds) {
        where.nomenclatureId = { in: parsedNomenclatureIds };
    }
    if (isPresent(libelleProduit)) {
        where.libelleProduitBrut = {
            contains: String(libelleProduit),
            mode: 'insensitive',
        };
    }
    // 3. Student Service Filter Composition
    const hasStudentFilters = isPresent(etudiantMatricule) ||
        isPresent(etudiantNom) ||
        isPresent(promotion) ||
        isPresent(promotionId) ||
        parsedAntenneIds !== undefined ||
        parsedFiliereIds !== undefined ||
        parsedStatutIds !== undefined;
    if (hasStudentFilters) {
        let studentSearch = undefined;
        if (isPresent(etudiantMatricule)) {
            studentSearch = etudiantMatricule;
        }
        else if (isPresent(etudiantNom)) {
            studentSearch = etudiantNom;
        }
        const params = new URLSearchParams();
        if (studentSearch)
            params.append('search', studentSearch);
        if (parsedAntenneIds)
            params.append('antenneId', parsedAntenneIds.join(','));
        if (parsedFiliereIds)
            params.append('filiereId', parsedFiliereIds.join(','));
        if (parsedStatutIds)
            params.append('statutId', parsedStatutIds.join(','));
        if (isPresent(promotion))
            params.append('promotion', String(promotion));
        if (isPresent(promotionId))
            params.append('promotionId', String(promotionId));
        try {
            const students = await (0, studentServiceClient_1.fetchStudentJson)(`/?${params.toString()}`, undefined, []);
            if (Array.isArray(students)) {
                const studentIds = students.map((s) => s.id);
                where.etudiantId = { in: studentIds };
            }
            else {
                where.etudiantId = { in: [] };
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to query student-service for transaction filtering');
            where.etudiantId = { in: [] };
        }
    }
    // 4. Nomenclature / Type Recette resolution
    if (parsedTypeRecetteIds && !parsedNomenclatureIds) {
        try {
            const noms = await (0, studentServiceClient_1.fetchStudentJson)('/nomenclatures', undefined, []);
            if (Array.isArray(noms)) {
                const matchingNoms = noms.filter((nom) => {
                    const trId = nom.typeRecetteId || nom.typeRecette?.id;
                    return parsedTypeRecetteIds.includes(trId);
                });
                const nomenclatureIds = matchingNoms.map((nom) => nom.id);
                where.nomenclatureId = { in: nomenclatureIds };
            }
            else {
                where.nomenclatureId = { in: [] };
            }
        }
        catch (err) {
            logger_1.default.warn(err, 'Failed to fetch nomenclatures for typeRecette filtering');
            where.nomenclatureId = { in: [] };
        }
    }
    return where;
};
exports.buildTransactionWhereClause = buildTransactionWhereClause;
