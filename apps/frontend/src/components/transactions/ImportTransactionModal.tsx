import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Upload } from '@/components/ui/Upload';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Upload as UploadIcon, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useImportTransactions, useImportTransactionFile, useFetchFromTresor } from '@/lib/hooks/useOperationsQueries';
import { useToast } from '@/components/ui/Toast';
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

const parseCSV = (text: string): Record<string, any>[] => {
  try {
    const workbook = XLSX.read(text, { type: 'string', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    
    return jsonData.map(item => {
      const mappedItem: Record<string, any> = {};
      for (const key of Object.keys(item)) {
        const cleanKey = key.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const mappedHeader = headerMap[cleanKey] || key.trim();
        mappedItem[mappedHeader] = item[key];
      }
      return mappedItem;
    });
  } catch (err) {
    console.error("CSV parse error via SheetJS:", err);
    return [];
  }
};

const parseXLSX = (buffer: ArrayBuffer): Record<string, any>[] => {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  
  return jsonData.map(item => {
    const mappedItem: Record<string, any> = {};
    for (const key of Object.keys(item)) {
      const cleanKey = key.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const mappedHeader = headerMap[cleanKey] || key.trim();
      mappedItem[mappedHeader] = item[key];
    }
    return mappedItem;
  });
};

export function ImportTransactionModal({ open, onClose }: ImportTransactionModalProps) {
  const toast = useToast();
  const importFileMutation = useImportTransactionFile();
  const fetchFromTresorMutation = useFetchFromTresor();

  const [parsedData, setParsedData] = useState<unknown[] | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'CSV' | 'CSV_TRESOR' | 'XLSX' | 'JSON'>('CSV_TRESOR');

  const handleFileChange = (newFiles: File[]) => {
    setParsedData(null);
    setFileName(null);
    setRawFile(null);

    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setRawFile(file);
    setFileName(file.name);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');
    const isJson = file.name.endsWith('.json');

    if (isExcel) setFileType('XLSX');
    else if (isCsv) setFileType('CSV');
    else if (isJson) setFileType('JSON');

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) return;

      try {
        if (isExcel) {
          const buffer = result as ArrayBuffer;
          const data = parseXLSX(buffer);
          setParsedData(data);
        } else if (isCsv) {
          const text = result as string;
          const data = parseCSV(text);
          setParsedData(data);
        } else if (isJson) {
          const text = result as string;
          const data = JSON.parse(text);
          setParsedData(Array.isArray(data) ? data : [data]);
        }
      } catch (err) {
        toast.error("Erreur de format de fichier.");
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
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
        </div>
      </div>
    </Modal>
  );
}
