export type PaymentOrder = {
  id?: number;
  code?: string;
  antenne?: string;
  filiere?: string;
  type?: string;
  montant?: number;
  statut?: string;
  dateCreation?: string;
  [key: string]: unknown;
};
