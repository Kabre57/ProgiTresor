import {
  OrdrePaiementFromLotInput,
  OrdrePaiementListQueryInput,
  TransmettreOpComptaInput,
} from '../../../../../shared/types/budget.types';
import * as repository from '../repositories/ordrePaiementRepository';
import { AppError } from '../utils/errors';
import { http, COMPTA_SERVICE_URL } from '../utils/httpClient';

const buildReferenceOp = (lotTraitementId: number) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `OP-${y}${m}${d}-${String(lotTraitementId).padStart(6, '0')}`;
};

export const createFromLot = async (payload: OrdrePaiementFromLotInput) => {
  const existing = await repository.findBySourceLot(payload.lotTraitementId);
  if (existing) {
    return existing;
  }

  return repository.createFromLot(payload, buildReferenceOp(payload.lotTraitementId));
};

export const listOrdresPaiement = async (query: OrdrePaiementListQueryInput) => {
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    repository.list({ statut: query.statut, skip, take: query.limit }),
    repository.count(query.statut),
  ]);
  return { items, total, page: query.page, limit: query.limit };
};

export const getOrdrePaiement = async (id: string) => {
  const op = await repository.findById(id);
  if (!op) {
    throw new AppError(404, 'Ordre de paiement introuvable');
  }
  return op;
};

export const transmettreCompta = async (id: string, input: TransmettreOpComptaInput) => {
  const op = await getOrdrePaiement(id);
  if (op.statut === 'TRANSMIS_COMPTA') {
    return op;
  }

  await http.post(`${COMPTA_SERVICE_URL}/controles/op`, {
    ordrePaiementId: op.id,
    referenceOp: op.referenceOp,
    bordereauId: op.sourceBordereauId,
    lotTraitementId: op.sourceLotTraitementId,
    montantOp: Number(op.montantTotal),
    nombreLignesOp: op.nombreLignes,
  });

  return repository.markTransmittedToCompta(id, input.utilisateurTransmission);
};
