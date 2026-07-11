import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { CopyPlus } from 'lucide-react';
import { resolveGatewayFileUrl } from '@/lib/api/files';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { PaymentOrder } from '@/types/order.types';

type OrdersDialogsProps = {
  selected: PaymentOrder | null;
  setSelected: (order: PaymentOrder | null) => void;
  motif: string;
  setMotif: (motif: string) => void;
  isChefComptableOrDf: boolean;
  canCorrectOp: boolean;
  createCorrectionPending: boolean;
  updateStatusPending: boolean;
  submitCorrection: () => Promise<void>;
  handleStatusChange: (status: string) => Promise<void>;
  confirmTransmitOpen: boolean;
  setConfirmTransmitOpen: (open: boolean) => void;
  isTransmitting: boolean;
  handleTransmitBudget: () => Promise<void>;
  selectedOtCodes: string[];
  setSelectedOtCodes: (codes: string[]) => void;
  handleBulkValidateAndTransmit: () => Promise<void>;
  isProcessingBulk: boolean;
};

export function OrdersDialogs({
  selected,
  setSelected,
  motif,
  setMotif,
  isChefComptableOrDf,
  canCorrectOp,
  createCorrectionPending,
  updateStatusPending,
  submitCorrection,
  handleStatusChange,
  confirmTransmitOpen,
  setConfirmTransmitOpen,
  isTransmitting,
  handleTransmitBudget,
  selectedOtCodes,
  setSelectedOtCodes,
  handleBulkValidateAndTransmit,
  isProcessingBulk,
}: OrdersDialogsProps) {
  return (
    <>
      <Modal open={Boolean(selected)} title="Changer le statut" onClose={() => setSelected(null)}>
        <div className="space-y-4">
          <Input label="Ordre" value={String(selected?.codeOt ?? '-')} readOnly />
          <Input label="Version" value={`v${Number(selected?.version ?? 1)}`} readOnly />

          {/* Timeline historique de l'OT */}
          <div className="mt-4 border-t pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Historique de l&apos;OT</h4>
            <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-4 ml-3">
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Création de l&apos;Ordre</p>
                <p className="text-[10px] text-slate-400">{selected?.dateCreation ? formatDate(selected.dateCreation) : '-'}</p>
              </div>
              
              <div className="relative">
                <div className={cn("absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900", selected?.dateEmission ? "bg-emerald-500" : "bg-slate-300")} />
                <p className={cn("text-xs font-semibold", selected?.dateEmission ? "text-slate-800 dark:text-slate-200" : "text-slate-400")}>Rattachement / Émission</p>
                {!!selected?.dateEmission && <p className="text-[10px] text-slate-400">{formatDate(selected.dateEmission as string)}</p>}
              </div>

              <div className="relative">
                <div className={cn("absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900", selected?.dateTransmissionBudget ? "bg-indigo-500" : "bg-slate-300")} />
                <p className={cn("text-xs font-semibold", selected?.dateTransmissionBudget ? "text-slate-800 dark:text-slate-200" : "text-slate-400")}>Transmission au Budget</p>
                {!!selected?.dateTransmissionBudget && <p className="text-[10px] text-slate-400">{formatDate(selected.dateTransmissionBudget as string)}</p>}
              </div>

              <div className="relative">
                <div className={cn("absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900", selected?.dateValidationChefComptable ? "bg-teal-500" : "bg-slate-300")} />
                <p className={cn("text-xs font-semibold", selected?.dateValidationChefComptable ? "text-slate-800 dark:text-slate-200" : "text-slate-400")}>Validation Chef Comptable</p>
                {!!selected?.dateValidationChefComptable && <p className="text-[10px] text-slate-400">{formatDate(selected.dateValidationChefComptable as string)}</p>}
              </div>

              <div className="relative">
                <div className={cn("absolute -left-[31px] top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900", selected?.dateApprobationDirecteurFinancier ? "bg-green-500" : "bg-slate-300")} />
                <p className={cn("text-xs font-semibold", selected?.dateApprobationDirecteurFinancier ? "text-slate-800 dark:text-slate-200" : "text-slate-400")}>Approbation Directeur Financier</p>
                {!!selected?.dateApprobationDirecteurFinancier && <p className="text-[10px] text-slate-400">{formatDate(selected.dateApprobationDirecteurFinancier as string)}</p>}
              </div>

              {selected?.statut === 'Rejeté' && (
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900" />
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Rejeté</p>
                  {!!selected?.dateRejet && <p className="text-[10px] text-slate-400">{formatDate(selected.dateRejet as string)}</p>}
                  {!!selected?.motifRejet && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded mt-1">{selected.motifRejet as string}</p>}
                </div>
              )}

              {!!selected?.datePaiement && (
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900" />
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Payé</p>
                  <p className="text-[10px] text-slate-400">{formatDate(selected.datePaiement as string)}</p>
                </div>
              )}
            </div>
          </div>
          {selected?.pdfUrl || selected?.pdfPath ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Cet OT est verrouillé car un PDF est attaché. Les corrections doivent créer une nouvelle version.
              {resolveGatewayFileUrl(selected.pdfUrl ?? selected.pdfPath) && (
                <a
                  href={resolveGatewayFileUrl(selected.pdfUrl ?? selected.pdfPath) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 font-semibold underline-offset-2 hover:underline"
                >
                  Télécharger le PDF
                </a>
              )}
            </div>
          ) : null}
          {!selected?.pdfUrl && !selected?.pdfPath && (
            <Textarea 
              label="Motif (Requis uniquement en cas de rejet)" 
              placeholder="Saisissez un motif si vous souhaitez rejeter cet ordre..."
              value={motif} 
              onChange={(event) => setMotif(event.target.value)} 
            />
          )}
          <div className="flex flex-col gap-3 border-t pt-4 mt-4">
            {/* Correction action (only if locked/has PDF) */}
            {(selected?.pdfUrl || selected?.pdfPath) && canCorrectOp && (
              <div className="mb-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={submitCorrection}
                  loading={createCorrectionPending}
                  disabled={!selected?.codeOt && !selected?.code}
                  className="w-full sm:w-auto"
                  icon={<CopyPlus className="h-4 w-4" />}
                >
                  Corriger et créer une nouvelle version
                </Button>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {/* Cancel / Close button */}
              <Button type="button" variant="secondary" onClick={() => { setSelected(null); setMotif(''); }}>
                Fermer
              </Button>

              {/* Context-sensitive actions */}
              {!selected?.pdfUrl && !selected?.pdfPath && (
                <>
                  {/* 1. Brouillon status actions */}
                  {selected?.statut === 'Brouillon' && (
                    <>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleStatusChange('Rejeté')}
                        loading={updateStatusPending}
                        disabled={!motif.trim()}
                        title={!motif.trim() ? "Veuillez saisir un motif de rejet" : ""}
                      >
                        Rejeter
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => handleStatusChange('Transmis')}
                        loading={updateStatusPending}
                      >
                        Transmettre pour validation
                      </Button>
                    </>
                  )}

                  {/* 2. En attente budget / Transmis status actions */}
                  {(selected?.statut === 'EN_ATTENTE_BUDGET' || selected?.statut === 'Transmis') && (
                    <>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleStatusChange('Rejeté')}
                        loading={updateStatusPending}
                        disabled={!motif.trim()}
                        title={!motif.trim() ? "Veuillez saisir un motif de rejet" : ""}
                      >
                        Rejeter
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleStatusChange('Validé')}
                        loading={updateStatusPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      >
                        Valider l&apos;Ordre
                      </Button>
                    </>
                  )}

                  {/* 3. Validé status actions */}
                  {selected?.statut === 'Validé' && (
                    <>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleStatusChange('Rejeté')}
                        loading={updateStatusPending}
                        disabled={!motif.trim()}
                        title={!motif.trim() ? "Veuillez saisir un motif de rejet" : ""}
                      >
                        Rejeter
                      </Button>
                      {isChefComptableOrDf && (
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => setConfirmTransmitOpen(true)}
                          disabled={isTransmitting}
                        >
                          Transmettre au Budget
                        </Button>
                      )}
                    </>
                  )}

                  {/* 4. Transmis au budget status actions */}
                  {selected?.statut === 'TRANSMIS_AU_BUDGET' && (
                    <>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleStatusChange('Rejeté')}
                        loading={updateStatusPending}
                        disabled={!motif.trim()}
                        title={!motif.trim() ? "Veuillez saisir un motif de rejet" : ""}
                      >
                        Rejeter
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleStatusChange('Approuvé')}
                        loading={updateStatusPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      >
                        Approuver l&apos;Ordre
                      </Button>
                    </>
                  )}

                  {/* 5. Approuvé status actions */}
                  {selected?.statut === 'Approuvé' && (
                    <Button
                      type="button"
                      onClick={() => handleStatusChange('Payé')}
                      loading={updateStatusPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      Confirmer le Paiement
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={confirmTransmitOpen} title="Confirmer la transmission" onClose={() => setConfirmTransmitOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Cette action va transmettre cet Ordre de Traitement vers le workflow Compta/Budget afin de créer les écritures en attente et les bordereaux associés.
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Voulez-vous continuer ?
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmTransmitOpen(false)} disabled={isTransmitting}>
              Annuler
            </Button>
            <Button type="button" variant="default" onClick={handleTransmitBudget} loading={isTransmitting}>
              Confirmer la transmission
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Action Tray */}
      {selectedOtCodes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-medium">
            {selectedOtCodes.length} Ordre(s) de traitement sélectionné(s)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedOtCodes([])}
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
              disabled={isProcessingBulk}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleBulkValidateAndTransmit}
              loading={isProcessingBulk}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              Valider & Transmettre la sélection
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
