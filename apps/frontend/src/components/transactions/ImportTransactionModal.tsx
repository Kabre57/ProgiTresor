import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Upload } from '@/components/ui/Upload';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Upload as UploadIcon, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useImportTransactionFile, useFetchFromTresor } from '@/lib/hooks/useOperationsQueries';
import { useToast } from '@/components/ui/Toast';
import { downloadImportTemplate } from '@/lib/utils/importTemplates';
import { isExcelFileName } from '@/lib/utils/excelFiles';
import { getErrorMessage } from '@/lib/api/client';

interface ImportTransactionModalProps {
  open: boolean;
  onClose: () => void;
}

const headerMap: Record<string, string> = {
  'reference tresor': 'refTresor',
  'reference': 'refTresor',
  'ref_tresor': 'refTresor',
  'reftresor': 'refTresor',
  'date/heure': 'dateHeure',
  'date': 'dateHeure',
  'dateheure': 'dateHeure',
  'date_heure': 'dateHeure',
  'montant': 'montant',
  'etudiant': 'etudiantMatricule',
  'matricule': 'etudiantMatricule',
  'matriculeetudiant': 'etudiantMatricule',
  'etudiantmatricule': 'etudiantMatricule',
  'payeur': 'nomPayeurBrut',
  'nom payeur': 'nomPayeurBrut',
  'nompayeurbrut': 'nomPayeurBrut',
  'nom_payeur_brut': 'nomPayeurBrut',
  'contact payeur': 'contactPayeur',
  'contact_payeur': 'contactPayeur',
  'contactpayer': 'contactPayeur',
  'contactpayeur': 'contactPayeur',
  'libelle produit': 'libelleProduitBrut',
  'produit': 'libelleProduitBrut',
  'libelleproduitbrut': 'libelleProduitBrut',
  'libelle_produit_brut': 'libelleProduitBrut',
};

const parseXLSX = (buffer: ArrayBuffer): Record<string, any>[] => {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  if (jsonData.length === 0) throw new Error('Le fichier ne contient aucune transaction à importer.');

  const mappedRows = jsonData.map(item => {
    const mappedItem: Record<string, any> = {};
    for (const key of Object.keys(item)) {
      const cleanKey = key.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const mappedHeader = headerMap[cleanKey] || key.trim();
      mappedItem[mappedHeader] = item[key];
    }
    return mappedItem;
  });
  const requiredFields = [
    ['refTresor', 'reference'],
    ['dateHeure', 'date'],
    ['montant', 'montant'],
    ['etudiantMatricule', 'matricule'],
    ['nomPayeurBrut', 'payeur'],
    ['libelleProduitBrut', 'produit'],
  ] as const;
  const missingHeaders = requiredFields
    .filter(([field]) => !Object.prototype.hasOwnProperty.call(mappedRows[0], field))
    .map(([, label]) => label);
  if (missingHeaders.length > 0) {
    throw new Error(`Colonnes requises manquantes : ${missingHeaders.join(', ')}. Modèle attendu : reference, date, montant, matricule, payeur, produit.`);
  }

  const invalidRow = mappedRows.findIndex(row => requiredFields.some(([field]) => {
    const value = row[field];
    if (value === undefined || value === null || String(value).trim() === '') return true;
    if (field === 'montant') {
      const amount = typeof value === 'string'
        ? Number(value.trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'))
        : Number(value);
      return !Number.isSafeInteger(amount) || amount <= 0;
    }
    return false;
  }));
  if (invalidRow >= 0) throw new Error(`La ligne ${invalidRow + 2} doit renseigner les six colonnes du modèle.`);

  return mappedRows;
};

export function ImportTransactionModal({ open, onClose }: ImportTransactionModalProps) {
  const toast = useToast();
  const importFileMutation = useImportTransactionFile();
  const fetchFromTresorMutation = useFetchFromTresor();

  const [parsedData, setParsedData] = useState<unknown[] | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (newFiles: File[]) => {
    setParsedData(null);
    setFileName(null);
    setRawFile(null);

    if (newFiles.length === 0) return;
    const file = newFiles[0];
    if (!isExcelFileName(file.name)) {
      toast.error('Sélectionnez un fichier Excel (.xlsx ou .xls).');
      return;
    }
    setRawFile(file);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) return;

      try {
        const data = parseXLSX(result as ArrayBuffer);
        setParsedData(data);
      } catch (err) {
        setRawFile(null);
        setFileName(null);
        toast.error(err instanceof Error ? err.message : 'Le fichier Excel est invalide.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!rawFile) return;

    try {
      const result = await importFileMutation.mutateAsync(rawFile);
      toast.success(
        `Importation terminée : ${result.imported ?? 0} transactions créées, ${result.duplicates_skipped ?? 0} doublons ignorés.`
      );
      setParsedData(null);
      setRawFile(null);
      setFileName(null);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err), "Échec de l'importation");
    }
  };

  const handleFetchFromTresor = async () => {
    try {
      const result = await fetchFromTresorMutation.mutateAsync();
      toast.success(
        `Récupération Trésor Pay réussie : ${result.imported ?? 0} transactions récupérées, ${result.duplicatesSkipped ?? 0} doublons ignorés.`
      );
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err), "Échec de la récupération");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Importer des transactions" width={550}>
      <div className="space-y-6">
        <Button
          type="button"
          onClick={() => downloadImportTemplate('transactions').catch(error => toast.error(getErrorMessage(error)))}
        >
          Télécharger le modèle Excel
        </Button>

        <Upload
          draggable
          accept=".xlsx,.xls"
          uploadLimit={1}
          onChange={handleFileChange}
          tip={<span className="text-xs text-slate-400">Fichiers Excel (.xlsx, .xls) uniquement</span>}
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
              onClick={onClose}
              disabled={importFileMutation.isPending || fetchFromTresorMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              loading={importFileMutation.isPending}
              disabled={!rawFile || fetchFromTresorMutation.isPending}
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
            disabled={importFileMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2 animate-pulse" />
            Récupérer depuis Trésor Pay (Auto-résolution)
          </Button>
          <p className="text-xs text-slate-500">
            Connexion Trésor Pay en attente des accès de l’établissement. Utilisez l’import Excel en attendant.
          </p>
        </div>
      </div>
    </Modal>
  );
}
