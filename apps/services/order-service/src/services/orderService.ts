import * as orderRepository from '../repositories/orderRepository';
import { SagaCoordinator } from './sagaCoordinator';
import { NotFoundError, AppError } from '../utils/errors';
import { http, TRANSACTION_SERVICE_URL } from '../utils/httpClient';
import logger from '../utils/logger';

const allowedTransitions: Record<string, string[]> = {
  Brouillon: ['Transmis', 'Rejeté'],
  Transmis: ['Validé', 'Rejeté'],
  Validé: ['Approuvé', 'Rejeté'],
  Approuvé: ['Payé'],
  Rejeté: [],
  Payé: [],
};

export const generatePaymentOrders = async (auteurId: number) => {
  const coordinator = new SagaCoordinator(auteurId);
  return coordinator.execute();
};

const assertRoleForStatus = (newStatus: string, role: string | undefined) => {
  if (role === 'ADMIN') return;
  if (newStatus === 'Transmis' && role !== 'COMPTABLE') {
    throw new AppError(403, 'Only COMPTABLE or ADMIN can transmit OPs');
  }
  if (newStatus === 'Validé' && role !== 'CHEF_COMPTABLE') {
    throw new AppError(403, 'Only CHEF_COMPTABLE or ADMIN can validate OPs');
  }
  if (newStatus === 'Approuvé' && role !== 'DF') {
    throw new AppError(403, 'Only DF or ADMIN can approve OPs');
  }
  if (newStatus === 'Payé' && role !== 'BUDGET') {
    throw new AppError(403, 'Only BUDGET or ADMIN can mark OPs as paid');
  }
};

export const updateOrderStatus = async (
  code: string,
  newStatus: string,
  role: string | undefined,
  userId: number | null,
  motif?: string,
) => {
  const op = await orderRepository.findOpByCode(code);
  if (!op) {
    throw new NotFoundError('Ordre de paiement not found');
  }

  const nextStatuses = allowedTransitions[op.statut] ?? [];
  if (!nextStatuses.includes(newStatus)) {
    throw new AppError(400, `Transition ${op.statut} -> ${newStatus} is not allowed`);
  }

  assertRoleForStatus(newStatus, role);

  const now = new Date();
  const updateData: orderRepository.OpUpdateData = { statut: newStatus };

  if (newStatus === 'Transmis') {
    updateData.dateTransmissionBudget = now;
  } else if (newStatus === 'Validé' && userId) {
    updateData.dateValidationChefComptable = now;
    updateData.validateurChefComptableId = userId;
    updateData.valideParId = userId;
  } else if (newStatus === 'Approuvé' && userId) {
    updateData.dateApprobationDirecteurFinancier = now;
    updateData.approbateurDirecteurFinancierId = userId;
  } else if (newStatus === 'Rejeté') {
    updateData.dateRejet = now;
    updateData.motifRejet = motif ?? null;
    await http.post(`${TRANSACTION_SERVICE_URL}/unlink-op`, { ordrePaiementId: op.id });
  } else if (newStatus === 'Payé') {
    updateData.datePaiement = now;
  }

  const updated = await orderRepository.updateOp(code, updateData);

  try {
    await http.put(`${TRANSACTION_SERVICE_URL}/op-status`, {
      ordrePaiementId: updated.id,
      codeOp: updated.codeOp,
      statut: newStatus,
    });
  } catch (syncError) {
    logger.error({ syncError, codeOp: code, statut: newStatus }, 'Failed to synchronize OP status with transaction-service');
    throw new AppError(502, 'OP status updated locally but transaction-service synchronization failed');
  }

  return updated;
};

export const getAllOrders = async () => {
  return orderRepository.findAllOps();
};
