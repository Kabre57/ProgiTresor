'use client';

import { Download, RefreshCw, BarChart2, PieChart, Search, X } from 'lucide-react';
import { PiCloudArrowDownDuotone, PiXDuotone, PiArrowsCounterClockwiseDuotone } from 'react-icons/pi';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Dropdown } from '@/components/ui/Dropdown';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Chart } from '@/components/ui/Chart';
import { useReferential, usePromotions } from '@/lib/hooks/useEtudiantQueries';
import { useGroupedByRecette } from '@/lib/hooks/useOperationsQueries';
import { formatCurrency } from '@/lib/utils/format';
import { useToast } from '@/components/ui/Toast';
import { transactionApi } from '@/lib/api/transactionApi';
import { SynthesisDetailsModal } from '@/components/synthesis/SynthesisDetailsModal';
import { RecettesFilters, type RecettesFiltersState } from '@/components/dashboard/RecettesFilters';

type ExportFormat = 'csv' | 'xlsx' | 'xls';
type SyntheseScope = 'both' | 'budget' | 'hors-budget';

export interface RecetteRow {
  nomenclatureId: number | null;
  libelle: string;
  typeRecette: string;
  typeFluxCode?: string;
  montantBudget: number;
  montantHorsBudget: number;
  montantTotal: number;
  nombreFlux: number;
  transactionIds: number[];
}

export default function RecettesDashboardPage() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

