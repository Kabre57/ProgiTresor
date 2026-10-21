'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ShoppingBag, TrendingUp, BarChart2, PieChart, Printer, AlertTriangle } from 'lucide-react';
import { PiCloudArrowDownDuotone } from 'react-icons/pi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Chart } from '@/components/ui/Chart';
import { Tag } from '@/components/ui/Tag';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useTransactions, useDashboardKpis, useGroupedByRecette } from '@/lib/hooks/useOperationsQueries';
import { useReferential } from '@/lib/hooks/useEtudiantQueries';
import { transactionApi } from '@/lib/api/transactionApi';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import '@/styles/print.css';

interface KPICardProps {
  label: string;
  value: string | number;
  subValue: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: 'orange' | 'blue' | 'green' | 'red';
}

const themeClasses = {
  orange: {
    gradient: 'from-amber-500/10 to-amber-500/5',
    shadow: 'shadow-xl shadow-amber-500/5',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  },
  blue: {
    gradient: 'from-blue-500/10 to-blue-500/5',
    shadow: 'shadow-xl shadow-blue-500/5',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  },
  green: {
    gradient: 'from-emerald-500/10 to-emerald-500/5',
    shadow: 'shadow-xl shadow-emerald-500/5',
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  red: {
    gradient: 'from-red-500/10 to-red-500/5',
    shadow: 'shadow-xl shadow-red-500/5',
    iconBg: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  },
};

function KPICard({ label, value, subValue, icon: Icon, theme }: KPICardProps) {
  const conf = themeClasses[theme];
  return (
    <Card className={cn('bg-gradient-to-br border border-gray-100 dark:border-gray-800/80', conf.gradient, conf.shadow)}>
      <CardContent className="flex flex-col justify-between h-full p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200', conf.iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subValue}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateDebut, setDateDebut] = useState(formatDateString(firstDayOfMonth));
  const [dateFin, setDateFin] = useState(formatDateString(today));
  const [antenneId, setAntenneId] = useState<number | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const toast = useToast();

  const antennesQuery = useReferential('antennes');
  const antenneOptions = (antennesQuery.data ?? []).map((item) => ({
    label: `${item.code} - ${item.nom}`,
    value: item.id,
  }));

  const kpisQuery = useDashboardKpis(
    dateDebut || undefined,
    dateFin || undefined,
    antenneId
  );

  const activeFilters = useMemo(() => ({
    dateDebut: dateDebut || undefined,
    dateFin: dateFin || undefined,
    antenneId,
  }), [dateDebut, dateFin, antenneId]);

  const recettesQuery = useGroupedByRecette(activeFilters);

  const transactionsQuery = useTransactions({
    limit: 5,
    sortBy: 'dateHeure',
    sortOrder: 'desc',
    dateDebut: dateDebut || undefined,
    dateFin: dateFin || undefined,
    antenneId,
  });

  // Bar chart by standard label (KPI data)
  const barChartData = useMemo(() => {
    const data = kpisQuery.data?.byLibelle ?? [];
    return {
      series: [
        {
          name: 'Montant (FCFA)',
          data: data.map(item => item.montant)
        }
      ],
      categories: data.map(item => item.libelle)
    };
  }, [kpisQuery.data]);

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

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await transactionApi.export({
        format: 'xlsx',
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
        antenneId
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Export des transactions réussi !');
    } catch (err) {
      toast.error('Échec de l\u0027export des transactions.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 dashboard-print-area">
      {/* ===== Print-only Header ===== */}
      <div className="print-header">
        <h1>ProgiTrésor — Tableau de bord</h1>
        <p>
          Période : {dateDebut || '—'} au {dateFin || '—'} · Généré le{' '}
          {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>

      <div className="print-hide">
        <PageHeader
          title="Tableau de bord"
          description="Synthèse des flux et états financiers des transactions étudiantes."
          actions={
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handlePrint}
                icon={<Printer className="h-4 w-4" />}
              >
                Imprimer
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExport}
                loading={exporting}
                disabled={exporting}
                icon={<PiCloudArrowDownDuotone className="text-xl" />}
              >
                Exporter Excel
              </Button>
              <Tag tone="success" prefix={true}>Connecté</Tag>
            </div>
          }
        />
      </div>

      {/* Date period and Antenna Filters — hidden in print */}
      <Card className="border border-gray-100 dark:border-gray-800/80 shadow-md print-hide">
        <CardContent className="p-4 grid gap-4 sm:grid-cols-3 items-end">
          <Input
            type="date"
            label="Période du"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
          <Input
            type="date"
            label="Au"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
          />
          <Select
            label="Filtrer par Antenne"
            placeholder="Toutes les antennes"
            options={antenneOptions}
            value={antenneId ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setAntenneId(val ? Number(val) : undefined);
            }}
          />
        </CardContent>
      </Card>

      {/* ===== Widget Alertes de Classification ===== */}
      {kpisQuery.data && (kpisQuery.data.nonClassifieCount ?? 0) > 0 && (
        <div 
          onClick={() => router.push('/transactions?statutTraitement=NON_CLASSIFIE')}
          className="cursor-pointer border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors p-4 rounded-xl flex items-center justify-between shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 print-hide"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg text-sm animate-pulse flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              {kpisQuery.data.nonClassifieCount}
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Alertes de Classification</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Transactions en attente de classification détectées. Cliquer pour les voir et les classifier.</p>
            </div>
          </div>
          <span className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline flex items-center gap-1">
            Traiter les anomalies &rarr;
          </span>
        </div>
      )}

      {/* Filtered Period sums (KPIs) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 dashboard-kpi-grid">
        <KPICard
          label="Recettes Budget (Période)"
          value={kpisQuery.isLoading ? '...' : formatCurrency(kpisQuery.data?.totalBudget ?? 0)}
          subValue="Flux budgétaires perçus"
          icon={Wallet}
          theme="blue"
        />
        <KPICard
          label="Recettes Hors Budget (Période)"
          value={kpisQuery.isLoading ? '...' : formatCurrency(kpisQuery.data?.totalHorsBudget ?? 0)}
          subValue="Flux hors budget perçus"
          icon={TrendingUp}
          theme="orange"
        />
        <KPICard
          label="Total Recettes (Période)"
          value={kpisQuery.isLoading ? '...' : formatCurrency((kpisQuery.data?.totalBudget ?? 0) + (kpisQuery.data?.totalHorsBudget ?? 0))}
          subValue="Total consolidé perçu"
          icon={ShoppingBag}
          theme="green"
        />
        <KPICard
          label="Nombre de transactions"
          value={transactionsQuery.isLoading ? '...' : String(transactionsQuery.data?.total ?? 0)}
          subValue="Total des transactions"
          icon={Wallet}
          theme="blue"
        />
      </div>

      {/* Recettes standardisées Chart */}
      <Card className="border border-gray-100 dark:border-gray-800/80 shadow-md">
        <CardHeader>
          <CardTitle>Sommes des recettes par libellé (Période)</CardTitle>
        </CardHeader>
        <CardContent>
          {kpisQuery.isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500 font-medium">Chargement du graphique...</div>
          ) : barChartData.categories.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500 font-medium">Aucune donnée sur cette période.</div>
          ) : (
            <Chart
              type="bar"
              series={barChartData.series}
              xAxis={barChartData.categories}
              height={300}
            />
          )}
        </CardContent>
      </Card>

      {/* Recettes dynamic charts from useGroupedByRecette */}
      <div className="grid gap-6 md:grid-cols-2 dashboard-charts-grid">
        <Card className="border border-gray-100 dark:border-gray-800/80 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center space-x-2">
            <PieChart className="h-4 w-4 text-slate-400" />
            <CardTitle className="text-sm font-semibold">Répartition par Type de Recette</CardTitle>
          </CardHeader>
          <CardContent>
            {recettesQuery.isLoading ? (
              <div className="h-[250px] flex items-center justify-center text-slate-500 font-medium">Chargement...</div>
            ) : typeRecetteChartData.categories.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-slate-500 italic">Aucune donnée</div>
            ) : (
              <Chart
                type="bar"
                series={typeRecetteChartData.series}
                xAxis={typeRecetteChartData.categories}
                height={250}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800/80 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center space-x-2">
            <BarChart2 className="h-4 w-4 text-slate-400" />
            <CardTitle className="text-sm font-semibold">Top 5 Nomenclatures / Produits (FCFA)</CardTitle>
          </CardHeader>
          <CardContent>
            {recettesQuery.isLoading ? (
              <div className="h-[250px] flex items-center justify-center text-slate-500 font-medium">Chargement...</div>
            ) : nomenclatureChartData.categories.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-slate-500 italic">Aucune donnée</div>
            ) : (
              <Chart
                type="bar"
                series={nomenclatureChartData.series}
                xAxis={nomenclatureChartData.categories}
                height={250}
                customOptions={{
                  plotOptions: {
                    bar: {
                      horizontal: true,
                    },
                  },
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Print-only Footer ===== */}
    </div>
  );
}
