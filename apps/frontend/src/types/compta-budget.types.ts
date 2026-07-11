export type AmountValue = number | string;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type BordereauStatut =
  | 'EN_ATTENTE'
  | 'PARTIELLEMENT_TRAITE'
  | 'TRAITE'
  | 'REJETE';

export type LotTraitementStatut =
  | 'EN_ATTENTE'
  | 'TRAITE'
  | 'TRANSMIS_BUDGET'
  | 'REJETE';

export type ControleStatut = 'CONFORME' | 'ECART';

export type OpStatut =
  | 'BROUILLON'
  | 'TRANSMIS_COMPTA'
  | 'CONTROLE'
  | 'A_PAYER'
  | 'PAYE'
  | 'REJETE';

export type Bordereau = {
  id: number;
  reference: string;
  sourceService: string;
  dateReception: string;
  dateTraitement?: string | null;
  statut: BordereauStatut | string;
  anneeBudgetaire: number;
  montantTotal: AmountValue;
  nombreOt: number;
  nombreEcritures: number;
  utilisateurTransmission?: string | null;
  utilisateurTraitement?: string | null;
  remarques?: string | null;
};

export type EcritureBudgetaire = {
  id: number;
  bordereauId: number;
  ordreTraitementId?: number | null;
  codeOt: string;
  transactionId: string;
  refTresor?: string | null;
  produitLibelleBrut: string;
  typeRecetteId?: number | null;
  typeRecetteLibelle?: string | null;
  antenneId?: number | null;
  montant: AmountValue;
  dateFlux: string;
  matriculeEtudiant?: string | null;
  statut: string;
};

export type LigneBudgetaire = {
  id: number;
  code: string;
  libelle: string;
  anneeBudgetaire: number;
  montantAlloue: AmountValue;
  montantUtilise: AmountValue;
  dateCreation: string;
  dateMiseAJour: string;
};

export type LotTraitement = {
  id: number;
  bordereauId: number;
  reference: string;
  statut: LotTraitementStatut | string;
  dateCreation: string;
  dateTraitement?: string | null;
  dateTransmissionBudget?: string | null;
  dateDebutFlux?: string | null;
  dateFinFlux?: string | null;
  typeRecetteId?: number | null;
  antenneId?: number | null;
  montantTotal: AmountValue;
  nombreEcritures: number;
  bordereau?: Bordereau;
  remarques?: string | null;
};

export type ControleOpOt = {
  id: number;
  ordrePaiementId: string;
  referenceOp: string;
  bordereauId: number;
  lotTraitementId: number;
  montantOt: AmountValue;
  montantOp: AmountValue;
  nombreLignesOt: number;
  nombreLignesOp: number;
  ecart: AmountValue;
  statutControle: ControleStatut | string;
  dateControle: string;
  bordereau?: Bordereau;
  lotTraitement?: LotTraitement;
};

export type OrdrePaiementLigne = {
  id: number;
  ordrePaiementId: string;
  sourceEcritureId: number;
  codeOt: string;
  refTresor?: string | null;
  produitLibelleBrut: string;
  typeRecetteId?: number | null;
  typeRecetteLibelle?: string | null;
  montant: AmountValue;
  matriculeEtudiant?: string | null;
  dateFlux: string;
};

export type OrdrePaiement = {
  id: string;
  referenceOp: string;
  sourceBordereauId: number;
  sourceLotTraitementId: number;
  montantTotal: AmountValue;
  nombreLignes: number;
  statut: OpStatut | string;
  utilisateurCreation?: string | null;
  utilisateurTransmission?: string | null;
  dateCreation: string;
  dateTransmissionCompta?: string | null;
  lignes?: OrdrePaiementLigne[];
};

export type BordereauListParams = {
  statut?: string;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  limit?: number;
};


export type LotTraitementListParams = {
  statut?: string;
  dateDebut?: string;
  dateFin?: string;
  codeOt?: string;
  titre?: string;
  utilisateur?: string;
  montantMin?: number;
  montantMax?: number;
  search?: string;
  sortBy?: 'dateCreation' | 'montantTotal' | 'nombreEcritures' | 'reference' | 'statut';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export type LotTraitementCreatePayload = {
  bordereauId?: number;
  reference?: string;
  dateDebutFlux?: string;
  dateFinFlux?: string;
  typeRecetteId?: number;
  antenneId?: number;
  ecritureIds?: number[];
  remarques?: string;
};

export type LotTraitementProcessPayload = {
  ligneBudgetaireId: number;
  utilisateurTraitement?: string;
  remarques?: string;
};

export type LigneBudgetairePayload = {
  code: string;
  libelle: string;
  anneeBudgetaire: number;
  montantAlloue: number;
};

export type OrdrePaiementListParams = {
  statut?: OpStatut;
  page?: number;
  limit?: number;
};
