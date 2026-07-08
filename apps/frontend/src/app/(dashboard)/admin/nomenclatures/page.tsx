'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import Tabs from '@/components/ui/Tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { 
  useReferential, 
  useDeleteReferential 
} from '@/lib/hooks/useEtudiantQueries';
import { formatCurrency } from '@/lib/utils/format';
import { PiPlusDuotone } from 'react-icons/pi';
import { TbUpload } from 'react-icons/tb';
import { Edit, Trash2 } from 'lucide-react';
import ReferentialImportDialog from '@/components/referentials/ReferentialImportDialog';
import NomenclatureModal from './NomenclatureModal';
import type { NomenclatureProduit } from '@/types/etudiant.types';

const { TabList, TabNav, TabContent } = Tabs;

export default function NomenclaturesPage() {
  const toast = useToast();
  
  // Queries & Mutations
  const nomenclaturesQuery = useReferential('nomenclatures');
  const deleteMutation = useDeleteReferential('nomenclatures');

  // Page States
  const [activeTab, setActiveTab] = useState('budget');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NomenclatureProduit | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<NomenclatureProduit | null>(null);

  // Pagination state
  const [budgetPage, setBudgetPage] = useState(1);
  const [horsBudgetPage, setHorsBudgetPage] = useState(1);
  const PAGE_SIZE = 10;

  // Filter nomenclatures into Budget and Hors Budget
  const budgetNomenclatures = useMemo(() => {
    return (nomenclaturesQuery.data ?? []).filter(
      (item) => item.typeRecette?.typeFlux?.code === 'BUDGET'
    );
  }, [nomenclaturesQuery.data]);

  const horsBudgetNomenclatures = useMemo(() => {
    return (nomenclaturesQuery.data ?? []).filter(
      (item) => item.typeRecette?.typeFlux?.code === 'HORS_BUDGET'
    );
  }, [nomenclaturesQuery.data]);

  // Paginated data subsets
  const paginatedBudget = useMemo(() => {
    return budgetNomenclatures.slice((budgetPage - 1) * PAGE_SIZE, budgetPage * PAGE_SIZE);
  }, [budgetNomenclatures, budgetPage]);

  const paginatedHorsBudget = useMemo(() => {
    return horsBudgetNomenclatures.slice((horsBudgetPage - 1) * PAGE_SIZE, horsBudgetPage * PAGE_SIZE);
  }, [horsBudgetNomenclatures, horsBudgetPage]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item: NomenclatureProduit) => {
    setEditing(item);
    setModalOpen(true);
  };

  const onDelete = (item: NomenclatureProduit) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
        toast.success('Nomenclature supprimée avec succès');
        nomenclaturesQuery.refetch();
      } finally {
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
      }
    }
  };

  const columns: DataTableColumn<NomenclatureProduit>[] = [
    { key: 'libelleBrut', header: 'Libellé Brut', render: (row) => row.libelleBrut },
    { key: 'libelleStandard', header: 'Standard', render: (row) => row.libelleStandard },
    { key: 'typeRecette', header: 'Recette', render: (row) => row.typeRecette?.libelle ?? row.typeRecetteId },
    { key: 'niveau', header: 'Niveau', render: (row) => row.niveau?.libelle ?? '-' },
    { key: 'filiere', header: 'Filière', render: (row) => row.niveau?.filiere?.libelle ?? '-' },
    { key: 'statut', header: 'Statut', render: (row) => row.statut?.libelle ?? 'Tous' },
    { key: 'montant', header: 'Montant', render: (row) => formatCurrency(row.montant) },
    { key: 'actif', header: 'Statut', render: (row) => <Badge tone={row.actif ? 'success' : 'danger'}>{row.actif ? 'Actif' : 'Inactif'}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Modifier">
            <Edit className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(row)} aria-label="Supprimer">
            <Trash2 className="h-4 w-4 text-[var(--error)]" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nomenclatures produits"
        description="Normalisation des libellés de recettes et produits comptables."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setImportDialogOpen(true)}
              icon={<TbUpload className="text-xl" />}
            >
              Importer
            </Button>
            <Button 
              variant="solid"
              type="button" 
              onClick={openCreate}
              icon={<PiPlusDuotone className="text-xl" />}
            >
              Ajouter
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabList>
          <TabNav value="budget">Flux Budget ({budgetNomenclatures.length})</TabNav>
          <TabNav value="hors_budget">Flux Hors Budget ({horsBudgetNomenclatures.length})</TabNav>
        </TabList>
        <div className="mt-4">
          <TabContent value="budget">
            <DataTable<NomenclatureProduit>
              data={paginatedBudget}
              loading={nomenclaturesQuery.isLoading}
              getRowKey={(row) => row.id}
              columns={columns}
              pagination={{
                currentPage: budgetPage,
                totalCount: budgetNomenclatures.length,
                pageSize: PAGE_SIZE,
                onPageChange: (p) => setBudgetPage(p),
              }}
            />
          </TabContent>
          <TabContent value="hors_budget">
            <DataTable<NomenclatureProduit>
              data={paginatedHorsBudget}
              loading={nomenclaturesQuery.isLoading}
              getRowKey={(row) => row.id}
              columns={columns}
              pagination={{
                currentPage: horsBudgetPage,
                totalCount: horsBudgetNomenclatures.length,
                pageSize: PAGE_SIZE,
                onPageChange: (p) => setHorsBudgetPage(p),
              }}
            />
          </TabContent>
        </div>
      </Tabs>

      <NomenclatureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSuccess={() => nomenclaturesQuery.refetch()}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        type="danger"
        title="Supprimer la nomenclature"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
      >
        Êtes-vous sûr de vouloir supprimer cette nomenclature ? Cette action est irréversible.
      </ConfirmDialog>

      <ReferentialImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImported={() => nomenclaturesQuery.refetch()}
        entity="nomenclatures"
        title="Nomenclatures produits"
      />
    </div>
  );
}
