'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Upload from '@/components/ui/Upload';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { etudiantApi } from '@/lib/api/etudiantApi';

type EtudiantImportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
};

const EtudiantImportDialog = ({ isOpen, onClose, onImported }: EtudiantImportDialogProps) => {
  const toast = useToast();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    duplicates_skipped: number;
    errors: string[] | null;
  } | null>(null);

  const handleClose = () => {
    if (importing) return;
    setUploadFile(null);
    setImportSummary(null);
    onClose();
  };

  const handleImportEtudiants = async () => {
    if (!uploadFile) return;
    try {
      setImporting(true);
      const result = await etudiantApi.importEtudiants(uploadFile);
      setImportSummary({
        created: result.created,
        duplicates_skipped: result.duplicates_skipped,
        errors: result.errors,
      });
      toast.success(`Import terminé : ${result.created} créés.`);
      onImported();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de l’importation');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      width={560}
      title="Importer des étudiants"
      onClose={handleClose}
      onRequestClose={handleClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Téléversez un fichier CSV avec les colonnes attendues : matricule, nom, prenom, antenneId,
          promotionNom ou promotionId, filiereId, statutId et matriculeTresorPay.
        </p>

        <Upload
          accept=".csv"
          draggable
          uploadLimit={1}
          fileList={uploadFile ? [uploadFile] : []}
          onChange={(files) => setUploadFile(files[0] || null)}
          onFileRemove={() => setUploadFile(null)}
          tip={<div className="mt-2 text-xs text-gray-500">Fichier CSV uniquement.</div>}
        />

        {importSummary && (
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-sm space-y-2">
            <div className="font-semibold text-gray-700 dark:text-gray-200">Résumé de l'import</div>
            <div className="text-emerald-600 dark:text-emerald-400">{importSummary.created} étudiants créés</div>
            <div className="text-amber-600 dark:text-amber-400">{importSummary.duplicates_skipped} doublons ignorés</div>
            {importSummary.errors && importSummary.errors.length > 0 && (
              <div className="text-red-600 dark:text-red-400">
                <div className="font-semibold">Erreurs rencontrées ({importSummary.errors.length})</div>
                <ul className="list-disc pl-4 text-xs max-h-32 overflow-y-auto mt-1 space-y-1">
                  {importSummary.errors.map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" onClick={handleClose} disabled={importing}>
            Fermer
          </Button>
          <Button type="button" variant="solid" onClick={handleImportEtudiants} loading={importing} disabled={!uploadFile}>
            Lancer l'import
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default EtudiantImportDialog;
