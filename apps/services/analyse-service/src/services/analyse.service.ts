import { z } from 'zod';
import { aggregateSynthesis, SynthesisFilters, SynthesisLine } from './aggregation.service';
import { generateSynthesisPDF } from './pdfGenerator.service';
import { generateAttestationPDF } from './attestationGenerator.service';
import { storePdf } from './storage.service';
import { http, ETUDIANT_SERVICE_URL, ORDER_SERVICE_URL, TRANSACTION_SERVICE_URL } from '../utils/httpClient';
import { prisma } from '../utils/prisma';
import { pdfGenerationCounter } from '../utils/metrics';
import { AppError } from '../utils/errors';

export const SynthesisFiltersSchema = z.object({
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  antenneId: z.coerce.number().int().positive().optional(),
  niveauId: z.coerce.number().int().positive().optional(),
  typeRecetteId: z.coerce.number().int().positive().optional(),
});

const SynthesisLineSchema = z.object({
  codeOt: z.string().trim().min(1),
  antenneId: z.number().int().positive(),
  antenneCode: z.string().trim().min(1),
  antenneLibelle: z.string().trim().min(1),
  niveauId: z.number().int().positive(),
  niveauCode: z.string().trim().min(1),
  niveauLibelle: z.string().trim().min(1),
  statutId: z.number().int().positive(),
  statutLibelle: z.string().trim().min(1),
  typeRecetteId: z.number().int().positive(),
  typeRecetteLibelle: z.string().trim().min(1),
  montantCumule: z.number().nonnegative(),
  nombreFlux: z.number().int().nonnegative(),
  transactionIds: z.array(z.number().int().positive()).default([]),
});

export const ValidateSynthesisSchema = z.object({
  reference: z.string().trim().min(1).optional(),
  periodeDebut: z.string().optional(),
  periodeFin: z.string().optional(),
  typeFluxId: z.number().int().positive().default(2),
  filters: SynthesisFiltersSchema.optional(),
  lines: z.array(SynthesisLineSchema).optional(),
});

export type ValidateSynthesisInput = z.infer<typeof ValidateSynthesisSchema>;

const defaultPeriod = () => {
  const now = new Date();
  return {
    periodeDebut: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    periodeFin: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
  };
};

const buildReference = () => {
  const now = new Date();
  return `SYN-AN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now()}`;
};

const totalsFor = (lines: SynthesisLine[]) => ({
  montantTotal: lines.reduce((sum, line) => sum + line.montantCumule, 0),
  nombreFlux: lines.reduce((sum, line) => sum + line.nombreFlux, 0),
  nombreLignes: lines.length,
});

const resolveTypeFluxLabel = async (typeFluxId: number): Promise<string | null> => {
  try {
    const response = await http.get<any[]>(`${ETUDIANT_SERVICE_URL}/types-flux`);
    const flux = Array.isArray(response.data)
      ? response.data.find((item) => Number(item.id) === Number(typeFluxId))
      : null;
    return flux?.libelle || flux?.code || null;
  } catch {
    return null;
  }
};

export const generateSynthesis = async (filters: SynthesisFilters) => {
  const lines = await aggregateSynthesis(filters);
  return {
    filters,
    lines,
    totals: totalsFor(lines),
  };
};

export const validateSynthesis = async (payload: ValidateSynthesisInput, userId: number) => {
  const lines = payload.lines ?? await aggregateSynthesis(payload.filters ?? {});
  if (lines.length === 0) {
    throw new AppError(400, 'No synthesis line can be generated with the provided filters');
  }

  const reference = payload.reference ?? buildReference();
  const period = defaultPeriod();
  const periodeDebut = payload.periodeDebut ?? payload.filters?.dateDebut ?? period.periodeDebut;
  const periodeFin = payload.periodeFin ?? payload.filters?.dateFin ?? period.periodeFin;

  try {
    const typeFluxId = payload.typeFluxId ?? 2;
    const typeFluxLabel = await resolveTypeFluxLabel(typeFluxId);
    const pdfBuffer = await generateSynthesisPDF(lines, reference, typeFluxId, periodeDebut, periodeFin, typeFluxLabel);
    const pdfUrl = await storePdf(pdfBuffer, reference);

    const orderPayload = {
      reference,
      periodeDebut,
      periodeFin,
      typeFluxId: payload.typeFluxId,
      auteurId: userId,
      pdfUrl,
      lines: lines.map((line) => ({
        codeOt: line.codeOt,
        antenneId: line.antenneId,
        niveauId: line.niveauId,
        statutId: line.statutId,
        typeRecetteId: line.typeRecetteId,
        montantCumule: line.montantCumule,
        nombreFlux: line.nombreFlux,
        transactionIds: line.transactionIds,
      })),
    };

    const response = await http.post(`${ORDER_SERVICE_URL}/from-synthesis`, orderPayload);

    await prisma.analyseArchive.create({
      data: {
        reference,
        pdfUrl,
        createdById: userId,
      },
    });

    pdfGenerationCounter.inc({ status: 'success' });
    return {
      reference,
      pdfUrl,
      totals: totalsFor(lines),
      orderResult: response.data,
    };
  } catch (err) {
    pdfGenerationCounter.inc({ status: 'error' });
    throw err;
  }
};

export const getKpis = async (query: Record<string, unknown>, headers: Record<string, string>) => {
  const response = await http.get(`${TRANSACTION_SERVICE_URL}/kpis`, {
    params: query,
    headers,
  });
  return response.data;
};

export const previewSynthesisPDF = async (payload: { lines: any[], reference?: string, typeFluxId?: number, periodeDebut?: string, periodeFin?: string }) => {
  const reference = payload.reference || 'PREVIEW';
  const typeFluxId = payload.typeFluxId ?? 2;
  const typeFluxLabel = await resolveTypeFluxLabel(typeFluxId);
  const period = defaultPeriod();
  const dateDebut = payload.periodeDebut ? new Date(payload.periodeDebut) : new Date(period.periodeDebut);
  const dateFin = payload.periodeFin ? new Date(payload.periodeFin) : new Date(period.periodeFin);
  return await generateSynthesisPDF(payload.lines, reference, typeFluxId, dateDebut, dateFin, typeFluxLabel);
};

export const getAttestationPDF = async (payload: { student: any, transactions: any[] }) => {
  return await generateAttestationPDF(payload.student, payload.transactions);
};

