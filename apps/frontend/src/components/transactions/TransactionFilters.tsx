'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PiMagnifyingGlassDuotone } from 'react-icons/pi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Button } from '@/components/ui/Button';
import { useReferential, usePromotions } from '@/lib/hooks/useEtudiantQueries';

export interface TransactionFiltersProps {
  onApplyFilters: (filters: any) => void;
}

const getFormatDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialDates = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    dateDebut: getFormatDateString(firstDayOfMonth),
    dateFin: getFormatDateString(today),
  };
};

const initialFilters = {
  dateDebut: getInitialDates().dateDebut,
  dateFin: getInitialDates().dateFin,
  etudiantMatricule: '',
  etudiantNom: '',
  libelleProduit: '',
  antenneId: [] as number[],
  filiereId: [] as number[],
  promotionId: [] as number[],
  statutId: [] as number[],
  typeFluxId: [] as number[],
  typeRecetteId: [] as number[],
  nomenclatureId: [] as number[],
};

export function TransactionFilters({ onApplyFilters }: TransactionFiltersProps) {
  const [filters, setFilters] = useState({ ...initialFilters });

  // Referential queries
  const antennesQuery = useReferential('antennes');

  const filieresQuery = useReferential('filieres');
  const statutsQuery = useReferential('statuts-etudiants');
  const typesFluxQuery = useReferential('types-flux');
  const typesRecettesQuery = useReferential('types-recettes');
  const nomenclaturesQuery = useReferential('nomenclatures');
  const promotionsQuery = usePromotions();

  // Map referentials for select options
  const antenneOptions = (antennesQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.nom,
  }));

  const filiereOptions = (filieresQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelle || item.code,
  }));

  const promotionOptions = (promotionsQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.niveau ? `${item.niveau} ${item.ordre}` : item.nom,
  }));

  const statutOptions = (statutsQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelle,
  }));

  const typeFluxOptions = (typesFluxQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelle,
  }));

  const typeRecetteToFluxMap = useMemo(() => {
    const map = new Map<number, number>();
    (typesRecettesQuery.data ?? []).forEach((item: any) => {
      map.set(item.id, item.typeFluxId);
    });
    return map;
  }, [typesRecettesQuery.data]);

  // Auto-reset dependent filter values if parent filter changes (MultiSelect arrays)
  useEffect(() => {
    if (filters.typeFluxId.length > 0 && typesRecettesQuery.data) {
      const allowedIds = typesRecettesQuery.data
        .filter((item: any) => filters.typeFluxId.includes(item.typeFluxId))
        .map((item: any) => item.id);
      const isDifferent = filters.typeRecetteId.some(id => !allowedIds.includes(id));
      if (isDifferent) {
        setFilters(f => ({
          ...f,
          typeRecetteId: f.typeRecetteId.filter(id => allowedIds.includes(id))
        }));
      }
    }
  }, [filters.typeFluxId, typesRecettesQuery.data, filters.typeRecetteId]);

  useEffect(() => {
    if (nomenclaturesQuery.data) {
      const allowedIds = nomenclaturesQuery.data
        .filter((item: any) => {
          if (filters.typeRecetteId.length > 0) {
            return filters.typeRecetteId.includes(item.typeRecetteId);
          }
          if (filters.typeFluxId.length > 0) {
            const fluxId = typeRecetteToFluxMap.get(item.typeRecetteId);
            return fluxId !== undefined && filters.typeFluxId.includes(fluxId);
          }
          return true;
        })
        .map((item: any) => item.id);
      const isDifferent = filters.nomenclatureId.some(id => !allowedIds.includes(id));
      if (isDifferent) {
        setFilters(f => ({
          ...f,
          nomenclatureId: f.nomenclatureId.filter(id => allowedIds.includes(id))
        }));
      }
    }
  }, [filters.typeFluxId, filters.typeRecetteId, nomenclaturesQuery.data, typeRecetteToFluxMap, filters.nomenclatureId]);

  const typeRecetteOptions = (typesRecettesQuery.data ?? [])
    .filter((item: any) => filters.typeFluxId.length === 0 || filters.typeFluxId.includes(item.typeFluxId))
    .map((item: any) => ({
      value: String(item.id),
      label: item.libelle,
    }));

  const nomenclatureOptions = (nomenclaturesQuery.data ?? [])
    .filter((item: any) => {
      if (filters.typeRecetteId.length > 0) {
        return filters.typeRecetteId.includes(item.typeRecetteId);
      }
      if (filters.typeFluxId.length > 0) {
        const fluxId = typeRecetteToFluxMap.get(item.typeRecetteId);
        return fluxId !== undefined && filters.typeFluxId.includes(fluxId);
      }
      return true;
    })
    .map((item: any) => ({
      value: String(item.id),
      label: item.libelle,
    }));



  const handleApplyFilters = () => {
    onApplyFilters({ ...filters });
  };

  const handleResetFilters = () => {
    setFilters({ ...initialFilters });
    onApplyFilters({ ...initialFilters });
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-[var(--border)]">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <PiMagnifyingGlassDuotone className="text-xl text-[var(--primary)]" />
          Filtres de recherche avancés
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Input
            type="date"
            label="Date Début"
            value={filters.dateDebut}
            onChange={(e) => setFilters(f => ({ ...f, dateDebut: e.target.value }))}
          />

          <Input
            type="date"
            label="Date Fin"
            value={filters.dateFin}
            onChange={(e) => setFilters(f => ({ ...f, dateFin: e.target.value }))}
          />

          <Input
            label="Référence Trésor"
            placeholder="Ex: TR-123456"
            value={filters.etudiantMatricule}
            onChange={(e) => setFilters(f => ({ ...f, etudiantMatricule: e.target.value }))}
          />

          <Input
            label="Nom Étudiant"
            placeholder="Rechercher par nom..."
            value={filters.etudiantNom}
            onChange={(e) => setFilters(f => ({ ...f, etudiantNom: e.target.value }))}
          />

          <Input
            label="Libellé Produit"
            placeholder="Ex: Scolarité..."
            value={filters.libelleProduit}
            onChange={(e) => setFilters(f => ({ ...f, libelleProduit: e.target.value }))}
          />

          <MultiSelect
            label="Antenne"
            placeholder="Sélectionner..."
            options={antenneOptions}
            value={filters.antenneId.map(String)}
            onChange={(vals) => setFilters(f => ({ ...f, antenneId: vals.map(Number) }))}
          />

          <MultiSelect
            label="Promotion"
            placeholder="Sélectionner..."
            options={promotionOptions}
            value={filters.promotionId.map(String)}
            onChange={(vals) => setFilters(f => ({ ...f, promotionId: vals.map(Number) }))}
          />

          <MultiSelect
            label="Filière"
            placeholder="Sélectionner..."
            options={filiereOptions}
            value={filters.filiereId.map(String)}
            onChange={(vals) => setFilters(f => ({ ...f, filiereId: vals.map(Number) }))}
          />

          <MultiSelect
            label="Statut Étudiant"
            placeholder="Sélectionner..."
            options={statutOptions}
            value={filters.statutId.map(String)}
            onChange={(vals) => setFilters(f => ({ ...f, statutId: vals.map(Number) }))}
          />

          <MultiSelect
            label="Type de flux"
            placeholder="Sélectionner..."
            options={typeFluxOptions}
            value={filters.typeFluxId.map(String)}
            onChange={(vals) => setFilters(f => ({ ...f, typeFluxId: vals.map(Number) }))}
          />

          <MultiSelect
            label="Type Recette"
            placeholder="Sélectionner..."
            options={typeRecetteOptions}
            value={filters.typeRecetteId.map(String)}
            onChange={(vals) => setFilters(f => ({ ...f, typeRecetteId: vals.map(Number) }))}
          />

          <MultiSelect
            label="Nomenclature Produit"
            placeholder="Sélectionner..."
            options={nomenclatureOptions}
            value={filters.nomenclatureId.map(String)}
            onChange={(vals) => setFilters(f => ({ ...f, nomenclatureId: vals.map(Number) }))}
          />


        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
          <Button
            variant="default"
            type="button"
            onClick={handleResetFilters}
          >
            Réinitialiser
          </Button>
          <Button
            variant="solid"
            type="button"
            onClick={handleApplyFilters}
          >
            Appliquer les filtres
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
