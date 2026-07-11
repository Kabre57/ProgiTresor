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

export type OrderListEnvelope = {
  items?: PaymentOrder[];
  data?: PaymentOrder[];
  total?: number;
  page?: number;
  limit?: number;
};

export type OrderTransmissionResult = {
  code: string;
  success: boolean;
  message?: string;
  order?: PaymentOrder;
  outboxQueued?: boolean;
  bordereauStatus?: 'QUEUED' | 'CREATED' | 'ALREADY_EXISTS' | 'UNKNOWN';
  downloadUrl?: string;
};

export type SingleOrderTransmissionResult = {
  message: string;
  order: PaymentOrder;
  outboxQueued?: boolean;
  bordereauStatus?: 'QUEUED' | 'CREATED' | 'ALREADY_EXISTS' | 'UNKNOWN';
  downloadUrl?: string;
};
