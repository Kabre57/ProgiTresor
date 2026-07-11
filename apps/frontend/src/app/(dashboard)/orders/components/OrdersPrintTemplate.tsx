import { formatCurrency } from '@/lib/utils/format';
import type { PaymentOrder } from '@/types/order.types';

type OrdersPrintTemplateProps = {
  filteredOrders: PaymentOrder[];
  periodDisplayText: string;
  getAntenneLabel: (id: number) => string;
  getNiveauLabel: (id: number) => string;
  getTypeRecetteLabel: (id: number) => string;
  totalMontant: number;
  totalTransactions: number;
};

export function OrdersPrintTemplate({
  filteredOrders,
  periodDisplayText,
  getAntenneLabel,
  getNiveauLabel,
  getTypeRecetteLabel,
  totalMontant,
  totalTransactions,
}: OrdersPrintTemplateProps) {
  return (
    <div className="hidden print:block p-8 bg-white text-black font-sans text-xs max-w-4xl mx-auto">
      <div className="border-b-2 border-blue-600 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Synthèse des Recettes Hors Budget</h1>
      </div>

      <div className="mt-6 grid grid-cols-2 border border-gray-200 divide-x divide-y divide-gray-200">
        <div className="p-3 bg-gray-50/50">
          <span className="font-semibold text-gray-700 block text-[10px] uppercase">Période d&apos;Analyse :</span>
          <span className="text-xs text-gray-600 font-medium">{periodDisplayText}</span>
        </div>
        <div className="p-3 bg-gray-50/50">
          <span className="font-semibold text-gray-700 block text-[10px] uppercase">Date Génération :</span>
          <span className="text-xs text-gray-600 font-medium">
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="p-3 bg-gray-50/50">
          <span className="font-semibold text-gray-700 block text-[10px] uppercase">Statut des Flux :</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              HORS BUDGET
            </span>
            <span className="text-xs text-gray-500 font-medium">(En attente de reversement)</span>
          </div>
        </div>
        <div className="p-3 bg-gray-50/50">
          <span className="font-semibold text-gray-700 block text-[10px] uppercase">Auteur / Service :</span>
          <span className="text-xs text-gray-600 font-medium">Direction Comptable & Financière</span>
        </div>
      </div>

      <table className="w-full mt-8 border-collapse border border-gray-200 text-[11px]">
        <thead>
          <tr className="bg-blue-600 text-white text-left font-bold uppercase tracking-wider divide-x divide-gray-200">
            <th className="p-3">Code OT</th>
            <th className="p-3">Antenne (INFAS)</th>
            <th className="p-3">Promotion</th>
            <th className="p-3">Statut Étudiant</th>
            <th className="p-3">Type de Recette (Flux)</th>
            <th className="p-3 text-right">Montant Cumulé (XOF)</th>
            <th className="p-3 text-center">Nbr Transactions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredOrders.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 divide-x divide-gray-200">
              <td className="p-3 font-mono font-bold text-gray-900">{String(row.codeOt ?? row.code ?? '-')}</td>
              <td className="p-3">{getAntenneLabel(Number(row.antenneId))}</td>
              <td className="p-3">{getNiveauLabel(Number(row.niveauId))}</td>
              <td className="p-3">{row.statutId === 1 ? 'Public' : row.statutId === 2 ? 'Privé' : '-'}</td>
              <td className="p-3">{getTypeRecetteLabel(Number(row.typeRecetteId))}</td>
              <td className="p-3 text-right font-semibold">{formatCurrency(Number(row.montantCumule ?? 0))}</td>
              <td className="p-3 text-center">{Number(row.nombreFlux ?? 0)}</td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold divide-x divide-gray-200 border-t-2 border-gray-300">
            <td colSpan={5} className="p-3 uppercase text-[10px] tracking-wide text-gray-700">
              Total général des flux hors budget
            </td>
            <td className="p-3 text-right text-gray-900">{formatCurrency(totalMontant)}</td>
            <td className="p-3 text-center text-gray-900">{totalTransactions}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
