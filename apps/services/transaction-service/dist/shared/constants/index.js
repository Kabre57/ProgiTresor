"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStatus = exports.Roles = void 0;
exports.Roles = {
    ADMINISTRATEUR: 'Administrateur',
    COMPTABLE: 'Comptable',
    AGENT_BUDGET: 'Agent Budget',
    CHEF_COMPTABLE: 'Chef Comptable',
    DIRECTEUR_FINANCIER: 'Directeur Financier',
    CONSULTANT: 'Consultant'
};
exports.OrderStatus = {
    BROUILLON: 'Brouillon',
    TRANSMIS: 'Transmis au Budget',
    VALIDE: 'Validé',
    APPROUVE: 'Approuvé',
    REJETE: 'Rejeté',
    PAYE: 'Payé'
};
