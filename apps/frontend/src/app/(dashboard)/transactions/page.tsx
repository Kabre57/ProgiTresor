'use client';

import { Upload as UploadIcon, AlertCircle, CheckCircle2, RefreshCw, Search, X, Download, Edit, Trash2, Save } from 'lucide-react';
import { PiCloudArrowDownDuotone, PiUploadSimpleDuotone, PiXDuotone, PiMagnifyingGlassDuotone } from 'react-icons/pi';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import { Upload } from '@/components/ui/Upload';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { 
  useImportTransactions, 
  useTransactions, 
  useFetchFromTresor,
  useUpdateTransaction,
  useDeleteTransaction
} from '@/lib/hooks/useOperationsQueries';
import { useReferential, useEtudiants, usePromotions } from '@/lib/hooks/useEtudiantQueries';
import { transactionApi } from '@/lib/api/transactionApi';
import { formatCurrency, formatDate } from '@/lib/utils/format';

const parseCSV = (text: string): Record<string, any>[] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const headerLine = lines[0];
  const separator = headerLine.includes(';') ? ';' : ',';
  
  const headers = headerLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const result: Record<string, any>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length !== headers.length) continue;
    
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      const val = values[index];
      if (val !== '' && !Number.isNaN(Number(val))) {
        obj[header] = Number(val);
      } else {
        obj[header] = val;
      }
    });
    result.push(obj);
  }
  return result;
};

