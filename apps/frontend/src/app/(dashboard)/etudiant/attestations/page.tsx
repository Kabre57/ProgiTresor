'use client';

import { Download, FileText, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useDownloadAttestation } from '@/lib/hooks/useEtudiantQueries';
import { useStudentPortalData } from '@/lib/hooks/useStudentPortalData';
import { formatCurrency } from '@/lib/utils/format';

export default function EtudiantAttestationsPage() {
  const toast = useToast();
  const downloadAttestation = useDownloadAttestation();
  const { etudiant, totalFees, totalPaid, restToPay, isLoading } = useStudentPortalData();

  const handleDownload = async () => {
    if (!etudiant) return;
    try {
      const blob = await downloadAttestation.mutateAsync(etudiant.matricule);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attestation_non_redevance_${etudiant.matricule}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Attestation générée avec succès.');
    } catch (err) {
      toast.error("Impossible de générer l'attestation.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  const canDownload = Boolean(etudiant) && restToPay === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Espace étudiant</p>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Mes attestations</h1>
        <p className="mt-1 text-sm text-slate-500">Documents financiers et scolaires disponibles pour votre dossier INFAS.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Attestation de non-redevance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500">Frais attendus</p>
              <p className="mt-1 text-lg font-bold">{formatCurrency(totalFees)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500">Total payé</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500">Reste à payer</p>
              <p className={`mt-1 text-lg font-bold ${restToPay === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(restToPay)}
              </p>
            </div>
          </div>

          {!canDownload && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              L'attestation de non-redevance sera disponible lorsque votre solde sera à jour.
            </div>
          )}

          <Button
            variant="solid"
            disabled={!canDownload}
            loading={downloadAttestation.isPending}
            icon={<Download className="h-4 w-4" />}
            onClick={handleDownload}
          >
            Télécharger l'attestation
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Fiche de scolarité
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 dark:text-slate-300">
          Votre fiche complète est disponible dans le menu Mon Profil.
        </CardContent>
      </Card>
    </div>
  );
}
