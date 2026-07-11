import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { CheckCircle, ExternalLink, Lock, RotateCcw } from 'lucide-react';
import { resolveGatewayFileUrl } from '@/lib/api/files';
import { formatCurrency } from '@/lib/utils/format';
import type { PaymentOrder } from '@/types/order.types';

type OrdersTableProps = {
  paginatedOrders: PaymentOrder[];
  ordersQueryLoading: boolean;
  antennesQueryLoading: boolean;
  niveauxQueryLoading: boolean;
  typeRecettesQueryLoading: boolean;
  selectedOtCodes: string[];
  setSelectedOtCodes: React.Dispatch<React.SetStateAction<string[]>>;
  isTransmissionEligible: (order: PaymentOrder) => boolean;
  getAntenneLabel: (id: number) => string;
  getNiveauLabel: (id: number) => string;
  getTypeRecetteLabel: (id: number) => string;
  isChefComptableOrDf: boolean;
  handleSingleValidateAndTransmit: (code: string, clearFromBulkSelection?: (code: string) => void) => Promise<void>;
  setSelected: (order: PaymentOrder) => void;
  page: number;
  filteredOrdersCount: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
};

export function OrdersTable({
  paginatedOrders,
  ordersQueryLoading,
  antennesQueryLoading,
  niveauxQueryLoading,
  typeRecettesQueryLoading,
  selectedOtCodes,
  setSelectedOtCodes,
  isTransmissionEligible,
  getAntenneLabel,
  getNiveauLabel,
  getTypeRecetteLabel,
  isChefComptableOrDf,
  handleSingleValidateAndTransmit,
  setSelected,
  page,
  filteredOrdersCount,
  limit,
  setPage,
  setLimit,
}: OrdersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Liste des ordres de traitement filtrés</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable<PaymentOrder>
          data={paginatedOrders}
          loading={ordersQueryLoading || antennesQueryLoading || niveauxQueryLoading || typeRecettesQueryLoading}
          getRowKey={(row, index) => String(row.id ?? row.codeOt ?? index)}
          columns={[
            {
              key: 'select',
              header: (
                <input
                  type="checkbox"
                  checked={
                    paginatedOrders.length > 0 &&
                    paginatedOrders
                      .filter(isTransmissionEligible)
                      .every(o => selectedOtCodes.includes(String(o.codeOt ?? o.code)))
                  }
                  onChange={(e) => {
                    const pageCodes = paginatedOrders
                      .filter(isTransmissionEligible)
                      .map(o => String(o.codeOt ?? o.code));
                    if (e.target.checked) {
                      setSelectedOtCodes(prev => Array.from(new Set([...prev, ...pageCodes])));
                    } else {
                      setSelectedOtCodes(prev => prev.filter(c => !pageCodes.includes(c)));
                    }
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                />
              ),
              render: (row) => {
                const isSelectable = isTransmissionEligible(row);
                if (!isSelectable) return <div className="w-4 h-4" />;
                const code = String(row.codeOt ?? row.code);
                return (
                  <input
                    type="checkbox"
                    checked={selectedOtCodes.includes(code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOtCodes(prev => [...prev, code]);
                      } else {
                        setSelectedOtCodes(prev => prev.filter(c => c !== code));
                      }
                    }}
                    className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                  />
                );
              },
            },
            {
              key: 'codeOt',
              header: 'Code OT',
              render: (row) => <Badge tone="info">{String(row.codeOt ?? row.code ?? '-')}</Badge>,
            },
            {
              key: 'antenne',
              header: 'Antenne',
              render: (row) => getAntenneLabel(Number(row.antenneId)),
            },
            {
              key: 'niveau',
              header: 'Promotion',
              render: (row) => getNiveauLabel(Number(row.niveauId)),
            },
            {
              key: 'statutEtudiant',
              header: 'Statut Étudiant',
              render: (row) => (
                <Badge tone={row.statutId === 1 ? 'success' : 'warning'}>
                  {row.statutId === 1 ? 'Public' : row.statutId === 2 ? 'Privé' : '-'}
                </Badge>
              ),
            },
            {
              key: 'typeRecette',
              header: 'Type de recette',
              render: (row) => getTypeRecetteLabel(Number(row.typeRecetteId)),
            },
            {
              key: 'montant',
              header: 'Montant Cumulé',
              render: (row) => formatCurrency(Number(row.montantCumule ?? 0)),
            },
            {
              key: 'statut',
              header: 'Statut',
              render: (row) => {
                const status = String(row.statut ?? '');
                let tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
                let label = status;

                if (status === 'Brouillon') tone = 'neutral';
                else if (status === 'EN_ATTENTE_BUDGET') {
                  tone = 'warning';
                  label = 'En attente Budget';
                }
                else if (status === 'Transmis') tone = 'info';
                else if (status === 'Validé') tone = 'success';
                else if (status === 'TRANSMIS_AU_BUDGET') {
                  tone = 'success';
                  label = 'Transmis au Budget';
                }
                else if (status === 'Approuvé') {
                  tone = 'success';
                  label = 'Approuvé';
                }
                else if (status === 'Payé') {
                  tone = 'success';
                  label = 'Payé';
                }
                else if (status === 'Rejeté') tone = 'danger';

                return <Badge tone={tone}>{label}</Badge>;
              },
            },
            {
              key: 'version',
              header: 'Version',
              render: (row) => `v${Number(row.version ?? 1)}`,
            },
            {
              key: 'pdf',
              header: 'PDF',
              render: (row) => {
                const pdfUrl = resolveGatewayFileUrl(row.pdfUrl ?? row.pdfPath);
                if (!pdfUrl) return <span className="text-slate-400">-</span>;
                return (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline"
                  >
                    PDF
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                );
              },
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => {
                const isLocked = Boolean(row.pdfUrl ?? row.pdfPath);
                const code = String(row.codeOt ?? row.code);
                const isExpressAvailable = isTransmissionEligible(row);

                return (
                  <div className="flex items-center gap-2">
                    {isExpressAvailable && isChefComptableOrDf && (
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => handleSingleValidateAndTransmit(code, (c) => setSelectedOtCodes(prev => prev.filter(x => x !== c)))}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm transition-all duration-200"
                        title="Valider & Transmettre immédiatement au budget"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Valider & Transmettre</span>
                      </Button>
                    )}
                    {isLocked && (
                      <span
                        className="inline-flex items-center text-slate-500"
                        title="Cet OT est verrouillé car un PDF est attaché."
                      >
                        <Lock className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelected(row)}
                      aria-label="Changer statut"
                      title="Plus d&apos;actions / Historique"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                );
              },
            },
          ]}
          pagination={{
            currentPage: page,
            totalCount: filteredOrdersCount,
            pageSize: limit,
            onPageChange: (p) => setPage(p),
            onPageSizeChange: (l) => {
              setLimit(l);
              setPage(1);
            },
          }}
        />
      </CardContent>
    </Card>
  );
}
