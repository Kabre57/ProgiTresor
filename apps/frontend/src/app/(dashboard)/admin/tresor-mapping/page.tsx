'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Edit, Trash2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { PiPlusDuotone } from 'react-icons/pi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import {
  useReferential,
  useCreateReferential,
  useUpdateReferential,
  useDeleteReferential,
} from '@/lib/hooks/useEtudiantQueries';
import { getErrorMessage } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/format';
import type { NomenclatureProduit } from '@/types/etudiant.types';
import { TestMappingSection } from '@/components/tresor-mapping/TestMappingSection';

export default function TresorMappingPage() {
  const toast = useToast();
  
  // Referential Queries
  const nomenclaturesQuery = useReferential('nomenclatures');
  const typeRecettesQuery = useReferential('types-recettes');
  // Mutations
  const createMutation = useCreateReferential('nomenclatures');
  const updateMutation = useUpdateReferential('nomenclatures');
  const deleteMutation = useDeleteReferential('nomenclatures');

  // Local state
  const [searchTerm, setSearchTerm] = useState('');


  // Filtered Mappings List
  const filteredData = useMemo(() => {
    const list = nomenclaturesQuery.data ?? [];
    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase();
    return list.filter(
      (n) =>
        n.libelle?.toLowerCase().includes(term) ||
        n.codeProduit?.toLowerCase().includes(term) ||
        n.typeRecette?.libelle?.toLowerCase().includes(term)
    );
  }, [nomenclaturesQuery.data, searchTerm]);

  // Open Form Modal
  const handleOpenAdd = () => {
    setEditingNomenclature(null);
    setForm({
      codeProduit: '',
      libelle: '',
      regexPattern: '',
      typeRecetteId: '',
      montant: 0,
      actif: true,
    });
    setIsOpenModal(true);
  };

  const handleOpenEdit = (row: NomenclatureProduit) => {
    setEditingNomenclature(row);
    setForm({
      codeProduit: row.codeProduit ?? '',
      libelle: row.libelle ?? '',
      regexPattern: row.regexPattern ?? '',
      typeRecetteId: row.typeRecetteId ?? '',
      montant: row.montant ?? 0,
      actif: row.actif ?? true,
    });
    setIsOpenModal(true);
  };

  // Modal CRUD State
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingNomenclature, setEditingNomenclature] = useState<NomenclatureProduit | null>(null);
  
  // Form Fields State
  const [form, setForm] = useState({
    codeProduit: '',
    libelle: '',
    regexPattern: '',
    typeRecetteId: '' as string | number,
    montant: 0 as string | number,
    actif: true,
  });

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleOpenDelete = (id: number) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  // Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const computedCode = form.codeProduit.trim() || form.libelle.trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .toUpperCase();

    if (!form.libelle.trim() || !form.typeRecetteId) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const payload = {
      codeProduit: computedCode,
      libelle: form.libelle.trim(),
      regexPattern: form.regexPattern.trim() || null,
      typeRecetteId: Number(form.typeRecetteId),
      montant: form.montant === '' ? 0 : Number(form.montant),
      actif: form.actif,
    };

    try {
      if (editingNomenclature) {
        await updateMutation.mutateAsync({
          id: editingNomenclature.id,
          payload,
        });
        toast.success('Correspondance mise à jour avec succès.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Correspondance créée avec succès.');
      }
      setIsOpenModal(false);
      nomenclaturesQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de la sauvegarde');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success('Correspondance supprimée avec succès.');
      setIsDeleteModalOpen(false);
      nomenclaturesQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de la suppression');
    }
  };

  const typeRecetteOptions = (typeRecettesQuery.data ?? []).map((item) => ({
    value: String(item.id),
    label: `${item.code} - ${item.libelle}`,
  }));





  const columns = [
    {
      key: 'libelle',
      header: 'Libellé',
      render: (row: NomenclatureProduit) => <span className="font-semibold text-slate-800 dark:text-slate-200">{row.libelle}</span>,
    },
    {
      key: 'typeRecette',
      header: 'Type recette',
      render: (row: NomenclatureProduit) => row.typeRecette?.libelle || row.typeRecetteId,
    },
    {
      key: 'regexPattern',
      header: 'Regex',
      render: (row: NomenclatureProduit) => row.regexPattern ? (
        <code className="text-xs text-slate-600 dark:text-slate-300">{row.regexPattern}</code>
      ) : '-',
    },
    {
      key: 'montant',
      header: 'Montant',
      render: (row: NomenclatureProduit) => formatCurrency(row.montant),
    },
    {
      key: 'actif',
      header: 'Statut',
      render: (row: NomenclatureProduit) => (
        <Badge tone={row.actif ? 'success' : 'danger'}>{row.actif ? 'Actif' : 'Inactif'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: NomenclatureProduit) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-500 hover:text-[var(--primary)] hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => handleOpenEdit(row)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => handleOpenDelete(row.id)}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Correspondance des libellés Trésor Pay"
        description="Associez les libellés de paiements bruts provenant de la plateforme Trésor Pay avec les nomenclatures de produits internes."
        actions={
          <Button 
            variant="solid"
            onClick={handleOpenAdd}
            icon={<PiPlusDuotone className="text-xl" />}
          >
            Créer une correspondance
          </Button>
        }
      />

      {/* Test Section */}
      <TestMappingSection nomenclatures={nomenclaturesQuery.data ?? []} />

      {/* Main mapping table */}
      <Card>
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Liste des correspondances</CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher une correspondance..."
              className="h-9 w-full rounded-xl border border-gray-200 bg-slate-50 pl-9 pr-4 text-xs outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-1 focus:ring-[var(--primary)] dark:border-gray-700 dark:bg-gray-900 dark:focus:bg-gray-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable<NomenclatureProduit>
            data={filteredData}
            loading={nomenclaturesQuery.isLoading}
            getRowKey={(row) => String(row.id)}
            columns={columns}
            emptyLabel="Aucune correspondance enregistrée"
          />
        </CardContent>
      </Card>

      {/* Form Modal */}
      <Modal
        open={isOpenModal}
        onClose={() => setIsOpenModal(false)}
        title={editingNomenclature ? 'Modifier la correspondance' : 'Créer une correspondance'}
        width={600}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Libellé (Obligatoire)"
              placeholder="Ex: Scolarité L1"
              value={form.libelle}
              onChange={(e) => setForm((prev) => ({ ...prev, libelle: e.target.value }))}
              required
            />
          </div>

          <Input
            label="Regex de reconnaissance"
            placeholder="Ex: .*SCOLARITE.*L1.*VERS(?:EMENT)?\\s*1.*"
            value={form.regexPattern}
            onChange={(e) => setForm((prev) => ({ ...prev, regexPattern: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type de recette (Obligatoire)"
              placeholder="Sélectionner..."
              options={typeRecetteOptions}
              value={String(form.typeRecetteId)}
              onChange={(e) => setForm((prev) => ({ ...prev, typeRecetteId: e.target.value }))}
              required
            />
          </div>

          <Input
            label="Montant annuel (FCFA)"
            type="number"
            placeholder="Ex: 250000"
            value={form.montant}
            onChange={(e) => setForm((prev) => ({ ...prev, montant: e.target.value }))}
            required
          />

          <div className="flex items-center space-x-2 pt-2">
            <input
              id="actif"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
              checked={form.actif}
              onChange={(e) => setForm((prev) => ({ ...prev, actif: e.target.checked }))}
            />
            <label htmlFor="actif" className="text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none">
              Mapping actif (utilisé lors des prochains imports)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={() => setIsOpenModal(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer la correspondance"
        width={450}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-650 dark:text-slate-350">
            Êtes-vous sûr de vouloir supprimer cette correspondance ? Les transactions déjà importées ne seront pas modifiées, mais les prochains imports contenant ce libellé brut ne seront plus automatiquement mappés.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} loading={deleteMutation.isPending}>
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
