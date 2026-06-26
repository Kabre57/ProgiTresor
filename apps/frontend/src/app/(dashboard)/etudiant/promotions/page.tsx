'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Edit, GraduationCap, Calendar, Search, RefreshCw, X } from 'lucide-react';
import { useEtudiants, usePromotions, useReferential } from '@/lib/hooks/useEtudiantQueries';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export default function PromotionsPage() {
  const [selectedPromotion, setSelectedPromotion] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAntenne, setFilterAntenne] = useState<number | undefined>(undefined);
  
  const toast = useToast();
  const promotionsQuery = usePromotions();
  const antennasQuery = useReferential('antennes');
  const etudiantQuery = useEtudiants(
    searchTerm || undefined,
    filterAntenne,
    undefined,
    selectedPromotion || undefined
  );

  const antenneOptions = [
    { label: 'Toutes les antennes', value: 0 },
    ...(antennasQuery.data ?? []).map((item: any) => ({
      label: `${item.code} - ${item.nom}`,
      value: item.id,
    })),
  ];

  const handleSelectPromotion = (promo: string | null) => {
    setSelectedPromotion(promo);
  };

  const columns = [
    { key: 'matricule', header: 'Matricule', render: (row: any) => <Badge tone="info">{row.matricule}</Badge> },
    { key: 'nom', header: 'Nom complet', render: (row: any) => `${row.nom} ${row.prenom}` },
    { key: 'promotion', header: 'Promotion', render: (row: any) => row.promotion?.nom || row.promotionString || '-' },
    { key: 'antenne', header: 'Antenne', render: (row: any) => row.antenne?.nom ?? row.antenneId },
    { key: 'filiere', header: 'Filières', render: (row: any) => row.filiere?.libelle ?? row.filiereId },
    { key: 'statut', header: 'Statut', render: (row: any) => row.statut?.libelle ?? row.statutId },
  ];

  const listPromotions = promotionsQuery.data ?? [];
  const etudiantList = etudiantQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions d'études"
        description="Consultez et filtrez les fiches d'étudiants par promotion de recrutement."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Promotions List */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3 border-b border-[var(--border)]">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-amber-500" />
              Promotions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-2">
            {promotionsQuery.isLoading ? (
              <div className="p-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : listPromotions.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">
                Aucune promotion trouvée.
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectPromotion(null)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors font-medium',
                    selectedPromotion === null
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="h-4 w-4" />
                    <span>Toutes les promotions</span>
                  </div>
                </button>
                
                {listPromotions.map((promo) => (
                  <button
                    key={promo.id}
                    type="button"
                    onClick={() => handleSelectPromotion(promo.nom)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors font-medium',
                      selectedPromotion === promo.nom
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>{promo.nom}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Etudiants in selected promotion */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Filtres - {selectedPromotion ? selectedPromotion : 'Toutes les promotions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Input
                label="Rechercher par matricule ou nom"
                placeholder="Matricule, nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select
                label="Filtrer par antenne"
                placeholder="Toutes les antennes"
                options={antenneOptions}
                value={filterAntenne || 0}
                onChange={(e) => setFilterAntenne(e.target.value ? Number(e.target.value) : undefined)}
                searchable
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <DataTable<any>
                data={etudiantList}
                loading={etudiantQuery.isLoading}
                getRowKey={(row) => row.id}
                emptyLabel="Aucun étudiant trouvé pour cette promotion"
                columns={columns}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