const parseXLSX = (buffer: ArrayBuffer): Record<string, any>[] => {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  // Prend la première feuille
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  // Convertit en tableau d'objets avec headers en première ligne
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  return jsonData;
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Sort State
  const [sortBy, setSortBy] = useState<string | null>('dateHeure');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('desc');

  // Filter States
  const initialFilters = {
    dateDebut: '',
    dateFin: '',
    etudiantMatricule: '',
    etudiantNom: '',
    libelleProduit: '',
    antenneId: [] as number[],
    filiereId: [] as number[],
    statutId: [] as number[],
    typeFluxId: [] as number[],
    typeRecetteId: [] as number[],
    nomenclatureId: [] as number[],
    promotion: '',
  };

  const [filters, setFilters] = useState({ ...initialFilters });
  const [activeFilters, setActiveFilters] = useState({ ...initialFilters });

  // Referential queries
  const antennesQuery = useReferential('antennes');
  const filieresQuery = useReferential('filieres');
  const statutsQuery = useReferential('statuts-etudiant');
  const typesFluxQuery = useReferential('types-flux');
  const typesRecettesQuery = useReferential('types-recettes');
  const nomenclaturesQuery = useReferential('nomenclatures');
  const etudiantListQuery = useEtudiants(); // for etudiant select in edit modal

  // Map referentials for select options
  const antenneOptions = (antennesQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.nom,
  }));

  const filiereOptions = (filieresQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelle || item.code,
  }));

  const statutOptions = (statutsQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelle,
  }));

  const typeFluxOptions = (typesFluxQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelle,
  }));

  const typeRecetteOptions = (typesRecettesQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelle,
  }));

  const nomenclatureOptions = (nomenclaturesQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelleStandard || item.libelleBrut,
  }));

  const promotionsQuery = usePromotions();
  const promotionOptions = (promotionsQuery.data ?? []).map((p: any) => ({
    value: p.nom,
    label: p.nom,
  }));

  const etudiantOptions = (etudiantListQuery.data ?? []).map((s: any) => ({
    value: String(s.id),
    label: `${s.matricule} - ${s.nom} ${s.prenom}`,
  }));

  // Fetch transactions with full query parameter object
  const queryParams = {
    limit,
    offset: (page - 1) * limit,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
    ...activeFilters,
  };

  const transactionsQuery = useTransactions(queryParams);
  const importMutation = useImportTransactions();
  const fetchFromTresorMutation = useFetchFromTresor();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const toast = useToast();
  
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'CSV' | 'CSV_TRESOR' | 'XLSX' | 'JSON'>('CSV_TRESOR');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Edit / Delete Modal states
  interface EditFormState {
    refTresor: string;
    montant: number;
    etudiantId?: number;
    antenneId?: number;
    nomenclatureId?: number;
    typeFluxId?: number;
    nomPayeurBrut: string;
    libelleProduitBrut: string;
    statutTraitement: string;
    gele: boolean;
    dateHeure: string;
  }

  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    refTresor: '',
    montant: 0,
    etudiantId: undefined,
    antenneId: undefined,
    nomenclatureId: undefined,
    typeFluxId: undefined,
    nomPayeurBrut: '',
    libelleProduitBrut: '',
    statutTraitement: 'IMPORTE',
    gele: false,
    dateHeure: '',
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleApplyFilters = () => {
    setPage(1);
    setActiveFilters({ ...filters });
  };

  const handleResetFilters = () => {
    setPage(1);
    setFilters({ ...initialFilters });
    setActiveFilters({ ...initialFilters });
  };

  const handleExportCSV = async () => {
    try {
      const blob = await transactionApi.export(activeFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Exportation des transactions filtrées réussie.');
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de l\'exportation CSV');
    }
  };

  const handleFileChange = (newFiles: File[]) => {
    setParsedData(null);
    setFileName(null);

    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setFileName(file.name);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      // Lecture binaire pour les fichiers Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const xlsxData = parseXLSX(buffer);
          if (xlsxData.length > 0) {
            setParsedData(xlsxData);
            setFileType('XLSX');
            toast.success(`${xlsxData.length} transactions détectées depuis le fichier Excel.`);
          } else {
            toast.error('Le fichier Excel est vide ou ne contient pas de données valides.', 'Fichier non supporté');
          }
        } catch (err) {
          toast.error('Erreur lors du parsing du fichier Excel. Vérifiez le format.', 'Parsing échoué');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Lecture texte pour CSV / JSON
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          if (file.name.endsWith('.json')) {
            const json = JSON.parse(text);
            if (Array.isArray(json)) {
              setParsedData(json);
              setFileType('JSON');
              toast.success(`${json.length} transactions détectées.`);
            } else {
              toast.error('Le fichier JSON doit contenir un tableau d\'objets.', 'Fichier non supporté');
            }
          } else if (file.name.endsWith('.csv')) {
            const csvData = parseCSV(text);
            if (csvData.length > 0) {
              setParsedData(csvData);
              setFileType('CSV_TRESOR');
              toast.success(`${csvData.length} transactions détectées.`);
            } else {
              toast.error('Le fichier CSV est vide ou invalide.', 'Fichier non supporté');
            }
          } else {
            toast.error('Format de fichier non supporté. Veuillez utiliser un fichier .xlsx, .csv ou .json.', 'Fichier non supporté');
          }
        } catch (err) {
          toast.error('Erreur lors du parsing du fichier.', 'Parsing échoué');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error('Aucune donnée valide à importer.');
      return;
    }
    try {
      const result = await importMutation.mutateAsync({
        nomFichier: fileName ?? 'import.csv',
        typeFichier: fileType,
        auteurId: 0, // filled by backend from auth headers
        items: parsedData,
      });
      const msg = typeof result?.message === 'string' ? result.message : 'Import terminé';
      const imported = Number(result?.imported ?? 0);
      const dupes = Number(result?.duplicates_skipped ?? 0);
      toast.success(`${msg} · importées: ${imported} · doublons: ${dupes}`, 'Importation réussie');
      setParsedData(null);
      setFileName(null);
      setIsImportModalOpen(false);
      transactionsQuery.refetch();
    } catch (importError) {
      toast.error(getErrorMessage(importError), "Échec de l'importation");
    }
  };

  const handleFetchFromTresor = async () => {
    try {
      const result = await fetchFromTresorMutation.mutateAsync();
      const msg = typeof result?.message === 'string' ? result.message : 'Synchronisation terminée';
      const imported = Number(result?.imported ?? 0);
      const dupes = Number(result?.duplicatesSkipped ?? 0);
      toast.success(`${msg} · importées: ${imported} · doublons: ${dupes}`, 'Synchronisation réussie');
      setIsImportModalOpen(false);
      transactionsQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de la synchronisation');
    }
  };

  // Edit / Delete handlers
  const handleStartEdit = (tx: any) => {
    setEditingTransaction(tx);
    
    // Format date for datetime-local input
    let formattedDate = '';
    if (tx.dateHeure) {
      const d = new Date(tx.dateHeure);
      // YYYY-MM-DDTHH:MM
      formattedDate = d.toISOString().slice(0, 16);
    }

    setEditForm({
      refTresor: tx.refTresor ?? '',
      montant: Number(tx.montant ?? 0),
      etudiantId: tx.etudiantId || undefined,
      antenneId: tx.antenneId || undefined,
      nomenclatureId: tx.nomenclatureId || undefined,
      typeFluxId: tx.typeFluxId || undefined,
      nomPayeurBrut: tx.nomPayeurBrut ?? '',
      libelleProduitBrut: tx.libelleProduitBrut ?? '',
      statutTraitement: tx.statutTraitement ?? 'IMPORTE',
      gele: tx.gele ?? false,
      dateHeure: formattedDate,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
      const payload = {
        ...editForm,
        dateHeure: editForm.dateHeure ? new Date(editForm.dateHeure).toISOString() : undefined,
      };
      await updateMutation.mutateAsync({
        id: editingTransaction.id,
        payload
      });
      toast.success('Transaction mise à jour avec succès.');
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      transactionsQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de la modification');
    }
  };

  const handleDeleteClick = (tx: any) => {
    setDeletingTransactionId(tx.id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransactionId) return;

    try {
      await deleteMutation.mutateAsync(deletingTransactionId);
      toast.success('Transaction supprimée avec succès.');
      setIsDeleteModalOpen(false);
      setDeletingTransactionId(null);
      transactionsQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de la suppression');
    }
  };

  const columns = [
    { 
      key: 'refTresor', 
      header: 'Référence', 
      sortable: true,
      render: (row: any) => String(row.refTresor ?? row.reference ?? '-') 
    },
    { 
      key: 'matriculeEtudiant', 
      header: 'Étudiant', 
      sortable: true,
      render: (row: any) => row.etudiant ? (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{row.etudiant.nom} {row.etudiant.prenom}</span>
          <span className="text-xs text-slate-400">{row.etudiant.matricule}</span>
        </div>
      ) : (
        <span className="text-slate-400">{row.etudiantId || '-'}</span>
      )
    },
    { 
      key: 'montant', 
      header: 'Montant', 
      sortable: true,
      render: (row: any) => formatCurrency(Number(row.montant ?? 0)) 
    },
    { 
      key: 'libelleProduitBrut', 
      header: 'Produit', 
      render: (row: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {row.nomenclature?.libelleStandard || row.libelleProduitBrut || '-'}
          </span>
          {row.nomenclature && (
            <span className="text-xs text-slate-400">{row.nomenclature.codeProduit}</span>
          )}
        </div>
      )
    },
    { 
      key: 'statutTraitement', 
      header: 'Statut', 
      render: (row: any) => <Badge tone={row.statutTraitement === 'AFFECTE' ? 'success' : 'info'}>{String(row.statutTraitement ?? '-')}</Badge> 
    },

    { 
      key: 'dateHeure', 
      header: 'Date', 
      sortable: true,
      render: (row: any) => formatDate(String(row.dateHeure ?? '')) 
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-500 hover:text-[var(--primary)] hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => handleStartEdit(row)}
            disabled={row.gele}
            title={row.gele ? "Transaction gelée" : "Modifier"}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => handleDeleteClick(row)}
            disabled={row.gele}
            title={row.gele ? "Transaction gelée" : "Supprimer"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const totals = transactionsQuery.data?.totals || { budget: 0, horsBudget: 0, total: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions – Consultation et import des flux de paiement"
        description="Consultez, filtrez et importez les flux de paiements des étudiants."
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              onClick={handleExportCSV}
              icon={<PiCloudArrowDownDuotone className="text-xl" />}
            >
              Exporter en CSV
            </Button>
            <Button 
              variant="solid"
              type="button" 
              onClick={() => { setIsImportModalOpen(true); setParsedData(null); setFileName(null); }}
              icon={<PiUploadSimpleDuotone className="text-xl" />}
            >
              Importer transactions
            </Button>
          </div>
        }
      />

      {/* KPI Cards section for totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-500/5 border-emerald-500/10 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Flux Budget</p>
                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(totals.budget)}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sky-500/5 border-sky-500/10 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider">Total Flux Hors Budget</p>
                <h3 className="text-2xl font-bold text-sky-700 dark:text-sky-300 mt-1">{formatCurrency(totals.horsBudget)}</h3>
              </div>
              <div className="p-3 bg-sky-500/10 text-sky-500 rounded-2xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-500/5 border-slate-500/10 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Général Filtré</p>
                <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">{formatCurrency(totals.total)}</h3>
              </div>
              <div className="p-3 bg-slate-500/10 text-slate-500 rounded-2xl">
                <RefreshCw className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Date début */}
            <Input
              type="date"
              label="Période (Début)"
              value={filters.dateDebut}
              onChange={(e) => setFilters(f => ({ ...f, dateDebut: e.target.value }))}
            />

            {/* Date fin */}
            <Input
              type="date"
              label="Période (Fin)"
              value={filters.dateFin}
              onChange={(e) => setFilters(f => ({ ...f, dateFin: e.target.value }))}
            />

            {/* Antenne */}
            <MultiSelect
              label="Antennes"
              placeholder="Toutes les antennes"
              options={antenneOptions}
              value={filters.antenneId ?? []}
              onChange={(vals) => setFilters(f => ({ ...f, antenneId: vals as number[] }))}
            />

            {/* Filiere */}
            <MultiSelect
              label="Filières"
              placeholder="Toutes les filières"
              options={filiereOptions}
              value={filters.filiereId ?? []}
              onChange={(vals) => setFilters(f => ({ ...f, filiereId: vals as number[] }))}
            />

            {/* Promotion */}
            <Select
              label="Réf. Promotions"
              placeholder="Toutes les promotions"
              options={promotionOptions}
              value={filters.promotion ?? ''}
              onChange={(e) => setFilters(f => ({ ...f, promotion: e.target.value || '' }))}
            />


          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
            <Button 
              variant="default" 
              onClick={handleResetFilters}
              icon={<PiXDuotone className="text-lg" />}
            >
              Réinitialiser
            </Button>
            <Button 
              variant="solid" 
              onClick={handleApplyFilters}
              icon={<PiMagnifyingGlassDuotone className="text-xl" />}
            >
              Rechercher
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main transactions list */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<any>
            data={transactionsQuery.data?.list ?? []}
            loading={transactionsQuery.isLoading}
            getRowKey={(row, index) => String(row.id ?? row.refTresor ?? index)}
            columns={columns}
            pagination={{
              currentPage: page,
              totalCount: transactionsQuery.data?.total ?? 0,
              pageSize: limit,
              onPageChange: (p) => setPage(p),
            }}
            sorting={{
              sortBy,
              sortOrder,
              onSortChange: (key, order) => {
                setSortBy(key);
                setSortOrder(order);
                setPage(1);
              }
            }}
          />
        </CardContent>
      </Card>


      {/* Import Modal */}
      <Modal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importer des transactions"
        width={550}
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-600 dark:text-amber-400 space-y-2">
            <p className="font-semibold">Modes d'importation disponibles :</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Glisser-déposer :</strong> importez un fichier CSV ou JSON structuré.</li>
              <li><strong>Trésor Pay :</strong> récupérez automatiquement les paiements en attente sur la plateforme nationale.</li>
            </ul>
          </div>

          <Upload
            draggable
            accept=".json,.csv,.xlsx,.xls"
            uploadLimit={1}
            onChange={handleFileChange}
            tip={<span className="text-xs text-slate-400">Fichiers acceptés : .xlsx (Excel), .csv, .json</span>}
          />

          {parsedData && parsedData.length > 0 && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-300 flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              <span>{parsedData.length} transactions détectées dans {fileName}.</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border)]">
            <div className="flex justify-between items-center w-full gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsImportModalOpen(false)}
                disabled={importMutation.isPending || fetchFromTresorMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                loading={importMutation.isPending}
                disabled={!parsedData || fetchFromTresorMutation.isPending}
              >
                <UploadIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                Lancer l'import fichier
              </Button>
            </div>
            
            <div className="relative my-2 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border)]"></div></div>
              <span className="relative bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 uppercase">Ou</span>
            </div>

            <Button
              type="button"
              variant="default"
              className="w-full border-amber-500/20 hover:bg-amber-500/5 text-slate-700 dark:text-slate-200"
              onClick={handleFetchFromTresor}
              loading={fetchFromTresorMutation.isPending}
              disabled={importMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2 animate-pulse" />
              Récupérer depuis Trésor Pay (Auto-résolution)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal (excludes OP fields) */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier la transaction"
        width={650}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Référence Trésor"
              required
              value={editForm.refTresor}
              onChange={(e) => setEditForm(f => ({ ...f, refTresor: e.target.value }))}
            />

            <Input
              type="number"
              label="Montant (F CFA)"
              required
              value={editForm.montant}
              onChange={(e) => setEditForm(f => ({ ...f, montant: Number(e.target.value) }))}
            />

            <Input
              type="datetime-local"
              label="Date / Heure"
              required
              value={editForm.dateHeure}
              onChange={(e) => setEditForm(f => ({ ...f, dateHeure: e.target.value }))}
            />

            <Select
              label="Étudiant"
              placeholder="Aucun étudiant"
              options={etudiantOptions}
              value={editForm.etudiantId !== undefined ? String(editForm.etudiantId) : ''}
              onChange={(e) => setEditForm(f => ({ ...f, etudiantId: e.target.value ? Number(e.target.value) : undefined }))}
              searchable
            />

            <Select
              label="Antenne"
              placeholder="Aucune antenne"
              options={antenneOptions}
              value={editForm.antenneId !== undefined ? String(editForm.antenneId) : ''}
              onChange={(e) => setEditForm(f => ({ ...f, antenneId: e.target.value ? Number(e.target.value) : undefined }))}
              searchable
            />

            <Select
              label="Nomenclature"
              placeholder="Aucune nomenclature"
              options={nomenclatureOptions}
              value={editForm.nomenclatureId !== undefined ? String(editForm.nomenclatureId) : ''}
              onChange={(e) => setEditForm(f => ({ ...f, nomenclatureId: e.target.value ? Number(e.target.value) : undefined }))}
              searchable
            />

            <Select
              label="Type de flux"
              placeholder="Aucun flux"
              options={[
                { value: '1', label: 'Budget' },
                { value: '2', label: 'Hors Budget' }
              ]}
              value={editForm.typeFluxId !== undefined ? String(editForm.typeFluxId) : ''}
              onChange={(e) => setEditForm(f => ({ ...f, typeFluxId: e.target.value ? Number(e.target.value) : undefined }))}
            />

            <Input
              label="Payeur"
              value={editForm.nomPayeurBrut}
              onChange={(e) => setEditForm(f => ({ ...f, nomPayeurBrut: e.target.value }))}
            />

            <div className="md:col-span-2">
              <Input
                label="Libellé Produit"
                value={editForm.libelleProduitBrut}
                onChange={(e) => setEditForm(f => ({ ...f, libelleProduitBrut: e.target.value }))}
              />
            </div>

            <Select
              label="Statut Traitement"
              options={[
                { value: 'IMPORTE', label: 'IMPORTE' },
                { value: 'AFFECTE', label: 'AFFECTE' }
              ]}
              value={editForm.statutTraitement}
              onChange={(e) => setEditForm(f => ({ ...f, statutTraitement: e.target.value || 'IMPORTE' }))}
            />

            <div className="flex items-center pt-8 pl-2">
              <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="rounded text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4 border-slate-300 dark:border-slate-700 bg-transparent"
                  checked={editForm.gele}
                  onChange={(e) => setEditForm(f => ({ ...f, gele: e.target.checked }))}
                />
                <span>Transaction gelée</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={updateMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              loading={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer la transaction"
        width={450}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Êtes-vous sûr de vouloir supprimer définitivement cette transaction ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={handleConfirmDelete}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Confirmer la suppression
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
