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
} from '@/lib/hooks/useStudentQueries';
import { getErrorMessage } from '@/lib/api/client';
import type { NomenclatureProduit } from '@/types/student.types';

export default function TresorMappingPage() {
  const toast = useToast();
  
  // Referential Queries
  const nomenclaturesQuery = useReferential('nomenclatures');
  const typeRecettesQuery = useReferential('types-recettes');
  const filieresQuery = useReferential('filieres');
  const statutsQuery = useReferential('statuts-etudiants');

  // Mutations
  const createMutation = useCreateReferential('nomenclatures');
  const updateMutation = useUpdateReferential('nomenclatures');
  const deleteMutation = useDeleteReferential('nomenclatures');

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [testLabel, setTestLabel] = useState('');
  const [testResult, setTestResult] = useState<any | null>(null);

  // Modal CRUD State
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingNomenclature, setEditingNomenclature] = useState<NomenclatureProduit | null>(null);
  
  // Form Fields State
  const [form, setForm] = useState({
    libelleBrut: '',
    codeProduit: '',
    libelleStandard: '',
    typeRecetteId: '' as string | number,
    filiereId: '' as string | number,
    statutId: '' as string | number,
    numVersement: '' as string | number,
    actif: true,
  });

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Test Mapping Logic
  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testLabel.trim()) {
      setTestResult(null);
      return;
    }

    const term = testLabel.trim().toUpperCase();
    const list = nomenclaturesQuery.data ?? [];
    
    // Test match logic: matches libelleBrut or libelleStandard case-insensitively
    const match = list.find(
      (n) =>
        n.libelleBrut?.toUpperCase() === term ||
        n.libelleStandard?.toUpperCase() === term
    );

    if (match) {
      setTestResult({
        found: true,
        match,
      });
    } else {
      setTestResult({
        found: false,
      });
    }
  };

  // Filtered Mappings List
  const filteredData = useMemo(() => {
    const list = nomenclaturesQuery.data ?? [];
    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase();
    return list.filter(
      (n) =>
        n.libelleBrut?.toLowerCase().includes(term) ||
        n.libelleStandard?.toLowerCase().includes(term) ||
        n.codeProduit?.toLowerCase().includes(term) ||
        n.typeRecette?.libelle?.toLowerCase().includes(term)
    );
  }, [nomenclaturesQuery.data, searchTerm]);

  // Open Form Modal
  const handleOpenAdd = () => {
    setEditingNomenclature(null);
    setForm({
      libelleBrut: '',
      codeProduit: '',
      libelleStandard: '',
      typeRecetteId: '',
      filiereId: '',
      statutId: '',
      numVersement: '',
      actif: true,
    });
    setIsOpenModal(true);
  };

  const handleOpenEdit = (row: NomenclatureProduit) => {
    setEditingNomenclature(row);
    setForm({
      libelleBrut: row.libelleBrut ?? '',
      codeProduit: row.codeProduit ?? '',
      libelleStandard: row.libelleStandard ?? '',
      typeRecetteId: row.typeRecetteId ?? '',
      filiereId: row.filiereId ?? '',
      statutId: row.statutId ?? '',
      numVersement: row.numVersement ?? '',
      actif: row.actif ?? true,
    });
    setIsOpenModal(true);
  };

  const handleOpenDelete = (id: number) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  // Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.libelleBrut.trim() || !form.codeProduit.trim() || !form.libelleStandard.trim() || !form.typeRecetteId) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const payload: Record<string, any> = {
      libelleBrut: form.libelleBrut.trim(),
      codeProduit: form.codeProduit.trim(),
      libelleStandard: form.libelleStandard.trim(),
      typeRecetteId: Number(form.typeRecetteId),
      filiereId: form.filiereId ? Number(form.filiereId) : null,
      statutId: form.statutId ? Number(form.statutId) : null,
      numVersement: form.numVersement ? Number(form.numVersement) : null,
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

  const filiereOptions = (filieresQuery.data ?? []).map((item) => ({
    value: String(item.id),
    label: `${item.code} - ${item.libelle}`,
  }));

  const statutOptions = (statutsQuery.data ?? []).map((item) => ({
    value: String(item.id),
    label: `${item.code} - ${item.libelle}`,
  }));

  const columns = [
    {
      key: 'codeProduit',
      header: 'Code produit',
      render: (row: NomenclatureProduit) => <Badge tone="info">{row.codeProduit}</Badge>,
    },
    {
      key: 'libelleBrut',
      header: 'Libellé brut (Trésor Pay)',
      render: (row: NomenclatureProduit) => <span className="font-semibold text-slate-800 dark:text-slate-200">{row.libelleBrut}</span>,
    },
    {
      key: 'libelleStandard',
      header: 'Libellé standard',
      render: (row: NomenclatureProduit) => row.libelleStandard,
    },
    {
      key: 'typeRecette',
      header: 'Type recette',
      render: (row: NomenclatureProduit) => row.typeRecette?.libelle || row.typeRecetteId,
    },
    {
      key: 'filiere',
      header: 'Filières',
      render: (row: NomenclatureProduit) => row.filiere?.libelle ?? '-',
    },
    {
      key: 'statut',
      header: 'Statut Étudiant',
      render: (row: NomenclatureProduit) => row.statut?.libelle ?? '-',
    },
    {
      key: 'numVersement',
      header: 'Versement',
      render: (row: NomenclatureProduit) => row.numVersement ? `N°${row.numVersement}` : '-',
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HelpCircle className="h-4.5 w-4.5 text-[var(--primary)]" />
            Tester le mapping en direct
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTest} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Input
                label="Libellé brut à tester"
                placeholder="Ex: 1ER VERSEMENT FRAIS DE SCOLARITE"
                value={testLabel}
                onChange={(e) => setTestLabel(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full md:w-auto h-10">
              Analyser le libellé
            </Button>
          </form>

          {testResult && (
            <div className="mt-4 p-4 rounded-xl border transition-all duration-300">
              {testResult.found ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold text-sm">Correspondance trouvée avec succès !</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="block text-slate-400">Code produit</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{testResult.match.codeProduit}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Libellé standard</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{testResult.match.libelleStandard}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Type de recette</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {testResult.match.typeRecette?.libelle || 'Non spécifié'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Versement rattaché</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {testResult.match.numVersement ? `N°${testResult.match.numVersement}` : 'Aucun'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 p-1">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Aucune correspondance existante.</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ce libellé sera importé sans être lié à un produit et nécessitera une affectation manuelle.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
          <Input
            label="Libellé brut Trésor Pay (Obligatoire)"
            placeholder="Ex: 1ER VERSEMENT FRAIS DE SCOLARITE"
            value={form.libelleBrut}
            onChange={(e) => setForm((prev) => ({ ...prev, libelleBrut: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code produit (Obligatoire)"
              placeholder="Ex: SCOL1"
              value={form.codeProduit}
              onChange={(e) => setForm((prev) => ({ ...prev, codeProduit: e.target.value }))}
              required
            />
            <Input
              label="Libellé standard (Obligatoire)"
              placeholder="Ex: Scolarité L1"
              value={form.libelleStandard}
              onChange={(e) => setForm((prev) => ({ ...prev, libelleStandard: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type de recette (Obligatoire)"
              placeholder="Sélectionner..."
              options={typeRecetteOptions}
              value={String(form.typeRecetteId)}
              onChange={(e) => setForm((prev) => ({ ...prev, typeRecetteId: e.target.value }))}
              required
            />
            <Select
              label="Filières"
              placeholder="Toutes les filières"
              options={filiereOptions}
              value={String(form.filiereId)}
              onChange={(e) => setForm((prev) => ({ ...prev, filiereId: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Statut Étudiant"
              placeholder="Tous les statuts"
              options={statutOptions}
              value={String(form.statutId)}
              onChange={(e) => setForm((prev) => ({ ...prev, statutId: e.target.value }))}
            />
            <Input
              label="N° Versement"
              type="number"
              placeholder="Ex: 1"
              value={form.numVersement}
              onChange={(e) => setForm((prev) => ({ ...prev, numVersement: e.target.value }))}
            />
          </div>

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