const initialFilters: RecettesFiltersState = {
    dateDebut: formatDateString(firstDayOfMonth),
    dateFin: formatDateString(today),
    etudiantMatricule: '',
    etudiantNom: '',
    libelleProduit: '',
    antenneId: undefined,
    filiereId: undefined,
    niveauId: undefined,
    statutId: undefined,
    typeFluxId: undefined,
    typeRecetteId: undefined,
    nomenclatureId: undefined,
    promotion: '',
  };

  const [filters, setFilters] = useState<RecettesFiltersState>({ ...initialFilters });
  const [activeFilters, setActiveFilters] = useState<RecettesFiltersState>({ ...initialFilters });
  const [exportScope, setExportScope] = useState<SyntheseScope>('both');

  const toast = useToast();
  const isValidDate = (value?: string) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const year = Number(value.slice(0, 4));
    return year >= 2020 && year <= 2100;
  };
  const activeFiltersAreValid = isValidDate(activeFilters.dateDebut) && isValidDate(activeFilters.dateFin);

  // Queries
  const antennasQuery = useReferential('antennes');
  const filieresQuery = useReferential('filieres');
  const promotionsQuery = useReferential('promotions');
  const statutsQuery = useReferential('statuts-etudiants');
  const typesFluxQuery = useReferential('types-flux');
  const typesRecettesQuery = useReferential('types-recettes');
  const nomenclaturesQuery = useReferential('nomenclatures');

  const recettesQuery = useGroupedByRecette(activeFilters, activeFiltersAreValid);

  // Pagination states
  const [currentPageBudget, setCurrentPageBudget] = useState(1);
  const [currentPageHorsBudget, setCurrentPageHorsBudget] = useState(1);
  const pageSize = 10;

  const recipes = (recettesQuery.data as RecetteRow[]) ?? [];

  const budgetRecipes = useMemo(() => {
    return recipes.filter(r => r.typeFluxCode === 'BUDGET' || r.montantBudget > 0);
  }, [recipes]);

  const horsBudgetRecipes = useMemo(() => {
    return recipes.filter(r => r.typeFluxCode === 'HORS_BUDGET' || r.montantHorsBudget > 0);
  }, [recipes]);

  const paginatedBudgetRecipes = useMemo(() => {
    const startIndex = (currentPageBudget - 1) * pageSize;
    return budgetRecipes.slice(startIndex, startIndex + pageSize);
  }, [budgetRecipes, currentPageBudget]);

  const paginatedHorsBudgetRecipes = useMemo(() => {
    const startIndex = (currentPageHorsBudget - 1) * pageSize;
    return horsBudgetRecipes.slice(startIndex, startIndex + pageSize);
  }, [horsBudgetRecipes, currentPageHorsBudget]);

  useEffect(() => {
    setCurrentPageBudget(1);
  }, [budgetRecipes.length]);

  useEffect(() => {
    setCurrentPageHorsBudget(1);
  }, [horsBudgetRecipes.length]);

  // Modal details states
  const [selectedLine, setSelectedLine] = useState<RecetteRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const modalLine = useMemo(() => {
    if (!selectedLine) return null;
    return {
      antenneLibelle: 'Toutes les antennes',
      niveauLibelle: 'Tous les niveaux',
      statutLibelle: 'Tous les statuts',
      typeRecetteLibelle: selectedLine.libelle || selectedLine.typeRecette || 'Recette',
      montantCumule: selectedLine.montantTotal,
      nombreFlux: selectedLine.nombreFlux,
      transactionIds: selectedLine.transactionIds || [],
    };
  }, [selectedLine]);

  interface AntenneData {
    id: number;
    nom: string;
  }

  interface NiveauData {
    id: number;
    libelle?: string;
    code?: string;
  }

  interface FiliereData {
    id: number;
    libelle?: string;
    code?: string;
  }

  interface StatutData {
    id: number;
    libelle: string;
  }

  interface TypeFluxData {
    id: number;
    code?: string;
    libelle: string;
  }

  interface TypeRecetteData {
    id: number;
    libelle: string;
    typeFluxId: number;
  }

  interface NomenclatureItem {
    id: number;
    libelle: string;
    typeRecetteId: number;
    typeRecette?: {
      id: number;
      typeFluxId: number;
    };
  }

  interface PromotionData {
    nom: string;
  }

  const antenneOptions = ((antennasQuery.data as AntenneData[]) ?? []).map((item) => ({
    value: String(item.id),
    label: item.nom,
  }));

  const promotionOptions = ((promotionsQuery.data as any[]) ?? []).map((item) => ({
    value: String(item.id),
    label: item.niveau ? `${item.niveau} ${item.ordre}` : (item.nom || ''),
  }));

  const filiereOptions = ((filieresQuery.data as FiliereData[]) ?? []).map((item) => ({
    value: String(item.id),
    label: item.libelle || item.code || '',
  }));

  const statutOptions = ((statutsQuery.data as StatutData[]) ?? []).map((item) => ({
    value: String(item.id),
    label: item.libelle,
  }));

  const typeFluxOptions = ((typesFluxQuery.data as TypeFluxData[]) ?? []).map((item) => ({
    value: String(item.id),
    label: item.libelle || item.code || '',
  }));

  const typeRecetteToFluxMap = useMemo(() => {
    const map = new Map<number, number>();
    ((typesRecettesQuery.data as TypeRecetteData[]) ?? []).forEach((item) => {
      map.set(item.id, item.typeFluxId);
    });
    return map;
  }, [typesRecettesQuery.data]);

  // Auto-reset dependent filter values if parent filter changes
  useEffect(() => {
    if (filters.typeFluxId !== undefined && typesRecettesQuery.data) {
      const validRecette = (typesRecettesQuery.data as TypeRecetteData[]).find(
        (item) => item.id === filters.typeRecetteId && item.typeFluxId === filters.typeFluxId
      );
      if (!validRecette) {
        setFilters(f => ({ ...f, typeRecetteId: undefined }));
      }
    }
  }, [filters.typeFluxId, typesRecettesQuery.data, filters.typeRecetteId]);

  useEffect(() => {
    if (nomenclaturesQuery.data) {
      const allowedNomenclatures = (nomenclaturesQuery.data as NomenclatureItem[]).filter((item) => {
        if (filters.typeRecetteId !== undefined) {
          return item.typeRecetteId === filters.typeRecetteId;
        }
        if (filters.typeFluxId !== undefined) {
          const fluxId = typeRecetteToFluxMap.get(item.typeRecetteId);
          return fluxId === filters.typeFluxId;
        }
        return true;
      });
      const validNomenclature = allowedNomenclatures.find((item) => item.id === filters.nomenclatureId);
      if (!validNomenclature) {
        setFilters(f => ({ ...f, nomenclatureId: undefined }));
      }
    }
  }, [filters.typeFluxId, filters.typeRecetteId, nomenclaturesQuery.data, typeRecetteToFluxMap, filters.nomenclatureId]);

  const typeRecetteOptions = ((typesRecettesQuery.data as TypeRecetteData[]) ?? [])
    .filter((item) => filters.typeFluxId === undefined || item.typeFluxId === filters.typeFluxId)
    .map((item) => ({
      value: String(item.id),
      label: item.libelle,
    }));

  const nomenclatureOptions = ((nomenclaturesQuery.data as NomenclatureItem[]) ?? [])
    .filter((item) => {
      if (filters.typeRecetteId !== undefined) {
        return item.typeRecetteId === filters.typeRecetteId;
      }
      if (filters.typeFluxId !== undefined) {
        const fluxId = typeRecetteToFluxMap.get(item.typeRecetteId);
        return fluxId === filters.typeFluxId;
      }
      return true;
    })
    .map((item) => ({
      value: String(item.id),
      label: item.libelle,
    }));



  const handleApplyFilters = () => {
    if (!isValidDate(filters.dateDebut) || !isValidDate(filters.dateFin)) {
      toast.error('Veuillez saisir une date complète et valide.');
      return;
    }
    setActiveFilters({ ...filters });
  };

  const handleResetFilters = () => {
    setFilters({ ...initialFilters });
    setActiveFilters({ ...initialFilters });
  };

  const handleExport = async (format: ExportFormat) => {
    try {
      const blob = await transactionApi.exportSynthese({ ...activeFilters, format, scope: exportScope });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `synthese_recettes_${exportScope}_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Exportation ${format.toUpperCase()} de la synthèse réussie.`);
    } catch (err) {
      toast.error('Échec de l\'exportation de la synthèse.');
    }
  };

  const budgetColumns = [
    { key: 'typeRecette', header: 'Type de recette', render: (row: RecetteRow) => row.typeRecette },
    { key: 'libelle', header: 'Libellé / Nomenclature', render: (row: RecetteRow) => row.libelle },
    { key: 'montantPaye', header: 'Montant Payé', render: (row: RecetteRow) => <span className="font-bold">{formatCurrency(row.montantBudget)}</span> },
    {
      key: 'nombreFlux',
      header: 'Nombre de transactions',
      render: (row: RecetteRow) => (
        <button
          type="button"
          onClick={() => {
            setSelectedLine(row);
            setIsDetailsOpen(true);
          }}
          className="text-[var(--primary)] font-bold hover:underline select-none"
        >
          {row.nombreFlux ?? 0}
        </button>
      ),
    },
  ];

  const horsBudgetColumns = [
    { key: 'typeRecette', header: 'Type de recette', render: (row: RecetteRow) => row.typeRecette },
    { key: 'libelle', header: 'Libellé / Nomenclature', render: (row: RecetteRow) => row.libelle },
    { key: 'montantPaye', header: 'Montant Payé', render: (row: RecetteRow) => <span className="font-bold">{formatCurrency(row.montantHorsBudget)}</span> },
    {
      key: 'nombreFlux',
      header: 'Nombre de transactions',
      render: (row: RecetteRow) => (
        <button
          type="button"
          onClick={() => {
            setSelectedLine(row);
            setIsDetailsOpen(true);
          }}
          className="text-[var(--primary)] font-bold hover:underline select-none"
        >
          {row.nombreFlux ?? 0}
        </button>
      ),
    },
  ];

  // Calculate overall totals
  const totalBudget = (recipes as RecetteRow[]).reduce((acc, curr) => acc + curr.montantBudget, 0);
  const totalHorsBudget = (recipes as RecetteRow[]).reduce((acc, curr) => acc + curr.montantHorsBudget, 0);
  const totalGlobal = totalBudget + totalHorsBudget;

  // Group data by Type de Recette for Bar Chart
  const typeRecetteChartData = useMemo(() => {
    const data = (recettesQuery.data as RecetteRow[]) ?? [];
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
    const data = (recettesQuery.data as RecetteRow[]) ?? [];
    // Sort by total descending and take top 5
    const sorted = [...data].sort((a, b) => b.montantTotal - a.montantTotal).slice(0, 5);

    const categories = sorted.map((item) => item.libelle || 'Autre');
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
        title="Synthèse des recettes"
        description="Analyse consolidée et visualisations graphiques des recettes de l'établissement."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              aria-label="Périmètre export"
              options={[
                { value: 'both', label: 'Synthèse Budget & Hors Budget' },
                { value: 'budget', label: 'Budget' },
                { value: 'hors-budget', label: 'Hors Budget' },
              ]}
              value={exportScope}
              onChange={(event) => setExportScope(event.target.value as SyntheseScope)}
              isSearchable={false}
            />
            <Dropdown
              placement="bottom-end"
              renderTitle={
                <Button
                  variant="default"
                  type="button"
                  disabled={(recettesQuery.data ?? []).length === 0}
                  icon={<PiCloudArrowDownDuotone className="text-xl" />}
                >
                  Exporter
                </Button>
              }
            >
              <Dropdown.Item onClick={() => handleExport('xlsx')}>Excel moderne (.xlsx)</Dropdown.Item>
              <Dropdown.Item onClick={() => handleExport('xls')}>Excel ancien (.xls)</Dropdown.Item>
              <Dropdown.Item onClick={() => handleExport('csv')}>CSV (.csv)</Dropdown.Item>
            </Dropdown>
          </div>
        }
      />

      {/* Filters de synthèse Card */}
      <RecettesFilters
        filters={filters}
        setFilters={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        antenneOptions={antenneOptions}
        filiereOptions={filiereOptions}
        statutOptions={statutOptions}
        typeFluxOptions={typeFluxOptions}
        typeRecetteOptions={typeRecetteOptions}
        nomenclatureOptions={nomenclatureOptions}
        promotionOptions={promotionOptions}
      />

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

      {/* Main Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recettes Budget */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recettes Budget</CardTitle>
              <div className="text-sm font-semibold text-slate-500">
                Total : <span className="text-emerald-600 font-bold">{formatCurrency(totalBudget)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable<any>
              data={paginatedBudgetRecipes}
              loading={recettesQuery.isLoading}
              getRowKey={(row, i) => `${row.nomenclatureId ?? 'raw'}-${row.libelle}-${i}`}
              emptyLabel="Aucune recette budget enregistrée pour cette période"
              columns={budgetColumns}
              pagination={{
                currentPage: currentPageBudget,
                totalCount: budgetRecipes.length,
                pageSize,
                onPageChange: (page) => setCurrentPageBudget(page),
              }}
            />
          </CardContent>
        </Card>

        {/* Recettes Hors Budget */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recettes Hors Budget</CardTitle>
              <div className="text-sm font-semibold text-slate-500">
                Total : <span className="text-blue-600 font-bold">{formatCurrency(totalHorsBudget)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable<any>
              data={paginatedHorsBudgetRecipes}
              loading={recettesQuery.isLoading}
              getRowKey={(row, i) => `${row.nomenclatureId ?? 'raw'}-${row.libelle}-${i}`}
              emptyLabel="Aucune recette hors budget enregistrée pour cette période"
              columns={horsBudgetColumns}
              pagination={{
                currentPage: currentPageHorsBudget,
                totalCount: horsBudgetRecipes.length,
                pageSize,
                onPageChange: (page) => setCurrentPageHorsBudget(page),
              }}
            />
          </CardContent>
        </Card>
      </div>

      <SynthesisDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedLine(null);
        }}
        synthesisLine={modalLine}
      />
    </div>
  );
}
