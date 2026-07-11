'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { PiXDuotone } from 'react-icons/pi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export interface RecettesFiltersState {
  dateDebut: string;
  dateFin: string;
  etudiantMatricule: string;
  etudiantNom: string;
  libelleProduit: string;
  antenneId?: number;
  filiereId?: number;
  niveauId?: number;
  statutId?: number;
  typeFluxId?: number;
  typeRecetteId?: number;
  nomenclatureId?: number;
  promotion: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface RecettesFiltersProps {
  filters: RecettesFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<RecettesFiltersState>>;
  onApply: () => void;
  onReset: () => void;
  antenneOptions: FilterOption[];

  filiereOptions: FilterOption[];
  statutOptions: FilterOption[];
  typeFluxOptions: FilterOption[];
  typeRecetteOptions: FilterOption[];
  nomenclatureOptions: FilterOption[];
  promotionOptions: FilterOption[];
}

export function RecettesFilters({
  filters,
  setFilters,
  onApply,
  onReset,
  antenneOptions,

  filiereOptions,
  statutOptions,
  typeFluxOptions,
  typeRecetteOptions,
  nomenclatureOptions,
  promotionOptions,
}: RecettesFiltersProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          Filtres de synthèse
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Date début */}
          <Input
            type="date"
            label="Période (Début)"
            value={filters.dateDebut}
            onChange={(e) => setFilters((f) => ({ ...f, dateDebut: e.target.value }))}
          />

          {/* Date fin */}
          <Input
            type="date"
            label="Période (Fin)"
            value={filters.dateFin}
            onChange={(e) => setFilters((f) => ({ ...f, dateFin: e.target.value }))}
          />

          {/* Recherche Étudiant */}
          <Input
            label="Recherche Étudiant"
            placeholder="Matricule ou nom"
            value={filters.etudiantMatricule}
            onChange={(e) => setFilters((f) => ({ ...f, etudiantMatricule: e.target.value }))}
          />

          {/* Libellé Produit */}
          <Input
            label="Libellé Produit"
            placeholder="Libellé du produit"
            value={filters.libelleProduit}
            onChange={(e) => setFilters((f) => ({ ...f, libelleProduit: e.target.value }))}
          />

          {/* Antenne */}
          <Select
            label="Antenne"
            placeholder="Toutes les antennes"
            options={antenneOptions}
            value={filters.antenneId !== undefined ? String(filters.antenneId) : ''}
            onChange={(e) => setFilters((f) => ({ ...f, antenneId: e.target.value ? Number(e.target.value) : undefined }))}
            searchable
          />

          {/* Promotion */}
          <Select
            label="Promotion"
            placeholder="Toutes les promotions"
            options={promotionOptions}
            value={filters.niveauId !== undefined ? String(filters.niveauId) : ''}
            onChange={(e) => setFilters((f) => ({ ...f, niveauId: e.target.value ? Number(e.target.value) : undefined }))}
            searchable
          />

          {/* Filiere */}
          <Select
            label="Filière"
            placeholder="Toutes les filières"
            options={filiereOptions}
            value={filters.filiereId !== undefined ? String(filters.filiereId) : ''}
            onChange={(e) => setFilters((f) => ({ ...f, filiereId: e.target.value ? Number(e.target.value) : undefined }))}
            searchable
          />

          {/* Statut Étudiant */}
          <Select
            label="Statut Étudiant"
            placeholder="Tous les statuts"
            options={statutOptions}
            value={filters.statutId !== undefined ? String(filters.statutId) : ''}
            onChange={(e) => setFilters((f) => ({ ...f, statutId: e.target.value ? Number(e.target.value) : undefined }))}
            searchable
          />

          {/* Type de flux */}
          <Select
            label="Type de flux"
            placeholder="Tous les flux"
            options={typeFluxOptions}
            value={filters.typeFluxId !== undefined ? String(filters.typeFluxId) : ''}
            onChange={(e) => setFilters((f) => ({ ...f, typeFluxId: e.target.value ? Number(e.target.value) : undefined }))}
          />

          {/* Type de recette */}
          <Select
            label="Type de recette"
            placeholder="Tous les types"
            options={typeRecetteOptions}
            value={filters.typeRecetteId !== undefined ? String(filters.typeRecetteId) : ''}
            onChange={(e) => setFilters((f) => ({ ...f, typeRecetteId: e.target.value ? Number(e.target.value) : undefined }))}
            searchable
          />

          {/* Nomenclature */}
          <Select
            label="Nomenclature"
            placeholder="Toutes les nomenclatures"
            options={nomenclatureOptions}
            value={filters.nomenclatureId !== undefined ? String(filters.nomenclatureId) : ''}
            onChange={(e) => setFilters((f) => ({ ...f, nomenclatureId: e.target.value ? Number(e.target.value) : undefined }))}
            searchable
          />

          {/* Réf. Promotions */}
          <Select
            label="Réf. Promotions"
            placeholder="Toutes les promotions"
            options={promotionOptions}
            value={filters.promotion || ''}
            onChange={(e) => setFilters((f) => ({ ...f, promotion: e.target.value }))}
            searchable
          />
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="ghost"
            type="button"
            onClick={onReset}
            icon={<PiXDuotone />}
          >
            Réinitialiser
          </Button>
          <Button
            variant="default"
            type="button"
            onClick={onApply}
            icon={<Search className="h-4 w-4" />}
          >
            Appliquer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
