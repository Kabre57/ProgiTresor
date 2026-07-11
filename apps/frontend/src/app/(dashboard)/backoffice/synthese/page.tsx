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
  useAnalyseArchives,
} from '@/lib/hooks/useOperationsQueries';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { SynthesisDetailsModal } from '@/components/synthesis/SynthesisDetailsModal';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
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
  const today = useMemo(() => new Date(), []); const firstDayOfMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [filters, setFilters] = useState<AnalyseFilters>({
    dateDebut: formatDateString(firstDayOfMonth),
    dateFin: formatDateString(today),
  });
  const [synthesis, setSynthesis] = useState<GenerateSynthesisResponse | null>(null);
  const [validation, setValidation] = useState<ValidateSynthesisResponse | null>(null);
  const [reference, setReference] = useState('');
  const [titreOt, setTitreOt] = useState(''); const [descriptionOt, setDescriptionOt] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [selectedLine, setSelectedLine] = useState<SynthesisLine | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'archives'>('generate');
  const archivesQuery = useAnalyseArchives();
  const toast = useToast();
  const { hasAccess } = usePermissions();
  const canReadKpis = hasAccess('ANALYSE', 1, 'READ_KPIS');
  const canGenerate = hasAccess('ANALYSE', 2, 'GENERATE_SYNTHESIS');
  const canValidate = hasAccess('ANALYSE', 3, 'VALIDATE_SYNTHESIS');
  const filtersAreValid = isValidDate(filters.dateDebut) && isValidDate(filters.dateFin);
  const antennesQuery = useReferential('antennes');
  const promotionsQuery = useReferential('promotions');
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
  const promotionOptions = useMemo(
    () => [
      { value: '', label: 'Toutes les promotions' },
      ...((promotionsQuery.data ?? []) as any[]).map((item) => ({
        value: String(item.id),
        label: item.niveau ? `${item.niveau} ${item.ordre}` : (item.nom || `Promotion #${item.id}`),
      })),
    ],
    [promotionsQuery.data],
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
  const selectedLines = useMemo(() => lines.filter((line) => selectedCodes.has(line.codeOt)), [lines, selectedCodes]);
  const effectiveLines = selectedLines.length > 0 ? selectedLines : lines;
  const selectedTotals = useMemo(() => ({
    montantTotal: effectiveLines.reduce((sum, line) => sum + line.montantCumule, 0), nombreFlux: effectiveLines.reduce((sum, line) => sum + line.nombreFlux, 0),
  }), [effectiveLines]);
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
    setSelectedCodes(new Set());
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
        lines: effectiveLines,
        titre: titreOt || undefined,
        description: descriptionOt || undefined,
        referenceVague: `VAGUE-${Date.now()}`,
      });
      setValidation(result);
      setReference('');
      setTitreOt(''); setDescriptionOt(''); setSelectedCodes(new Set());
      toast.success('Synthèse validée et OT émis.');
      await handleGenerate(filters, false);
      await kpisQuery.refetch();
      await archivesQuery.refetch();
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
        periodeDebut: filters.dateDebut, periodeFin: filters.dateFin, typeFluxId: 2, // Hors Budget
        lines: lines.map((line) => ({
          codeOt: line.codeOt,
          antenneId: line.antenneId,
          niveauId: line.filiereId ?? 1,
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
      key: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Sélectionner toutes les lignes visibles"
          checked={paginatedLines.length > 0 && paginatedLines.every((line) => selectedCodes.has(line.codeOt))}
          onChange={(event) => setSelectedCodes((prev) => {
            const next = new Set(prev);
            paginatedLines.forEach((line) => event.target.checked ? next.add(line.codeOt) : next.delete(line.codeOt));
            return next;
          })}
        />
      ),
      render: (row: SynthesisLine) => (
        <input
          type="checkbox"
          aria-label={`Sélectionner ${row.codeOt}`}
          checked={selectedCodes.has(row.codeOt)}
          onChange={(event) => setSelectedCodes((prev) => {
            const next = new Set(prev);
            event.target.checked ? next.add(row.codeOt) : next.delete(row.codeOt);
            return next;
          })}
        />
      ),
    },
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
      header: 'Promotion',
      render: (row: SynthesisLine) => row.filiereLibelle || row.filiereCode || 'N/A',
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
          activeTab === 'generate' ? (
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
          ) : (
            <Button
              type="button"
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => archivesQuery.refetch()}
            >
              Actualiser
            </Button>
          )
        }
      />

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('generate')}
          className={cn(
            "pb-4 px-6 text-sm font-semibold border-b-2 transition-colors",
            activeTab === 'generate'
              ? "border-[var(--primary)] text-[var(--primary)] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          Nouvelle synthèse
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('archives')}
          className={cn(
            "pb-4 px-6 text-sm font-semibold border-b-2 transition-colors",
            activeTab === 'archives'
              ? "border-[var(--primary)] text-[var(--primary)] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          Synthèses validées (Archives)
        </button>
      </div>

      {activeTab === 'generate' ? (
        <>
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
                  label="Promotion"
                  options={promotionOptions}
                  value={filters.filiereId ? String(filters.filiereId) : ''}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, filiereId: toNumberOrUndefined(event.target.value) }))
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Résultat de synthèse</CardTitle>
                <div className="flex items-center gap-4 text-sm font-semibold">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="select-all-lines"
                      checked={effectiveLines.length > 0 && selectedCodes.size === effectiveLines.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCodes(new Set(effectiveLines.map(l => l.codeOt)));
                        } else {
                          setSelectedCodes(new Set());
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <label htmlFor="select-all-lines" className="select-none cursor-pointer">
                      Tout sélectionner ({effectiveLines.length})
                    </label>
                  </div>
                  <span className="text-slate-500">|</span>
                  <span className="text-amber-600">Sélectionné : {selectedCodes.size}</span>
                </div>
              </div>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <Input
                  label="Référence"
                  placeholder="Référence automatique si vide"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  disabled={Boolean(validation)}
                />
                <Input
                  label="Titre OT"
                  placeholder="Titre de la vague"
                  value={titreOt}
                  onChange={(event) => setTitreOt(event.target.value)}
                  disabled={Boolean(validation)}
                />
                <Input
                  label="Description"
                  placeholder="Description facultative"
                  value={descriptionOt}
                  onChange={(event) => setDescriptionOt(event.target.value)}
                  disabled={Boolean(validation)}
                />
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="text-xs font-semibold uppercase text-slate-500">Montant total</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency(selectedTotals.montantTotal)}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="text-xs font-semibold uppercase text-slate-500">Nombre de flux</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {selectedTotals.nombreFlux}
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
                    {canValidate ? `${effectiveLines.length} ligne(s) prête(s) à transmettre.` : 'Accès en lecture seule.'}
                  </div>
                )}
                {canValidate && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handlePreview}
                      loading={previewing}
                      disabled={effectiveLines.length === 0 || Boolean(validation)}
                      icon={<FileText className="h-4 w-4" />}
                    >
                      Prévisualiser le PDF
                    </Button>
                    <Button
                      type="button"
                      onClick={handleValidate}
                      loading={validateSynthesis.isPending}
                      disabled={effectiveLines.length === 0 || Boolean(validation)}
                      icon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Valider la synthèse et émettre l&apos;OT
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historique des synthèses validées</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={archivesQuery.data ?? []}
              loading={archivesQuery.isLoading || archivesQuery.isFetching}
              getRowKey={(row) => String(row.id)}
              emptyLabel="Aucune synthèse validée trouvée."
              columns={[
                {
                  key: 'reference',
                  header: 'Référence',
                  render: (row) => <Badge tone="info">{row.reference}</Badge>,
                },
                {
                  key: 'createdAt',
                  header: 'Date de validation',
                  render: (row) => formatDate(row.createdAt),
                },
                {
                  key: 'pdfUrl',
                  header: 'Document PDF',
                  render: (row) => {
                    const url = resolveGatewayFileUrl(row.pdfUrl);
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline font-semibold"
                      >
                        <FileText className="h-4 w-4" />
                        Télécharger le PDF
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    );
                  },
                },
              ]}
            />
          </CardContent>
        </Card>
      )}
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
