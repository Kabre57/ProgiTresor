'use client';

import { useMemo, useState } from 'react';
import { Banknote, Plus, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
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
} from '@/lib/hooks/useOperationsQueries';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { formatDate } from '@/lib/utils/format';
import type { LigneBudgetaire, LotTraitement } from '@/types/compta-budget.types';

const currentYear = new Date().getFullYear();

export default function LotsTraitementPage() {
  const toast = useToast();
  const { hasAccess } = usePermissions();
  const user = useAuthStore((state) => state.user);
  const actor = user?.username ?? user?.email ?? undefined;
  const lotsQuery = useLotsTraitement();
  const lignesQuery = useLignesBudgetaires();
  const traiterLot = useTraiterLot();
  const transmettreLot = useTransmettreLotBudget();
  const saveLigne = useSaveLigneBudgetaire();
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

  const lots = lotsQuery.data ?? [];
  const lignes = lignesQuery.data ?? [];
  const pendingLots = lots.filter((lot) => lot.statut === 'EN_ATTENTE').length;
  const totalTransmis = useMemo(
    () =>
      lots
        .filter((lot) => lot.statut === 'TRANSMIS_BUDGET')
        .reduce((sum, lot) => sum + toAmount(lot.montantTotal), 0),
    [lots],
  );

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
      toast.success(`Le lot ${lot.reference} a été transmis au Budget.`);
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

  const lotColumns: DataTableColumn<LotTraitement>[] = [
    { key: 'reference', header: 'Lot', render: (row) => row.reference },
    { key: 'bordereau', header: 'Bordereau', render: (row) => row.bordereau?.reference ?? row.bordereauId },
    { key: 'dateCreation', header: 'Créé le', render: (row) => formatDate(row.dateCreation) },
    { key: 'statut', header: 'Statut', render: (row) => <WorkflowStatus status={row.statut} /> },
    { key: 'nombreEcritures', header: 'Écritures', render: (row) => row.nombreEcritures },
    { key: 'montantTotal', header: 'Montant', render: (row) => formatAmount(row.montantTotal) },
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
            icon={<Banknote className="h-4 w-4" />}
            onClick={() => setProcessingLot(row)}
          >
            Traiter
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={!hasAccess('BUDGET', 3) || row.statut !== 'TRAITE'}
            icon={<Send className="h-4 w-4" />}
            loading={transmettreLot.isPending}
            onClick={() => submitTransmission(row)}
          >
            Transmettre
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
        title="Lots de traitement"
        description="Traitement par vagues des écritures hors budget avant transmission au Budget."
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => lotsQuery.refetch()}>
              Actualiser
            </Button>
            <Button type="button" variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setLineModalOpen(true)}>
              Ligne budgétaire
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Lots" value={lots.length} />
        <MetricTile label="En attente" value={pendingLots} />
        <MetricTile label="Transmis au Budget" value={formatAmount(totalTransmis)} />
      </div>

      <Card>
        <CardContent>
          <DataTable<LotTraitement>
            data={lots}
            columns={lotColumns}
            loading={lotsQuery.isLoading || lotsQuery.isFetching}
            getRowKey={(row) => row.id}
            emptyLabel="Aucun lot de traitement."
          />
        </CardContent>
      </Card>

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
