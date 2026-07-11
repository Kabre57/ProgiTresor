export type AnalyseFilters = {
  dateDebut?: string;
  dateFin?: string;
  antenneId?: number;
  filiereId?: number;
  typeRecetteId?: number;
};

export type SynthesisLine = {
  codeOt: string;
  antenneId: number;
  antenneCode?: string;
  antenneLibelle?: string;
  filiereId?: number;
  filiereCode?: string;
  filiereLibelle?: string;
  statutId?: number;
  statutLibelle?: string;
  typeRecetteId: number;
  typeRecetteLibelle?: string;
  montantCumule: number;
  nombreFlux: number;
  transactionIds: number[];
};

export type SynthesisTotals = {
  montantTotal: number;
  nombreFlux: number;
  nombreLignes: number;
};

export type GenerateSynthesisResponse = {
  filters?: AnalyseFilters;
  lines: SynthesisLine[];
  totals: SynthesisTotals;
};

export type ValidateSynthesisPayload = {
  reference?: string;
  periodeDebut?: string;
  periodeFin?: string;
  typeFluxId?: number;
  filters?: AnalyseFilters;
  lines?: SynthesisLine[];
  titre?: string;
  description?: string;
  referenceVague?: string;
};

export type ValidateSynthesisResponse = {
  reference: string;
  pdfUrl: string;
  totals: SynthesisTotals;
  orderResult?: unknown;
};

export type AnalyseKpis = {
  totalBudget: number;
  totalHorsBudget: number;
  totalNonClassifie?: number;
  unassignedBudget?: number;
  unassignedHorsBudget?: number;
  unassignedNonClassifie?: number;
  expectedBudget?: number;
  expectedHorsBudget?: number;
  resteBudget?: number;
  resteHorsBudget?: number;
  nonClassifieCount?: number;
  byLibelle: {
    libelle: string;
    type: string;
    montant: number;
  }[];
};
