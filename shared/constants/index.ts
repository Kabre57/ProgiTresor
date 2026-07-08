export const Roles = {
  ADMINISTRATEUR: 'Administrateur',
  COMPTABLE: 'Comptable',
  AGENT_BUDGET: 'Agent Budget',
  CHEF_COMPTABLE: 'Chef Comptable',
  DIRECTEUR_FINANCIER: 'Directeur Financier',
  CONSULTANT: 'Consultant'
} as const;

export const OrderStatus = {
  BROUILLON: 'Brouillon',
  EN_ATTENTE_BUDGET: 'EN_ATTENTE_BUDGET',
  TRANSMIS: 'Transmis au Budget',
  VALIDE: 'Validé',
  APPROUVE: 'Approuvé',
  REJETE: 'Rejeté',
  PAYE: 'Payé'
} as const;
