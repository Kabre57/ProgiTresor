export type PaymentOrder = {
  id?: number;
  code?: string;
  codeOt?: string;
  antenne?: string;
  antenneId?: number;
  niveau?: string;
  niveauId?: number;
  type?: string;
  typeRecetteId?: number;
  montant?: number;
  montantCumule?: number | string;
  nombreFlux?: number;
  statut?: string;
  pdfUrl?: string | null;
  pdfPath?: string | null;
  version?: number;
  synthese?: {
    periodeDebut?: string;
    periodeFin?: string;
    reference?: string;
    [key: string]: unknown;
  };
  dateCreation?: string;
  [key: string]: unknown;
};
