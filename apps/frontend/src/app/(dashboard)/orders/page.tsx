'use client';

import { CheckCircle, CopyPlus, ExternalLink, Lock, RotateCcw } from 'lucide-react';
import { PiCloudArrowDownDuotone } from 'react-icons/pi';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/api/client';
import { resolveGatewayFileUrl } from '@/lib/api/files';
import { useCreateOrderCorrection, useOrders, useUpdateOrderStatus } from '@/lib/hooks/useOperationsQueries';
import { useReferential } from '@/lib/hooks/useEtudiantQueries';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { orderApi } from '@/lib/api/orderApi';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { PaymentOrder } from '@/types/order.types';

type OptionType = {
  id: number;
  libelle?: string;
  nom?: string;
  code?: string;
};

const statusOptions = [
  { label: 'Brouillon', value: 'Brouillon' },
  { label: 'Transmis', value: 'Transmis' },
  { label: 'Validé', value: 'Validé' },
  { label: 'Transmis au Budget', value: 'TRANSMIS_AU_BUDGET' },
  { label: 'Approuvé', value: 'Approuvé' },
  { label: 'Payé', value: 'Payé' },
  { label: 'Rejeté', value: 'Rejeté' },
];

export default function OrdersPage() {
  const ordersQuery = useOrders();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const updateStatus = useUpdateOrderStatus();
  const createCorrection = useCreateOrderCorrection();
  const { hasAccess } = usePermissions();
  const user = useAuthStore((state) => state.user);
  const normalizedRole = user?.role?.code?.toUpperCase()?.replace(/\s+/g, '_') || '';
  const isChefComptableOrDf = normalizedRole === 'CHEF_COMPTABLE' || normalizedRole === 'DF' || normalizedRole === 'ADMIN';

  const [confirmTransmitOpen, setConfirmTransmitOpen] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [selectedOtCodes, setSelectedOtCodes] = useState<string[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const [selected, setSelected] = useState<PaymentOrder | null>(null);
  const [statut, setStatut] = useState('VALIDE_CHEF');
  const [motif, setMotif] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filter States
  const [selectedAntenneId, setSelectedAntenneId] = useState<string>('all');
  const [selectedNiveauId, setSelectedNiveauId] = useState<string>('all');
  const [selectedTypeRecetteId, setSelectedTypeRecetteId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');

  // Load referentials for ID mapping
  const antennesQuery = useReferential('antennes');
  const niveauxQuery = useReferential('niveaux');
  const typeRecettesQuery = useReferential('types-recettes');
  const canCorrectOp = hasAccess('OT', 4, 'CORRECT') || hasAccess('OT', 4);

  const getAntenneLabel = (id: number) => {
    const list = (antennesQuery.data ?? []) as OptionType[];
    const item = list.find((a) => a.id === id);
    return item ? (item.libelle || item.nom || item.code || '') : `Antenne #${id}`;
  };

  const getNiveauLabel = (id: number) => {
    const list = (niveauxQuery.data ?? []) as OptionType[];
    const item = list.find((n) => n.id === id);
    return item ? (item.libelle || item.nom || item.code || '') : `Niveau #${id}`;
  };

  const getTypeRecetteLabel = (id: number) => {
    const list = (typeRecettesQuery.data ?? []) as OptionType[];
    const item = list.find((t) => t.id === id);
    return item ? (item.libelle || item.nom || item.code || '') : `Recette #${id}`;
  };

  const allOrders = ordersQuery.data ?? [];

  // Parse available periods dynamically from all orders' syntheses
  const periodOptions = useMemo(() => {
    const list: { value: string; label: string; start: Date; end: Date }[] = [];
    const seen = new Set<string>();
    
    for (const order of allOrders) {
      const syn = order.synthese as { periodeDebut?: string; periodeFin?: string } | undefined;
      if (syn?.periodeDebut && syn?.periodeFin) {
        const start = new Date(syn.periodeDebut);
        const end = new Date(syn.periodeFin);
        const key = `${start.toISOString()}_${end.toISOString()}`;
        if (!seen.has(key)) {
          seen.add(key);
          
          const startMonthStr = start.toLocaleDateString('fr-FR', { month: 'long' });
          const endMonthStr = end.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
          const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
          const label = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
            ? cap(start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
            : `${cap(startMonthStr)} - ${cap(endMonthStr)}`;
            
          list.push({ value: key, label, start, end });
        }
      }
    }
    return list;
  }, [allOrders]);

  // Options lists formatted for custom Select components
  const antenneSelectOptions = useMemo(() => {
    const list = (antennesQuery.data ?? []) as OptionType[];
    return [
      { value: 'all', label: 'Toutes les antennes' },
      ...list.map((item) => ({
        value: String(item.id),
        label: item.libelle || item.nom || item.code || '',
      })),
    ];
  }, [antennesQuery.data]);

  const niveauSelectOptions = useMemo(() => {
    const list = (niveauxQuery.data ?? []) as OptionType[];
    return [
      { value: 'all', label: 'Tous les niveaux' },
      ...list.map((item) => ({
        value: String(item.id),
        label: item.libelle || item.code || '',
      })),
    ];
  }, [niveauxQuery.data]);

  const typeRecetteSelectOptions = useMemo(() => {
    const list = (typeRecettesQuery.data ?? []) as OptionType[];
    return [
      { value: 'all', label: 'Toutes les recettes' },
      ...list.map((item) => ({
        value: String(item.id),
        label: item.libelle || item.nom || item.code || '',
      })),
    ];
  }, [typeRecettesQuery.data]);

  const periodSelectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Toutes les périodes' },
      ...periodOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
      })),
    ];
  }, [periodOptions]);

  const statutSelectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Tous les statuts' },
      ...statusOptions,
    ];
  }, []);

  // Apply filters on the list
  const filteredOrders = allOrders.filter((order) => {
    if (selectedAntenneId !== 'all' && Number(order.antenneId) !== Number(selectedAntenneId)) return false;
    if (selectedNiveauId !== 'all' && Number(order.niveauId) !== Number(selectedNiveauId)) return false;
    if (selectedTypeRecetteId !== 'all' && Number(order.typeRecetteId) !== Number(selectedTypeRecetteId)) return false;
    if (selectedStatut !== 'all' && order.statut !== selectedStatut) return false;
    
    // Period filter
    if (selectedPeriod !== 'all') {
      const syn = order.synthese as { periodeDebut?: string; periodeFin?: string } | undefined;
      if (!syn?.periodeDebut || !syn?.periodeFin) return false;
      const start = new Date(syn.periodeDebut).toISOString();
      const end = new Date(syn.periodeFin).toISOString();
      const key = `${start}_${end}`;
      if (key !== selectedPeriod) return false;
    }
    
    return true;
  });

  const paginatedOrders = filteredOrders.slice((page - 1) * limit, page * limit);

  const totalMontant = filteredOrders.reduce((acc, curr) => acc + Number(curr.montantCumule ?? 0), 0);
  const totalTransactions = filteredOrders.reduce((acc, curr) => acc + Number(curr.nombreFlux ?? 0), 0);

  const submitStatus = async () => {
    const code = selected?.codeOt ?? selected?.code;
    if (!code) return;
    setError(null);
    setMessage(null);
    try {
      await updateStatus.mutateAsync({ code, statut, motif: motif || undefined });
      setSelected(null);
      setMessage('Statut mis à jour.');
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    }
  };

  const handleStatusChange = async (targetStatus: string) => {
    const code = selected?.codeOt ?? selected?.code;
    if (!code) return;
    setError(null);
    setMessage(null);
    try {
      await updateStatus.mutateAsync({ code, statut: targetStatus, motif: motif || undefined });
      setSelected(null);
      setMotif('');
      setMessage('Statut mis à jour avec succès.');
      ordersQuery.refetch();
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    }
  };

  const handleTransmitBudget = async () => {
    const code = selected?.codeOt ?? selected?.code;
    if (!code) return;
    setIsTransmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await orderApi.transmettreBudget(code);
      setMessage(result.message);
      setConfirmTransmitOpen(false);
      setSelected(null);
      
      const downloadUrl = resolveGatewayFileUrl(result.downloadUrl);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      ordersQuery.refetch();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsTransmitting(false);
    }
  };

  const submitCorrection = async () => {
    const code = selected?.codeOt ?? selected?.code;
    if (!code || !canCorrectOp) return;
    setError(null);
    setMessage(null);
    try {
      const corrected = await createCorrection.mutateAsync({ code });
      setSelected(corrected);
      setMessage('Nouvelle version d’OT créée.');
    } catch (correctionError) {
      setError(getErrorMessage(correctionError));
    }
  };

  const handleSingleValidateAndTransmit = async (code: string) => {
    setError(null);
    setMessage(null);
    try {
      const results = await orderApi.validateAndTransmit([code]);
      const targetResult = results[0];
      if (targetResult && targetResult.success) {
        const msg = `L'ordre de traitement ${code} a été validé et transmis au budget avec succès.`;
        setMessage(msg);
        toast.success(msg);
        
        // Clear if it was selected in bulk
        setSelectedOtCodes(prev => prev.filter(c => c !== code));
        
        ordersQuery.refetch();
        
        // Trigger download
        if (targetResult.downloadUrl) {
          const downloadUrl = resolveGatewayFileUrl(targetResult.downloadUrl);
          if (downloadUrl) {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', '');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } else {
        const errMsg = targetResult?.message || "Une erreur est survenue.";
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = getErrorMessage(err);
      setError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleBulkValidateAndTransmit = async () => {
    if (selectedOtCodes.length === 0) return;

    setIsProcessingBulk(true);
    setError(null);
    setMessage(null);
    try {
      const results = await orderApi.validateAndTransmit(selectedOtCodes);
      
      const failed = results.filter((r: any) => !r.success);
      const succeeded = results.filter((r: any) => r.success);

      if (failed.length === 0) {
        const msg = `${succeeded.length} Ordres de traitement validés et transmis au budget avec succès.`;
        setMessage(msg);
        toast.success(msg);
        setSelectedOtCodes([]);
        ordersQuery.refetch();

        // Download pivots sequentially
        succeeded.forEach((r: any) => {
          if (r.downloadUrl) {
            const downloadUrl = resolveGatewayFileUrl(r.downloadUrl);
            if (downloadUrl) {
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.setAttribute('download', '');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }
        });
      } else {
        const errMsg = `Traitement partiel : ${succeeded.length} succès, ${failed.length} échecs.`;
        setError(errMsg);
        toast.error(errMsg);
        setSelectedOtCodes(failed.map((f: any) => f.code));
        ordersQuery.refetch();
        
        // Download successful pivots
        succeeded.forEach((r: any) => {
          if (r.downloadUrl) {
            const downloadUrl = resolveGatewayFileUrl(r.downloadUrl);
            if (downloadUrl) {
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.setAttribute('download', '');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }
        });
      }
    } catch (err: any) {
      const errMsg = getErrorMessage(err);
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Determine current period display text for print template
  const selectedPeriodObj = periodOptions.find((p) => p.value === selectedPeriod);
  const periodDisplayText = selectedPeriodObj
    ? `${selectedPeriodObj.label} (Fichiers Trésor Pay)`
    : 'Toutes les périodes (Fichiers Trésor Pay)';

  return (
    <>
      {/* NORMAL BROWSER VIEW (HIDDEN ON PRINT) */}
      <div className="space-y-6 print:hidden">
        <PageHeader
          title="Ordres de traitement"
          description="Filtrage et consultation de la synthèse des flux Hors Budget."
          actions={
            <Button
              variant="default"
              type="button"
              onClick={() => window.print()}
              disabled={filteredOrders.length === 0}
              icon={<PiCloudArrowDownDuotone className="text-xl" />}
            >
              Imprimer la synthèse (PDF)
            </Button>
          }
        />

        {message && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres de tri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Select
                  label="Antenne (INFAS)"
                  options={antenneSelectOptions}
                  value={selectedAntenneId}
                  onChange={(e) => {
                    setSelectedAntenneId(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <Select
                  label="Niveau"
                  options={niveauSelectOptions}
                  value={selectedNiveauId}
                  onChange={(e) => {
                    setSelectedNiveauId(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <Select
                  label="Type de recette"
                  options={typeRecetteSelectOptions}
                  value={selectedTypeRecetteId}
                  onChange={(e) => {
                    setSelectedTypeRecetteId(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <Select
                  label="Période d'analyse"
                  options={periodSelectOptions}
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <Select
                  label="Statut"
                  options={statutSelectOptions}
                  value={selectedStatut}
                  onChange={(e) => {
                    setSelectedStatut(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List Card */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des ordres de traitement filtrés</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable<PaymentOrder>
              data={paginatedOrders}
              loading={ordersQuery.isLoading || antennesQuery.isLoading || niveauxQuery.isLoading || typeRecettesQuery.isLoading}
              getRowKey={(row, index) => String(row.id ?? row.codeOt ?? index)}
              columns={[
                {
                  key: 'select',
                  header: (
                    <input
                      type="checkbox"
                      checked={
                        paginatedOrders.length > 0 &&
                        paginatedOrders
                          .filter(o => o.statut === 'EN_ATTENTE_BUDGET' || o.statut === 'Transmis')
                          .every(o => selectedOtCodes.includes(String(o.codeOt ?? o.code)))
                      }
                      onChange={(e) => {
                        const pageCodes = paginatedOrders
                          .filter(o => o.statut === 'EN_ATTENTE_BUDGET' || o.statut === 'Transmis')
                          .map(o => String(o.codeOt ?? o.code));
                        if (e.target.checked) {
                          setSelectedOtCodes(prev => Array.from(new Set([...prev, ...pageCodes])));
                        } else {
                          setSelectedOtCodes(prev => prev.filter(c => !pageCodes.includes(c)));
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                  ),
                  render: (row) => {
                    const isSelectable = row.statut === 'EN_ATTENTE_BUDGET' || row.statut === 'Transmis';
                    if (!isSelectable) return <div className="w-4 h-4" />;
                    const code = String(row.codeOt ?? row.code);
                    return (
                      <input
                        type="checkbox"
                        checked={selectedOtCodes.includes(code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOtCodes(prev => [...prev, code]);
                          } else {
                            setSelectedOtCodes(prev => prev.filter(c => c !== code));
                          }
                        }}
                        className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                    );
                  },
                },
                {
                  key: 'codeOt',
                  header: 'Code OT',
                  render: (row) => <Badge tone="info">{String(row.codeOt ?? row.code ?? '-')}</Badge>,
                },
                {
                  key: 'antenne',
                  header: 'Antenne',
                  render: (row) => getAntenneLabel(Number(row.antenneId)),
                },
                {
                  key: 'niveau',
                  header: 'Niveau Étudiant',
                  render: (row) => getNiveauLabel(Number(row.niveauId)),
                },
                {
                  key: 'statutEtudiant',
                  header: 'Statut Étudiant',
                  render: (row) => (
                    <Badge tone={row.statutId === 1 ? 'success' : 'warning'}>
                      {row.statutId === 1 ? 'Public' : row.statutId === 2 ? 'Privé' : '-'}
                    </Badge>
                  ),
                },
                {
                  key: 'typeRecette',
                  header: 'Type de recette',
                  render: (row) => getTypeRecetteLabel(Number(row.typeRecetteId)),
                },
                {
                  key: 'montant',
                  header: 'Montant Cumulé',
                  render: (row) => formatCurrency(Number(row.montantCumule ?? 0)),
                },
                {
                  key: 'statut',
                  header: 'Statut',
                  render: (row) => {
                    const status = String(row.statut ?? '');
                    let tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
                    let label = status;

                    if (status === 'Brouillon') tone = 'neutral';
                    else if (status === 'EN_ATTENTE_BUDGET') {
                      tone = 'warning';
                      label = 'En attente Budget';
                    }
                    else if (status === 'Transmis') tone = 'info';
                    else if (status === 'Validé') tone = 'success';
                    else if (status === 'TRANSMIS_AU_BUDGET') {
                      tone = 'success';
                      label = 'Transmis au Budget';
                    }
                    else if (status === 'Approuvé') {
                      tone = 'success';
                      label = 'Approuvé';
                    }
                    else if (status === 'Payé') {
                      tone = 'success';
                      label = 'Payé';
                    }
                    else if (status === 'Rejeté') tone = 'danger';

                    return <Badge tone={tone}>{label}</Badge>;
                  },
                },
                {
                  key: 'version',
                  header: 'Version',
                  render: (row) => `v${Number(row.version ?? 1)}`,
                },
                {
                  key: 'pdf',
                  header: 'PDF',
                  render: (row) => {
                    const pdfUrl = resolveGatewayFileUrl(row.pdfUrl ?? row.pdfPath);
                    if (!pdfUrl) return <span className="text-slate-400">-</span>;
                    return (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline"
                      >
                        PDF
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => {
                    const isLocked = Boolean(row.pdfUrl ?? row.pdfPath);
                    const code = String(row.codeOt ?? row.code);
                    const isExpressAvailable = row.statut === 'EN_ATTENTE_BUDGET' || row.statut === 'Transmis';

                    return (
                      <div className="flex items-center gap-2">
                        {isExpressAvailable && isChefComptableOrDf && (
                          <Button
                            type="button"
                            variant="default"
                            onClick={() => handleSingleValidateAndTransmit(code)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm transition-all duration-200"
                            title="Valider & Transmettre immédiatement au budget"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Valider & Transmettre</span>
                          </Button>
                        )}
                        {isLocked && (
                          <span
                            className="inline-flex items-center text-slate-500"
                            title="Cet OT est verrouillé car un PDF est attaché."
                          >
                            <Lock className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelected(row)}
                          aria-label="Changer statut"
                          title="Plus d'actions / Historique"
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
              pagination={{
                currentPage: page,
                totalCount: filteredOrders.length,
                pageSize: limit,
                onPageChange: (p) => setPage(p),
                onPageSizeChange: (l) => {
                  setLimit(l);
                  setPage(1);
                },
              }}
            />
          </CardContent>
        </Card>

        <Modal open={Boolean(selected)} title="Changer le statut" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <Input label="Ordre" value={String(selected?.codeOt ?? '-')} readOnly />
            <Input label="Version" value={`v${Number(selected?.version ?? 1)}`} readOnly />

            {/* Timeline historique de l'OT */}
            <div className="mt-4 border-t pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Historique de l'OT</h4>
              <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-4 ml-3">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Création de l'Ordre</p>
                  <p className="text-[10px] text-slate-400">{selected?.dateCreation ? formatDate(selected.dateCreation) : '-'}</p>
                </div>
                
                <div className="relative">
                  <div className={cn("absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900", selected?.dateEmission ? "bg-emerald-500" : "bg-slate-300")} />
                  <p className={cn("text-xs font-semibold", selected?.dateEmission ? "text-slate-800 dark:text-slate-200" : "text-slate-400")}>Rattachement / Émission</p>
                  {!!selected?.dateEmission && <p className="text-[10px] text-slate-400">{formatDate(selected.dateEmission as string)}</p>}
                </div>

                <div className="relative">
                  <div className={cn("absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900", selected?.dateTransmissionBudget ? "bg-indigo-500" : "bg-slate-300")} />
                  <p className={cn("text-xs font-semibold", selected?.dateTransmissionBudget ? "text-slate-800 dark:text-slate-200" : "text-slate-400")}>Transmission au Budget</p>
                  {!!selected?.dateTransmissionBudget && <p className="text-[10px] text-slate-400">{formatDate(selected.dateTransmissionBudget as string)}</p>}
                </div>

                <div className="relative">
                  <div className={cn("absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900", selected?.dateValidationChefComptable ? "bg-teal-500" : "bg-slate-300")} />
                  <p className={cn("text-xs font-semibold", selected?.dateValidationChefComptable ? "text-slate-800 dark:text-slate-200" : "text-slate-400")}>Validation Chef Comptable</p>
                  {!!selected?.dateValidationChefComptable && <p className="text-[10px] text-slate-400">{formatDate(selected.dateValidationChefComptable as string)}</p>}
                </div>

                <div className="relative">
                  <div className={cn("absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900", selected?.dateApprobationDirecteurFinancier ? "bg-green-500" : "bg-slate-300")} />
                  <p className={cn("text-xs font-semibold", selected?.dateApprobationDirecteurFinancier ? "text-slate-800 dark:text-slate-200" : "text-slate-400")}>Approbation Directeur Financier</p>
                  {!!selected?.dateApprobationDirecteurFinancier && <p className="text-[10px] text-slate-400">{formatDate(selected.dateApprobationDirecteurFinancier as string)}</p>}
                </div>

                {selected?.statut === 'Rejeté' && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900" />
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Rejeté</p>
                    {!!selected?.dateRejet && <p className="text-[10px] text-slate-400">{formatDate(selected.dateRejet as string)}</p>}
                    {!!selected?.motifRejet && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded mt-1">{selected.motifRejet as string}</p>}
                  </div>
                )}

                {!!selected?.datePaiement && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900" />
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Payé</p>
                    <p className="text-[10px] text-slate-400">{formatDate(selected.datePaiement as string)}</p>
                  </div>
                )}
              </div>
            </div>
            {selected?.pdfUrl || selected?.pdfPath ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                Cet OT est verrouillé car un PDF est attaché. Les corrections doivent créer une nouvelle version.
                {resolveGatewayFileUrl(selected.pdfUrl ?? selected.pdfPath) && (
                  <a
                    href={resolveGatewayFileUrl(selected.pdfUrl ?? selected.pdfPath) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 font-semibold underline-offset-2 hover:underline"
                  >
                    Télécharger le PDF
                  </a>
                )}
              </div>
            ) : null}
            {!selected?.pdfUrl && !selected?.pdfPath && (
              <Textarea 
                label="Motif (Requis uniquement en cas de rejet)" 
                placeholder="Saisissez un motif si vous souhaitez rejeter cet ordre..."
                value={motif} 
                onChange={(event) => setMotif(event.target.value)} 
              />
            )}
            <div className="flex flex-col gap-3 border-t pt-4 mt-4">
              {/* Correction action (only if locked/has PDF) */}
              {(selected?.pdfUrl || selected?.pdfPath) && canCorrectOp && (
                <div className="mb-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={submitCorrection}
                    loading={createCorrection.isPending}
                    disabled={!selected?.codeOt && !selected?.code}
                    className="w-full sm:w-auto"
                    icon={<CopyPlus className="h-4 w-4" />}
                  >
                    Corriger et créer une nouvelle version
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {/* Cancel / Close button */}
                <Button type="button" variant="secondary" onClick={() => { setSelected(null); setMotif(''); }}>
                  Fermer
                </Button>

                {/* Context-sensitive actions */}
                {!selected?.pdfUrl && !selected?.pdfPath && (
                  <>
                    {/* 1. Brouillon status actions */}
                    {selected?.statut === 'Brouillon' && (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleStatusChange('Rejeté')}
                          loading={updateStatus.isPending}
                          disabled={!motif.trim()}
                          title={!motif.trim() ? "Veuillez saisir un motif de rejet" : ""}
                        >
                          Rejeter
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => handleStatusChange('Transmis')}
                          loading={updateStatus.isPending}
                        >
                          Transmettre pour validation
                        </Button>
                      </>
                    )}

                    {/* 2. En attente budget / Transmis status actions */}
                    {(selected?.statut === 'EN_ATTENTE_BUDGET' || selected?.statut === 'Transmis') && (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleStatusChange('Rejeté')}
                          loading={updateStatus.isPending}
                          disabled={!motif.trim()}
                          title={!motif.trim() ? "Veuillez saisir un motif de rejet" : ""}
                        >
                          Rejeter
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleStatusChange('Validé')}
                          loading={updateStatus.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        >
                          Valider l'Ordre
                        </Button>
                      </>
                    )}

                    {/* 3. Validé status actions */}
                    {selected?.statut === 'Validé' && (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleStatusChange('Rejeté')}
                          loading={updateStatus.isPending}
                          disabled={!motif.trim()}
                          title={!motif.trim() ? "Veuillez saisir un motif de rejet" : ""}
                        >
                          Rejeter
                        </Button>
                        {isChefComptableOrDf && (
                          <Button
                            type="button"
                            variant="default"
                            onClick={() => setConfirmTransmitOpen(true)}
                            disabled={isTransmitting}
                          >
                            Transmettre au Budget
                          </Button>
                        )}
                      </>
                    )}

                    {/* 4. Transmis au budget status actions */}
                    {selected?.statut === 'TRANSMIS_AU_BUDGET' && (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleStatusChange('Rejeté')}
                          loading={updateStatus.isPending}
                          disabled={!motif.trim()}
                          title={!motif.trim() ? "Veuillez saisir un motif de rejet" : ""}
                        >
                          Rejeter
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleStatusChange('Approuvé')}
                          loading={updateStatus.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        >
                          Approuver l'Ordre
                        </Button>
                      </>
                    )}

                    {/* 5. Approuvé status actions */}
                    {selected?.statut === 'Approuvé' && (
                      <Button
                        type="button"
                        onClick={() => handleStatusChange('Payé')}
                        loading={updateStatus.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      >
                        Confirmer le Paiement
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>

        <Modal open={confirmTransmitOpen} title="Confirmer la transmission" onClose={() => setConfirmTransmitOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Cette action va geler toutes les transactions associées à cet Ordre de Traitement pour la comptabilité publique et générer le fichier pivot CSV.
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Voulez-vous continuer ?
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmTransmitOpen(false)} disabled={isTransmitting}>
                Annuler
              </Button>
              <Button type="button" variant="default" onClick={handleTransmitBudget} loading={isTransmitting}>
                Confirmer la transmission
              </Button>
            </div>
          </div>
        </Modal>

        {/* Floating Action Tray */}
        {selectedOtCodes.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <span className="text-sm font-medium">
              {selectedOtCodes.length} Ordre(s) de traitement sélectionné(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedOtCodes([])}
                className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                disabled={isProcessingBulk}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleBulkValidateAndTransmit}
                loading={isProcessingBulk}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                Valider & Transmettre la sélection
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* PRINT-ONLY PDF TEMPLATE (HIDDEN ON SCREEN, VISIBLE ONLY IN window.print()) */}
      <div className="hidden print:block p-8 bg-white text-black font-sans text-xs max-w-4xl mx-auto">
        <div className="border-b-2 border-blue-600 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Synthèse des Recettes Hors Budget</h1>
        </div>

        <div className="mt-6 grid grid-cols-2 border border-gray-200 divide-x divide-y divide-gray-200">
          <div className="p-3 bg-gray-50/50">
            <span className="font-semibold text-gray-700 block text-[10px] uppercase">Période d'Analyse :</span>
            <span className="text-xs text-gray-600 font-medium">{periodDisplayText}</span>
          </div>
          <div className="p-3 bg-gray-50/50">
            <span className="font-semibold text-gray-700 block text-[10px] uppercase">Date Génération :</span>
            <span className="text-xs text-gray-600 font-medium">
              {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="p-3 bg-gray-50/50">
            <span className="font-semibold text-gray-700 block text-[10px] uppercase">Statut des Flux :</span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                HORS BUDGET
              </span>
              <span className="text-xs text-gray-500 font-medium">(En attente de reversement)</span>
            </div>
          </div>
          <div className="p-3 bg-gray-50/50">
            <span className="font-semibold text-gray-700 block text-[10px] uppercase">Auteur / Service :</span>
            <span className="text-xs text-gray-600 font-medium">Direction Comptable & Financière</span>
          </div>
        </div>

        <table className="w-full mt-8 border-collapse border border-gray-200 text-[11px]">
          <thead>
            <tr className="bg-blue-600 text-white text-left font-bold uppercase tracking-wider divide-x divide-gray-200">
              <th className="p-3">Code OT</th>
              <th className="p-3">Antenne (INFAS)</th>
              <th className="p-3">Niveau Étudiant</th>
              <th className="p-3">Statut Étudiant</th>
              <th className="p-3">Type de Recette (Flux)</th>
              <th className="p-3 text-right">Montant Cumulé (XOF)</th>
              <th className="p-3 text-center">Nbr Transactions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOrders.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 divide-x divide-gray-200">
                <td className="p-3 font-mono font-bold text-gray-900">{String(row.codeOt ?? row.code ?? '-')}</td>
                <td className="p-3">{getAntenneLabel(Number(row.antenneId))}</td>
                <td className="p-3">{getNiveauLabel(Number(row.niveauId))}</td>
                <td className="p-3">{row.statutId === 1 ? 'Public' : row.statutId === 2 ? 'Privé' : '-'}</td>
                <td className="p-3">{getTypeRecetteLabel(Number(row.typeRecetteId))}</td>
                <td className="p-3 text-right font-semibold">{formatCurrency(Number(row.montantCumule ?? 0))}</td>
                <td className="p-3 text-center">{Number(row.nombreFlux ?? 0)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold divide-x divide-gray-200 border-t-2 border-gray-300">
              <td colSpan={5} className="p-3 uppercase text-[10px] tracking-wide text-gray-700">
                Total général des flux hors budget
              </td>
              <td className="p-3 text-right text-gray-900">{formatCurrency(totalMontant)}</td>
              <td className="p-3 text-center text-gray-900">{totalTransactions}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
