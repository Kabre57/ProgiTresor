export type Transaction = {
  id?: number;
  reference?: string;
  matricule?: string;
  nom?: string;
  montant?: number;
  montantAttendu?: number | null;
  antenne?: string;
  typeFlux?: string;
  statut?: string;
  dateTransaction?: string;
  [key: string]: unknown;
};
