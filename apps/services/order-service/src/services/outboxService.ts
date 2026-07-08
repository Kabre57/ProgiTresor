import { Prisma } from '@prisma/client/index';
import { http, TRANSACTION_SERVICE_URL, COMPTA_SERVICE_URL } from '../utils/httpClient';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';

export type LockTransactionsPayload = {
  ordreTraitementId?: number;
  codeOt?: string;
  transactionIds?: number[];
  statut?: string;
};

export type AccountingEntryPayload = {
  codeOt: string;
  montant: number;
};

export type ComptaBordereauPayload = {
  codesOt: string[];
  sourceService?: string;
  utilisateurTransmission?: string;
};

const LOCK_TRANSACTIONS_TYPE = 'LOCK_TRANSACTIONS';
const CREATE_ACCOUNTING_ENTRY_TYPE = 'CREATE_ACCOUNTING_ENTRY';
const CREATE_COMPTA_BORDEREAU_TYPE = 'CREATE_COMPTA_BORDEREAU';

const MAX_RETRIES = Number(process.env.OUTBOX_MAX_RETRIES ?? 3);
const BASE_BACKOFF_MS = Number(process.env.OUTBOX_BASE_BACKOFF_MS ?? 1000);
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE ?? 10);

type PrismaTx = Prisma.TransactionClient;

export const enqueueTransactionLock = async (
  tx: PrismaTx,
  payload: LockTransactionsPayload,
) => {
  const jsonPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Prisma.InputJsonValue;

  return tx.outboxMessage.create({
    data: {
      type: LOCK_TRANSACTIONS_TYPE,
      payload: jsonPayload,
    },
  });
};

export const enqueueAccountingEntry = async (
  tx: PrismaTx,
  payload: AccountingEntryPayload,
) => {
  return tx.outboxMessage.create({
    data: {
      type: CREATE_ACCOUNTING_ENTRY_TYPE,
      payload: payload as Prisma.InputJsonValue,
    },
  });
};

export const enqueueComptaBordereau = async (
  tx: PrismaTx,
  payload: ComptaBordereauPayload,
) => {
  return tx.outboxMessage.create({
    data: {
      type: CREATE_COMPTA_BORDEREAU_TYPE,
      payload: payload as Prisma.InputJsonValue,
    },
  });
};

const getBackoffMs = (retryCount: number) => {
  return BASE_BACKOFF_MS * Math.pow(2, Math.max(retryCount - 1, 0));
};

const isReadyForRetry = (lastAttemptAt: Date | null, retryCount: number) => {
  if (!lastAttemptAt || retryCount === 0) return true;
  return Date.now() - lastAttemptAt.getTime() >= getBackoffMs(retryCount);
};

const processLockMessage = async (message: {
  id: number;
  payload: Prisma.JsonValue;
}) => {
  const payload = message.payload as LockTransactionsPayload;
  await http.patch(`${TRANSACTION_SERVICE_URL}/lock`, {
    ...payload,
    statut: payload.statut ?? 'Transmis',
  });
};

const processAccountingMessage = async (message: {
  id: number;
  payload: Prisma.JsonValue;
}) => {
  const payload = message.payload as AccountingEntryPayload;
  await http.post(`${COMPTA_SERVICE_URL}/entries`, {
    codeOt: payload.codeOt,
    montant: payload.montant,
  });
};

const processComptaBordereauMessage = async (message: {
  id: number;
  payload: Prisma.JsonValue;
}) => {
  const payload = message.payload as ComptaBordereauPayload;
  await http.post(`${COMPTA_SERVICE_URL}/bordereaux/from-ots`, {
    codesOt: payload.codesOt,
    sourceService: payload.sourceService ?? 'order-service',
    utilisateurTransmission: payload.utilisateurTransmission,
  });
};

export const processPendingOutbox = async () => {
  const messages = await prisma.outboxMessage.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  for (const message of messages) {
    if (!isReadyForRetry(message.lastAttemptAt, message.retryCount)) {
      continue;
    }

    try {
      await prisma.outboxMessage.update({
        where: { id: message.id },
        data: { lastAttemptAt: new Date() },
      });

      if (message.type === LOCK_TRANSACTIONS_TYPE) {
        await processLockMessage(message);
      } else if (message.type === CREATE_ACCOUNTING_ENTRY_TYPE) {
        await processAccountingMessage(message);
      } else if (message.type === CREATE_COMPTA_BORDEREAU_TYPE) {
        await processComptaBordereauMessage(message);
      } else {
        throw new Error(`Unsupported outbox message type: ${message.type}`);
      }

      await prisma.outboxMessage.update({
        where: { id: message.id },
        data: { status: 'PROCESSED' },
      });
    } catch (err) {
      const nextRetryCount = message.retryCount + 1;
      const failed = nextRetryCount >= MAX_RETRIES;

      await prisma.outboxMessage.update({
        where: { id: message.id },
        data: {
          retryCount: nextRetryCount,
          lastAttemptAt: new Date(),
          status: failed ? 'FAILED' : 'PENDING',
        },
      });

      const logPayload = { err, messageId: message.id, retryCount: nextRetryCount };
      if (failed) {
        logger.error(logPayload, 'ALERT: outbox message failed after max retries');
      } else {
        logger.warn(logPayload, 'Outbox message processing failed; retry scheduled');
      }
    }
  }
};

export const startOutboxWorker = () => {
  const intervalMs = Number(process.env.OUTBOX_WORKER_INTERVAL_MS ?? 5000);
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processPendingOutbox();
    } catch (err) {
      logger.error({ err }, 'Outbox worker tick failed');
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
};
