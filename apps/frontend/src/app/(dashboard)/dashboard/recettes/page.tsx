'use client';

import { Download, RefreshCw, BarChart2, PieChart, Search, X } from 'lucide-react';
import { PiCloudArrowDownDuotone, PiXDuotone, PiArrowsCounterClockwiseDuotone } from 'react-icons/pi';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Chart } from '@/components/ui/Chart';
import { useReferential, usePromotions } from '@/lib/hooks/useEtudiantQueries';
import { useGroupedByRecette } from '@/lib/hooks/useOperationsQueries';
import { formatCurrency } from '@/lib/utils/format';
import { useToast } from '@/components/ui/Toast';
import { transactionApi } from '@/lib/api/transactionApi';

export default function RecettesDashboardPage() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const initialFilters = {
    dateDebut: formatDateString(firstDayOfMonth),
    dateFin: formatDateString(today),
    etudiantMatricule: '',
    etudiantNom: '',
    libelleProduit: '',
    antenneId: undefined as number | undefined,
    filiereId: undefined as number | undefined,
    statutId: undefined as number | undefined,
    typeFluxId: undefined as number | undefined,
    typeRecetteId: undefined as number | undefined,
    nomenclatureId: undefined as number | undefined,
    promotion: '',
  };

  const [filters, setFilters] = useState({ ...initialFilters });
  const [activeFilters, setActiveFilters] = useState({ ...initialFilters });

  const toast = useToast();

  // Queries
  const antennasQuery = useReferential('antennes');
  const levelsQuery = useReferential('filieres');
  const statutsQuery = useReferential('statuts-etudiant');
  const typesFluxQuery = useReferential('types-flux');
  const typesRecettesQuery = useReferential('types-recettes');
  const nomenclaturesQuery = useReferential('nomenclatures');

  const recettesQuery = useGroupedByRecette(activeFilters);

  const antenneOptions = (antennasQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.nom,
  }));

  const filiereOptions = (levelsQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelle || item.code,
  }));

  const statutOptions = (statutsQuery.data ?? []).map((item: any) => ({
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

  const handleApplyFilters = () => {
    setActiveFilters({ ...filters });
  };

  const handleResetFilters = () => {
    setFilters({ ...initialFilters });
    setActiveFilters({ ...initialFilters });
  };

  const handleExportCSV = async () => {
    try {
      const blob = await transactionApi.exportSynthese(activeFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `synthese_recettes_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Exportation de la synthèse réussie.');
    } catch (err) {
      toast.error('Échec de l\'exportation de la synthèse.');
    }
  };

  const columns = [
    { key: 'typeRecette', header: 'Type de recette', render: (row: any) => row.typeRecette },
    { key: 'libelleStandard', header: 'Libellé standard / Nomenclature', render: (row: any) => row.libelleStandard },
    { key: 'montantBudget', header: 'Montant Budget', render: (row: any) => formatCurrency(row.montantBudget) },
    { key: 'montantHorsBudget', header: 'Montant Hors-Budget', render: (row: any) => formatCurrency(row.montantHorsBudget) },
    { key: 'montantTotal', header: 'Total', render: (row: any) => <span className="font-bold">{formatCurrency(row.montantTotal)}</span> },
  ];

  // Calculate overall totals
  const totalBudget = (recettesQuery.data ?? []).reduce((acc, curr) => acc + curr.montantBudget, 0);
  const totalHorsBudget = (recettesQuery.data ?? []).reduce((acc, curr) => acc + curr.montantHorsBudget, 0);
  const totalGlobal = totalBudget + totalHorsBudget;

  // Group data by Type de Recette for Bar Chart
  const typeRecetteChartData = useMemo(() => {
    const data = recettesQuery.data ?? [];
    const aggregated: Record<string, { budget: number; horsBudget: number }> = {};

    data.forEach((item) => {
      const type = item.typeRecette || 'Non classifié';
      if (!aggregated[type]) {
        aggregated[type] = { budget: 0, horsBudget: 0 };
      }
      aggregated[type].budget += item.montantBudget;
      aggregated[type].horsBudget += item.montantHorsBudget;
    });

    const categories = Object.keys(aggregated);
    const series = [
      {
        name: 'Budget',
        data: categories.map((cat) => aggregated[cat].budget),
      },
      {
        name: 'Hors-Budget',
        data: categories.map((cat) => aggregated[cat].horsBudget),
      },
    ];

    return { series, categories };
  }, [recettesQuery.data]);

  // Top Nomenclatures by Montant Total for Horizontal Bar Chart
  const nomenclatureChartData = useMemo(() => {
    const data = recettesQuery.data ?? [];
    // Sort by total descending and take top 5
    const sorted = [...data].sort((a, b) => b.montantTotal - a.montantTotal).slice(0, 5);

    const categories = sorted.map((item) => item.libelleStandard || 'Autre');
    const series = [
      {
        name: 'Montant (FCFA)',
        data: sorted.map((item) => item.montantTotal),
      },
    ];

    return { series, categories };
  }, [recettesQuery.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions – Consultation & import des flux de paiement"
        description="Consultez, filtrez et importez les flux de paiements des étudiants."
        actions={
          <Button
            variant="default"
            type="button"
            onClick={handleExportCSV}
            disabled={(recettesQuery.data ?? []).length === 0}
            icon={<PiCloudArrowDownDuotone className="text-xl" />}
          >
            Exporter en CSV
          </Button>
        }
      />

      {/* Filters de synthèse Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            Filtres de synthèse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Recherche Étudiant */}
            <Input
              label="Recherche Étudiant"
              placeholder="Matricule ou nom"
              value={filters.etudiantMatricule}
              onChange={(e) => setFilters(f => ({ ...f, etudiantMatricule: e.target.value }))}
            />

            {/* Libellé Produit */}
            <Input
              label="Libellé Produit"
              placeholder="Libellé du produit"
              value={filters.libelleProduit}
              onChange={(e) => setFilters(f => ({ ...f, libelleProduit: e.target.value }))}
            />

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
            <Select
              label="Antenne"
              placeholder="Toutes les antennes"
              options={antenneOptions}
              value={filters.antenneId !== undefined ? String(filters.antenneId) : ''}
              onChange={(e) => setFilters(f => ({ ...f, antenneId: e.target.value ? Number(e.target.value) : undefined }))}
              searchable
            />

            {/* Filiere */}
            <Select
              label="Filière"
              placeholder="Toutes les filières"
              options={filiereOptions}
              value={filters.filiereId !== undefined ? String(filters.filiereId) : ''}
              onChange={(e) => setFilters(f => ({ ...f, filiereId: e.target.value ? Number(e.target.value) : undefined }))}
              searchable
            />

            {/* Statut Étudiant */}
            <Select
              label="Statut Étudiant"
              placeholder="Tous les statuts"
              options={statutOptions}
              value={filters.statutId !== undefined ? String(filters.statutId) : ''}
              onChange={(e) => setFilters(f => ({ ...f, statutId: e.target.value ? Number(e.target.value) : undefined }))}
              searchable
            />

            {/* Type de flux */}
            <Select
              label="Type de flux"
              placeholder="Tous les flux"
              options={[
                { value: '1', label: 'Budget' },
                { value: '2', label: 'Hors Budget' }
              ]}
              value={filters.typeFluxId !== undefined ? String(filters.typeFluxId) : ''}
              onChange={(e) => setFilters(f => ({ ...f, typeFluxId: e.target.value ? Number(e.target.value) : undefined }))}
            />

            {/* Type de recette */}
            <Select
              label="Type de recette"
              placeholder="Tous les types"
              options={typeRecetteOptions}
              value={filters.typeRecetteId !== undefined ? String(filters.typeRecetteId) : ''}
              onChange={(e) => setFilters(f => ({ ...f, typeRecetteId: e.target.value ? Number(e.target.value) : undefined }))}
              searchable
            />

            {/* Nomenclature */}
            <Select
              label="Nomenclature"
              placeholder="Toutes les nomenclatures"
              options={nomenclatureOptions}
              value={filters.nomenclatureId !== undefined ? String(filters.nomenclatureId) : ''}
              onChange={(e) => setFilters(f => ({ ...f, nomenclatureId: e.target.value ? Number(e.target.value) : undefined }))}
              searchable
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
              icon={<PiArrowsCounterClockwiseDuotone className="text-xl" />}
            >
              Appliquer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="py-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Recettes Budget</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {recettesQuery.isLoading ? '...' : formatCurrency(totalBudget)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="py-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Recettes Hors-Budget</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {recettesQuery.isLoading ? '...' : formatCurrency(totalHorsBudget)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="py-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Global</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {recettesQuery.isLoading ? '...' : formatCurrency(totalGlobal)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable<any>
            data={recettesQuery.data ?? []}
            loading={recettesQuery.isLoading}
            getRowKey={(row, i) => `${row.nomenclatureId ?? 'raw'}-${row.libelleStandard}-${i}`}
            emptyLabel="Aucune recette enregistrée pour cette période"
            columns={columns}
          />
        </CardContent>
      </Card>
    </div>
  );
}
