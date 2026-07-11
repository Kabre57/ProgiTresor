'use client';

import { useMemo, useState } from 'react';
import { Banknote, Download, Plus, RefreshCw, Send, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import {
  MetricTile,
  WorkflowStatus,
  formatAmount,
  toAmount,
} from '@/components/compta-budget/WorkflowUi';
import { getErrorMessage } from '@/lib/api/client';
import {
  useLignesBudgetaires,
  useLotsTraitement,
  useSaveLigneBudgetaire,
  useTraiterLot,
  useTransmettreLotBudget,
  usePendingEcritures,
  useCreateLotTraitement,
} from '@/lib/hooks/useOperationsQueries';
import { useReferential } from '@/lib/hooks/useEtudiantQueries';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { LigneBudgetaire, LotTraitement, EcritureBudgetaire } from '@/types/compta-budget.types';

const currentYear = new Date().getFullYear();

type OptionType = {
  id: number;
  code?: string;
  libelle?: string;
  nom?: string;
};

export default function LotsTraitementPage() {
  const toast = useToast();
  const { hasAccess } = usePermissions();
  const user = useAuthStore((state) => state.user);
  const actor = user?.username ?? user?.email ?? undefined;

  const [activeTab, setActiveTab] = useState<'pending_ecritures' | 'lots' | 'lignes'>('pending_ecritures');

  // Filters for Pending Writes (Tab 1)
  const [pendingFilters, setPendingFilters] = useState({
    antenneId: undefined as number | undefined,
    typeRecetteId: undefined as number | undefined,
    dateDebut: '',
    dateFin: '',
  });

  // Filters for Lots (Tab 2)
  const [lotFilters, setLotFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    codeOt: '',
    statut: '',
    dateDebut: '',
    dateFin: '',
  });

  // Queries
  const pendingEcrituresQuery = usePendingEcritures({
    antenneId: pendingFilters.antenneId,
    typeRecetteId: pendingFilters.typeRecetteId,
    dateDebut: pendingFilters.dateDebut || undefined,
    dateFin: pendingFilters.dateFin || undefined,
  });
  const lotsQuery = useLotsTraitement(lotFilters);
  const lignesQuery = useLignesBudgetaires();
  const createLot = useCreateLotTraitement();
  const traiterLot = useTraiterLot();
  const transmettreLot = useTransmettreLotBudget();
  const saveLigne = useSaveLigneBudgetaire();

  const antennasQuery = useReferential('antennes');
  const typesRecettesQuery = useReferential('types-recettes');

  // Modal / Selection states
  const [selectedEcritureIds, setSelectedEcritureIds] = useState<Set<number>>(new Set());
  const [lotModalOpen, setLotModalOpen] = useState(false);
  const [lotReference, setLotReference] = useState('');
  const [lotRemarques, setLotRemarques] = useState('');

  const [processingLot, setProcessingLot] = useState<LotTraitement | null>(null);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [ligneId, setLigneId] = useState('');
  const [remarques, setRemarques] = useState('');
  const [lineForm, setLineForm] = useState({
    code: '',
    libelle: '',
    anneeBudgetaire: currentYear,
    montantAlloue: 0,
  });

  const pendingEcritures = pendingEcrituresQuery.data ?? [];
  const lots = lotsQuery.data?.items ?? [];
  const lignes = lignesQuery.data ?? [];
  const pendingLotsCount = lots.filter((lot) => lot.statut === 'EN_ATTENTE').length;

  const totalTransmis = useMemo(
    () =>
      lots
        .filter((lot) => lot.statut === 'TRANSMIS_BUDGET')
        .reduce((sum, lot) => sum + toAmount(lot.montantTotal), 0),
    [lots],
  );

  const selectedTotalAmount = useMemo(() => {
    return pendingEcritures
      .filter((e) => selectedEcritureIds.has(e.id))
      .reduce((sum, e) => sum + Number(e.montant), 0);
  }, [pendingEcritures, selectedEcritureIds]);

  const antennaOptions = useMemo(
    () => [
      { value: '', label: 'Toutes les antennes' },
      ...((antennasQuery.data ?? []) as OptionType[]).map((item) => ({
        value: String(item.id),
        label: item.nom || item.libelle || item.code || `Antenne #${item.id}`,
      })),
    ],
    [antennasQuery.data],
  );

  const typeRecetteOptions = useMemo(
    () => [
      { value: '', label: 'Tous les types' },
      ...((typesRecettesQuery.data ?? []) as OptionType[]).map((item) => ({
        value: String(item.id),
        label: item.libelle || item.code || `Recette #${item.id}`,
      })),
    ],
    [typesRecettesQuery.data],
  );

  // Handlers
  const handleCreateLotSubmit = async () => {
    if (selectedEcritureIds.size === 0) return;
    try {
      await createLot.mutateAsync({
        reference: lotReference || undefined,
        remarques: lotRemarques || undefined,
        ecritureIds: Array.from(selectedEcritureIds),
      });
      toast.success('Bordereau (Lot) créé avec succès.');
      setSelectedEcritureIds(new Set());
      setLotReference('');
      setLotRemarques('');
      setLotModalOpen(false);
      setActiveTab('lots');
    } catch (error) {
      toast.error(getErrorMessage(error), 'Création du Bordereau impossible');
    }
  };

  const submitTraitement = async () => {
    if (!processingLot || !ligneId) return;
    try {
      await traiterLot.mutateAsync({
        id: processingLot.id,
        payload: {
          ligneBudgetaireId: Number(ligneId),
          utilisateurTraitement: actor,
          remarques: remarques || undefined,
        },
      });
      toast.success('Lot traité et imputé.');
      setProcessingLot(null);
      setLigneId('');
      setRemarques('');
    } catch (error) {
      toast.error(getErrorMessage(error), 'Traitement impossible');
    }
  };

  const submitTransmission = async (lot: LotTraitement) => {
    try {
      await transmettreLot.mutateAsync({ id: lot.id, utilisateurTransmission: actor });
      toast.success(`Le Bordereau ${lot.reference} a été transmis au Budget.`);
    } catch (error) {
      toast.error(getErrorMessage(error), 'Transmission impossible');
    }
  };

  const submitLigne = async () => {
    try {
      await saveLigne.mutateAsync(lineForm);
      toast.success('Ligne budgétaire enregistrée.');
      setLineModalOpen(false);
      setLineForm({ code: '', libelle: '', anneeBudgetaire: currentYear, montantAlloue: 0 });
    } catch (error) {
      toast.error(getErrorMessage(error), 'Enregistrement impossible');
    }
  };

  const exportLots = (format: 'csv' | 'pdf') => {
    const rows = lots.map((lot) => [lot.reference, lot.statut, lot.nombreEcritures, formatAmount(lot.montantTotal)]);
    if (format === 'csv') {
      const csv = [['Bordereau / Lot', 'Statut', 'Ecritures', 'Montant'], ...rows].map((row) => row.join(';')).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `lots_traitement_${Date.now()}.csv`; link.click(); URL.revokeObjectURL(url);
      return;
    }
    const html = `<table><thead><tr><th>Bordereau / Lot</th><th>Statut</th><th>Ecritures</th><th>Montant</th></tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`<html><head><title>Bordereaux de paiement</title></head><body>${html}</body></html>`);
    printWindow?.document.close(); printWindow?.print();
  };

  // Columns definitions
  const ecritureColumns: DataTableColumn<EcritureBudgetaire>[] = [
    {
      key: 'selected',
      header: '',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedEcritureIds.has(row.id)}
          onChange={(e) => {
            const copy = new Set(selectedEcritureIds);
            if (e.target.checked) {
              copy.add(row.id);
            } else {
              copy.delete(row.id);
            }
            setSelectedEcritureIds(copy);
          }}
          className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
        />
      ),
    },
    { key: 'codeOt', header: 'Code OT', render: (row) => row.codeOt },
    { key: 'dateFlux', header: 'Date flux', render: (row) => formatDate(row.dateFlux) },
    { key: 'produitLibelleBrut', header: 'Produit', render: (row) => row.produitLibelleBrut },
    { key: 'typeRecetteLibelle', header: 'Recette', render: (row) => row.typeRecetteLibelle ?? '-' },
    { key: 'montant', header: 'Montant', render: (row) => formatAmount(row.montant) },
    { key: 'statut', header: 'Statut', render: (row) => <WorkflowStatus status={row.statut} /> },
  ];

  const lotColumns: DataTableColumn<LotTraitement>[] = [
    { key: 'reference', header: 'Bordereau / Lot', render: (row) => row.reference },
    { key: 'dateCreation', header: 'Créé le', render: (row) => formatDate(row.dateCreation) },
    { key: 'statut', header: 'Statut', render: (row) => <WorkflowStatus status={row.statut} /> },
    { key: 'nombreEcritures', header: 'Écritures', render: (row) => row.nombreEcritures },
    { key: 'montantTotal', header: 'Montant', render: (row) => formatAmount(row.montantTotal) },
    {
      key: 'remarques',
      header: 'Motif / Remarques',
      render: (row) => <span className="text-slate-500 text-sm max-w-xs truncate block">{row.remarques ?? '-'}</span>
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!hasAccess('BUDGET', 3) || row.statut !== 'EN_ATTENTE'}
            onClick={() => setProcessingLot(row)}
          >
            Traiter / Imputer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={!hasAccess('BUDGET', 3) || row.statut !== 'TRAITE'}
            loading={transmettreLot.isPending}
            onClick={() => submitTransmission(row)}
          >
            Transmettre OP
          </Button>
        </div>
      ),
    },
  ];

  const ligneColumns: DataTableColumn<LigneBudgetaire>[] = [
    { key: 'code', header: 'Code', render: (row) => row.code },
    { key: 'libelle', header: 'Libellé', render: (row) => row.libelle },
    { key: 'anneeBudgetaire', header: 'Année', render: (row) => row.anneeBudgetaire },
    { key: 'montantAlloue', header: 'Alloué', render: (row) => formatAmount(row.montantAlloue) },
    { key: 'montantUtilise', header: 'Utilisé', render: (row) => formatAmount(row.montantUtilise) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion Budgétaire"
        description="Filtrez et regroupez les écritures d'OT en Bordereaux (lots), effectuez les imputations et transmettez-les au Budget."
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => exportLots('csv')}>CSV</Button>
            <Button type="button" variant="secondary" onClick={() => exportLots('pdf')}>PDF</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                pendingEcrituresQuery.refetch();
                lotsQuery.refetch();
                lignesQuery.refetch();
              }}
            >
              Actualiser
            </Button>
            <Button type="button" variant="primary" onClick={() => setLineModalOpen(true)}>
              Nouvelle ligne budgétaire
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Écritures en attente" value={pendingEcritures.length} />
        <MetricTile label="Bordereaux (Lots) en attente" value={pendingLotsCount} />
        <MetricTile label="Transmis au Budget (OP)" value={formatAmount(totalTransmis)} />
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('pending_ecritures')}
          className={cn(
            "pb-4 px-6 text-sm font-semibold border-b-2 transition-colors",
            activeTab === 'pending_ecritures'
              ? "border-[var(--primary)] text-[var(--primary)] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          Écritures reçues (OT)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lots')}
          className={cn(
            "pb-4 px-6 text-sm font-semibold border-b-2 transition-colors",
            activeTab === 'lots'
              ? "border-[var(--primary)] text-[var(--primary)] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          Bordereaux / Lots générés
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lignes')}
          className={cn(
            "pb-4 px-6 text-sm font-semibold border-b-2 transition-colors",
            activeTab === 'lignes'
              ? "border-[var(--primary)] text-[var(--primary)] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          Lignes budgétaires
        </button>
      </div>

      {/* Tab content 1: Pending Writes Selection */}
      {activeTab === 'pending_ecritures' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filtres de recherche d'écritures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Select
                  label="Antenne"
                  options={antennaOptions}
                  value={pendingFilters.antenneId ? String(pendingFilters.antenneId) : ''}
                  onChange={(event) =>
                    setPendingFilters((prev) => ({
                      ...prev,
                      antenneId: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  searchable
                />
                <Select
                  label="Type de recette"
                  options={typeRecetteOptions}
                  value={pendingFilters.typeRecetteId ? String(pendingFilters.typeRecetteId) : ''}
                  onChange={(event) =>
                    setPendingFilters((prev) => ({
                      ...prev,
                      typeRecetteId: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  searchable
                />
                <Input
                  type="date"
                  label="Date début"
                  value={pendingFilters.dateDebut}
                  onChange={(event) =>
                    setPendingFilters((prev) => ({ ...prev, dateDebut: event.target.value }))
                  }
                />
                <Input
                  type="date"
                  label="Date fin"
                  value={pendingFilters.dateFin}
                  onChange={(event) =>
                    setPendingFilters((prev) => ({ ...prev, dateFin: event.target.value }))
                  }
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setPendingFilters({
                      antenneId: undefined,
                      typeRecetteId: undefined,
                      dateDebut: '',
                      dateFin: '',
                    })
                  }
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Liste des écritures d'OT reçues en attente</CardTitle>
                <div className="flex items-center gap-4 text-sm font-semibold col-span-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="select-all-pending"
                      checked={pendingEcritures.length > 0 && selectedEcritureIds.size === pendingEcritures.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEcritureIds(new Set(pendingEcritures.map(e => e.id)));
                        } else {
                          setSelectedEcritureIds(new Set());
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <label htmlFor="select-all-pending" className="select-none cursor-pointer">
                      Tout sélectionner ({pendingEcritures.length})
                    </label>
                  </div>
                  <span className="text-slate-500">|</span>
                  <span className="text-amber-600">Sélectionné : {selectedEcritureIds.size}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-900 dark:text-white">Montant cumulé : {formatCurrency(selectedTotalAmount)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataTable<EcritureBudgetaire>
                data={pendingEcritures}
                columns={ecritureColumns}
                loading={pendingEcrituresQuery.isLoading || pendingEcrituresQuery.isFetching}
                getRowKey={(row) => row.id}
                emptyLabel="Aucune écriture d'OT en attente de traitement."
              />
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={selectedEcritureIds.size === 0}
                  onClick={() => setLotModalOpen(true)}
                >
                  Regrouper et créer le Bordereau (Lot)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab content 2: Lots generated */}
      {activeTab === 'lots' && (
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-6">
                <Input placeholder="Recherche" value={lotFilters.search} onChange={(event) => setLotFilters((f) => ({ ...f, search: event.target.value, page: 1 }))} />
                <Input placeholder="Code OT" value={lotFilters.codeOt} onChange={(event) => setLotFilters((f) => ({ ...f, codeOt: event.target.value, page: 1 }))} />
                <Input type="date" value={lotFilters.dateDebut} onChange={(event) => setLotFilters((f) => ({ ...f, dateDebut: event.target.value, page: 1 }))} />
                <Input type="date" value={lotFilters.dateFin} onChange={(event) => setLotFilters((f) => ({ ...f, dateFin: event.target.value, page: 1 }))} />
                <select value={lotFilters.statut} onChange={(event) => setLotFilters((f) => ({ ...f, statut: event.target.value, page: 1 }))} className="input input-md h-11">
                  <option value="">Tous les statuts</option>
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="TRAITE">Traité / Imputé</option>
                  <option value="TRANSMIS_BUDGET">Transmis au Budget</option>
                </select>
                <Button type="button" variant="secondary" onClick={() => setLotFilters({ page: 1, limit: 20, search: '', codeOt: '', statut: '', dateDebut: '', dateFin: '' })}>Réinitialiser</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <DataTable<LotTraitement>
                data={lots}
                columns={lotColumns}
                loading={lotsQuery.isLoading || lotsQuery.isFetching}
                getRowKey={(row) => row.id}
                emptyLabel="Aucun Bordereau / Lot de traitement généré."
                pagination={{
                  currentPage: lotFilters.page,
                  totalCount: lotsQuery.data?.total ?? 0,
                  pageSize: lotFilters.limit,
                  onPageChange: (page) => setLotFilters((f) => ({ ...f, page })),
                  onPageSizeChange: (limit) => setLotFilters((f) => ({ ...f, limit, page: 1 })),
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab content 3: Budget Lines */}
      {activeTab === 'lignes' && (
        <Card>
          <CardContent>
            <DataTable<LigneBudgetaire>
              data={lignes}
              columns={ligneColumns}
              loading={lignesQuery.isLoading}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune ligne budgétaire configurée."
            />
          </CardContent>
        </Card>
      )}

      {/* Dialog for Custom Lot / Bordereau Creation */}
      <Dialog isOpen={lotModalOpen} onClose={() => setLotModalOpen(false)} width={560}>
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">Créer un Bordereau (Lot)</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Regrouper les {selectedEcritureIds.size} écritures sélectionnées. Le montant total du Bordereau sera de {formatCurrency(selectedTotalAmount)}.
            </p>
          </div>
          <Input
            label="Référence / Titre du Bordereau"
            placeholder="Référence automatique si vide"
            value={lotReference}
            onChange={(event) => setLotReference(event.target.value)}
          />
          <Textarea
            label="Motif / Remarques"
            rows={3}
            value={lotRemarques}
            onChange={(event) => setLotRemarques(event.target.value)}
            placeholder="Saisissez le motif ou les remarques pour ce Bordereau..."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLotModalOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={createLot.isPending}
              onClick={handleCreateLotSubmit}
            >
              Valider et créer le Bordereau
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog for Imputing Budget Line to Lot */}
      <Dialog isOpen={Boolean(processingLot)} onClose={() => setProcessingLot(null)} width={560}>
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">Traiter le lot</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choisissez la ligne budgétaire d’imputation pour {processingLot?.reference}.
            </p>
          </div>
          <select value={ligneId} onChange={(event) => setLigneId(event.target.value)} className="input input-md h-11 w-full">
            <option value="">Sélectionner une ligne budgétaire</option>
            {lignes.map((ligne) => (
              <option key={ligne.id} value={ligne.id}>
                {ligne.code} - {ligne.libelle}
              </option>
            ))}
          </select>
          <Textarea
            rows={3}
            value={remarques}
            onChange={(event) => setRemarques(event.target.value)}
            placeholder="Remarques de traitement"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setProcessingLot(null)}>
              Annuler
            </Button>
            <Button type="button" variant="primary" loading={traiterLot.isPending} disabled={!ligneId} onClick={submitTraitement}>
              Traiter et imputer
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog for Creating New Budget Line */}
      <Dialog isOpen={lineModalOpen} onClose={() => setLineModalOpen(false)} width={560}>
        <div className="space-y-5">
          <h3 className="text-base font-semibold text-slate-950 dark:text-white">Ligne budgétaire hors budget</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Code" value={lineForm.code} onChange={(event) => setLineForm((form) => ({ ...form, code: event.target.value }))} />
            <Input placeholder="Libellé" value={lineForm.libelle} onChange={(event) => setLineForm((form) => ({ ...form, libelle: event.target.value }))} />
            <Input type="number" value={lineForm.anneeBudgetaire} onChange={(event) => setLineForm((form) => ({ ...form, anneeBudgetaire: Number(event.target.value) }))} />
            <Input type="number" value={lineForm.montantAlloue} onChange={(event) => setLineForm((form) => ({ ...form, montantAlloue: Number(event.target.value) }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLineModalOpen(false)}>
              Annuler
            </Button>
            <Button type="button" variant="primary" loading={saveLigne.isPending} onClick={submitLigne}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
