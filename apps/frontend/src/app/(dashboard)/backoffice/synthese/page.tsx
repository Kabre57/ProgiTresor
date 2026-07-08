'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, PlayCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { resolveGatewayFileUrl } from '@/lib/api/files';
import { useReferential } from '@/lib/hooks/useEtudiantQueries';
import { analyseApi } from '@/lib/api/analyseApi';
import {
  useDashboardKpis,
  useGenerateSynthesis,
  useValidateSynthesis,
} from '@/lib/hooks/useOperationsQueries';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { SynthesisDetailsModal } from '@/components/synthesis/SynthesisDetailsModal';
import { formatCurrency } from '@/lib/utils/format';
import type {
  AnalyseFilters,
  GenerateSynthesisResponse,
  SynthesisLine,
  ValidateSynthesisResponse,
} from '@/types/analyse.types';

type OptionType = {
  id: number;
  code?: string;
  libelle?: string;
  nom?: string;
};

const formatDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toNumberOrUndefined = (value: string) => (value ? Number(value) : undefined);

const isValidDate = (value?: string) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 2020 && year <= 2100;
};

export default function SynthesePage() {
  const today = useMemo(() => new Date(), []);
  const firstDayOfMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);

  const [filters, setFilters] = useState<AnalyseFilters>({
    dateDebut: formatDateString(firstDayOfMonth),
    dateFin: formatDateString(today),
  });
  const [synthesis, setSynthesis] = useState<GenerateSynthesisResponse | null>(null);
  const [validation, setValidation] = useState<ValidateSynthesisResponse | null>(null);
  const [reference, setReference] = useState('');
  const [selectedLine, setSelectedLine] = useState<SynthesisLine | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const toast = useToast();
  const { hasAccess } = usePermissions();
  const canReadKpis = hasAccess('ANALYSE', 1, 'READ_KPIS');
  const canGenerate = hasAccess('ANALYSE', 2, 'GENERATE_SYNTHESIS');
  const canValidate = hasAccess('ANALYSE', 3, 'VALIDATE_SYNTHESIS');
  const filtersAreValid = isValidDate(filters.dateDebut) && isValidDate(filters.dateFin);

  const antennesQuery = useReferential('antennes');
  const niveauxQuery = useReferential('niveaux');
  const typesRecettesQuery = useReferential('types-recettes');
  const kpisQuery = useDashboardKpis(
    filters.dateDebut,
    filters.dateFin,
    filters.antenneId,
    canReadKpis && filtersAreValid,
  );


  const generateSynthesis = useGenerateSynthesis();
  const validateSynthesis = useValidateSynthesis();

  const antenneOptions = useMemo(
    () => [
      { value: '', label: 'Toutes les antennes' },
      ...((antennesQuery.data ?? []) as OptionType[]).map((item) => ({
        value: String(item.id),
        label: item.nom || item.libelle || item.code || `Antenne #${item.id}`,
      })),
    ],
    [antennesQuery.data],
  );

  const niveauOptions = useMemo(
    () => [
      { value: '', label: 'Tous les niveaux' },
      ...((niveauxQuery.data ?? []) as OptionType[]).map((item) => ({
        value: String(item.id),
        label: item.libelle || item.code || `Niveau #${item.id}`,
      })),
    ],
    [niveauxQuery.data],
  );

  const typeRecetteOptions = useMemo(
    () => [
      { value: '', label: 'Toutes les recettes' },
      ...((typesRecettesQuery.data ?? []) as OptionType[]).map((item) => ({
        value: String(item.id),
        label: item.libelle || item.nom || item.code || `Recette #${item.id}`,
      })),
    ],
    [typesRecettesQuery.data],
  );

  const lines = synthesis?.lines ?? [];
  const totals = synthesis?.totals;
  const pdfUrl = resolveGatewayFileUrl(validation?.pdfUrl);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedLines = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return lines.slice(startIndex, startIndex + pageSize);
  }, [lines, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [lines.length]);

  const handleGenerate = async (customFilters = filters, showToast = false) => {
    if (!canGenerate) return;
    if (!isValidDate(customFilters.dateDebut) || !isValidDate(customFilters.dateFin)) {
      if (showToast) {
        toast.warning('Veuillez saisir une date complète et valide avant de générer la synthèse.');
      }
      return;
    }

    try {
      const result = await generateSynthesis.mutateAsync(customFilters);
      setSynthesis(result);
      setValidation(null);
      if (showToast) {
        if ((result.lines ?? []).length === 0) {
          toast.warning('Aucune transaction hors budget non assignée trouvée pour la période sélectionnée. Vérifiez vos filtres de dates.');
        } else {
          toast.success(`Synthèse hors budget générée : ${result.lines.length} ligne(s).`);
        }
      }
    } catch (err) {
      if (showToast) {
        toast.error(getErrorMessage(err));
      }
    }
  };

  useEffect(() => {
    if (canGenerate && filtersAreValid) {
      handleGenerate(filters, false);
    }
  }, [filters, canGenerate, filtersAreValid]);

  const handleValidate = async () => {
    if (!canValidate || lines.length === 0) return;

    try {
      const result = await validateSynthesis.mutateAsync({
        reference: reference || undefined,
        periodeDebut: filters.dateDebut,
        periodeFin: filters.dateFin,
        filters,
        lines,
      });
      setValidation(result);
      setReference('');
      toast.success('Synthèse validée et OT émis.');
      
      // Refresh proposed lines and KPI totals
      await handleGenerate(filters, false);
      await kpisQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const [previewing, setPreviewing] = useState(false);

  const handlePreview = async () => {
    if (lines.length === 0) return;
    setPreviewing(true);
    try {
      const payload = {
        reference: reference || 'APERCU_OT',
        periodeDebut: filters.dateDebut,
        periodeFin: filters.dateFin,
        typeFluxId: 2, // Hors Budget
        lines: lines.map((line) => ({
          codeOt: line.codeOt,
          antenneId: line.antenneId,
          niveauId: line.niveauId,
          statutId: line.statutId,
          typeRecetteId: line.typeRecetteId,
          montantCumule: line.montantCumule,
          nombreFlux: line.nombreFlux,
        })),
      };
      
      const blob = await analyseApi.previewPdf(payload);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      toast.error("Erreur lors de la génération de l'aperçu PDF : " + getErrorMessage(err));
    } finally {
      setPreviewing(false);
    }
  };

  const columns = [
    {
      key: 'codeOt',
      header: 'Code OT',
      render: (row: SynthesisLine) => <Badge tone="info">{row.codeOt}</Badge>,
    },
    {
      key: 'antenne',
      header: 'Antenne',
      render: (row: SynthesisLine) => row.antenneLibelle || row.antenneCode || `Antenne #${row.antenneId}`,
    },
    {
      key: 'niveau',
      header: 'Niveau',
      render: (row: SynthesisLine) => row.niveauLibelle || row.niveauCode || `Niveau #${row.niveauId}`,
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (row: SynthesisLine) => (
        <Badge tone={row.statutLibelle === 'Public' ? 'success' : 'warning'}>
          {row.statutLibelle || 'Public'}
        </Badge>
      ),
    },
    {
      key: 'typeRecette',
      header: 'Type de recette',
      render: (row: SynthesisLine) => row.typeRecetteLibelle || `Recette #${row.typeRecetteId}`,
    },
    {
      key: 'montantCumule',
      header: 'Montant cumulé',
      render: (row: SynthesisLine) => formatCurrency(row.montantCumule),
    },
    {
      key: 'nombreFlux',
      header: 'Flux',
      render: (row: SynthesisLine) => (
        <button
          type="button"
          onClick={() => {
            setSelectedLine(row);
            setIsDetailsOpen(true);
          }}
          className="text-[var(--primary)] font-bold hover:underline select-none"
        >
          {row.nombreFlux}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Synthèse hors budget"
        description="Génération, validation et archivage PDF des synthèses destinées aux ordres de traitement."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSynthesis(null);
                setValidation(null);
              }}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Réinitialiser
            </Button>
            {canGenerate && (
              <Button
                type="button"
                onClick={() => handleGenerate(filters, true)}
                loading={generateSynthesis.isPending}
                disabled={!filtersAreValid}
                icon={<PlayCircle className="h-4 w-4" />}
              >
                Générer la synthèse
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent>
            <div className="text-xs font-semibold uppercase text-slate-500">Hors budget (Non assigné)</div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {canReadKpis && kpisQuery.data ? formatCurrency(kpisQuery.data.unassignedHorsBudget) : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-xs font-semibold uppercase text-slate-500">Lignes générées</div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {totals?.nombreLignes ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres de synthèse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Input
              type="date"
              label="Début"
              value={filters.dateDebut ?? ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateDebut: event.target.value || undefined }))}
            />
            <Input
              type="date"
              label="Fin"
              value={filters.dateFin ?? ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateFin: event.target.value || undefined }))}
            />
            <Select
              label="Antenne"
              options={antenneOptions}
              value={filters.antenneId ? String(filters.antenneId) : ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, antenneId: toNumberOrUndefined(event.target.value) }))
              }
              searchable
            />
            <Select
              label="Niveau"
              options={niveauOptions}
              value={filters.niveauId ? String(filters.niveauId) : ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, niveauId: toNumberOrUndefined(event.target.value) }))
              }
              searchable
            />
            <Select
              label="Type de recette"
              options={typeRecetteOptions}
              value={filters.typeRecetteId ? String(filters.typeRecetteId) : ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, typeRecetteId: toNumberOrUndefined(event.target.value) }))
              }
              searchable
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résultat de synthèse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTable<SynthesisLine>
            data={paginatedLines}
            columns={columns}
            loading={generateSynthesis.isPending}
            getRowKey={(row) => row.codeOt}
            emptyLabel="Aucune ligne de synthèse générée"
            pagination={{
              currentPage,
              totalCount: lines.length,
              pageSize,
              onPageChange: (page) => setCurrentPage(page),
              onPageSizeChange: (size) => {
                setPageSize(size);
                setCurrentPage(1);
              },
            }}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Référence"
              placeholder="Référence automatique si vide"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              disabled={Boolean(validation)}
            />
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="text-xs font-semibold uppercase text-slate-500">Montant total</div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(totals?.montantTotal ?? 0)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="text-xs font-semibold uppercase text-slate-500">Nombre de flux</div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {totals?.nombreFlux ?? 0}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {validation ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>PDF généré pour la référence {validation.reference}</span>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
                  >
                    Télécharger
                  </a>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                {canValidate ? `${lines.length} ligne(s) prêtes à valider.` : 'Accès en lecture seule.'}
              </div>
            )}

            {canValidate && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePreview}
                  loading={previewing}
                  disabled={lines.length === 0 || Boolean(validation)}
                  icon={<FileText className="h-4 w-4" />}
                >
                  Prévisualiser le PDF
                </Button>
                <Button
                  type="button"
                  onClick={handleValidate}
                  loading={validateSynthesis.isPending}
                  disabled={lines.length === 0 || Boolean(validation)}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Valider la synthèse et émettre l&apos;OT
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SynthesisDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedLine(null);
        }}
        synthesisLine={selectedLine}
      />
    </div>
  );
}
