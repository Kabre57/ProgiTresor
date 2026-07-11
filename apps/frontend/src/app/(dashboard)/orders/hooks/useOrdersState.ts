import { useState, useMemo } from 'react';
import { useOrders } from '@/lib/hooks/useOperationsQueries';
import { useReferential } from '@/lib/hooks/useEtudiantQueries';
import type { PaymentOrder } from '@/types/order.types';

type OptionType = {
  id: number;
  libelle?: string;
  nom?: string;
  code?: string;
};

const statusOptions = [
  { label: 'Brouillon', value: 'Brouillon' },
  { label: 'Transmis', value: 'Transmis' },
  { label: 'Validé', value: 'Validé' },
  { label: 'Transmis au Budget', value: 'TRANSMIS_AU_BUDGET' },
  { label: 'Approuvé', value: 'Approuvé' },
  { label: 'Payé', value: 'Payé' },
  { label: 'Rejeté', value: 'Rejeté' },
];

export function useOrdersState() {
  const ordersQuery = useOrders();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [selectedAntenneId, setSelectedAntenneId] = useState<string>('all');
  const [selectedNiveauId, setSelectedNiveauId] = useState<string>('all');
  const [selectedTypeRecetteId, setSelectedTypeRecetteId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');

  const [selectedOtCodes, setSelectedOtCodes] = useState<string[]>([]);

  // Load referentials for ID mapping
  const antennesQuery = useReferential('antennes');
  const niveauxQuery = useReferential('niveaux');
  const typeRecettesQuery = useReferential('types-recettes');

  const getAntenneLabel = (id: number) => {
    const list = (antennesQuery.data ?? []) as OptionType[];
    const item = list.find((a) => a.id === id);
    return item ? (item.libelle || item.nom || item.code || '') : `Antenne #${id}`;
  };

  const getNiveauLabel = (id: number) => {
    const list = (niveauxQuery.data ?? []) as OptionType[];
    const item = list.find((n) => n.id === id);
    return item ? (item.libelle || item.nom || item.code || '') : `Niveau #${id}`;
  };

  const getTypeRecetteLabel = (id: number) => {
    const list = (typeRecettesQuery.data ?? []) as OptionType[];
    const item = list.find((t) => t.id === id);
    return item ? (item.libelle || item.nom || item.code || '') : `Recette #${id}`;
  };

  const allOrders = useMemo(() => {
    return Array.isArray(ordersQuery.data) ? ordersQuery.data : [];
  }, [ordersQuery.data]);

  const isTransmissionEligible = (order: PaymentOrder) =>
    order.statut === 'EN_ATTENTE_BUDGET' || order.statut === 'Transmis';

  // Parse available periods dynamically from all orders' syntheses
  const periodOptions = useMemo(() => {
    const list: { value: string; label: string; start: Date; end: Date }[] = [];
    const seen = new Set<string>();
    
    for (const order of allOrders) {
      const syn = order.synthese as { periodeDebut?: string; periodeFin?: string } | undefined;
      if (syn?.periodeDebut && syn?.periodeFin) {
        const start = new Date(syn.periodeDebut);
        const end = new Date(syn.periodeFin);
        const key = `${start.toISOString()}_${end.toISOString()}`;
        if (!seen.has(key)) {
          seen.add(key);
          
          const startMonthStr = start.toLocaleDateString('fr-FR', { month: 'long' });
          const endMonthStr = end.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
          const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
          const label = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
            ? cap(start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
            : `${cap(startMonthStr)} - ${cap(endMonthStr)}`;
            
          list.push({ value: key, label, start, end });
        }
      }
    }
    return list;
  }, [allOrders]);

  // Options lists formatted for custom Select components
  const antenneSelectOptions = useMemo(() => {
    const list = (antennesQuery.data ?? []) as OptionType[];
    return [
      { value: 'all', label: 'Toutes les antennes' },
      ...list.map((item) => ({
        value: String(item.id),
        label: item.libelle || item.nom || item.code || '',
      })),
    ];
  }, [antennesQuery.data]);

  const niveauSelectOptions = useMemo(() => {
    const list = (niveauxQuery.data ?? []) as OptionType[];
    return [
      { value: 'all', label: 'Tous les niveaux' },
      ...list.map((item) => ({
        value: String(item.id),
        label: item.libelle || item.code || '',
      })),
    ];
  }, [niveauxQuery.data]);

  const typeRecetteSelectOptions = useMemo(() => {
    const list = (typeRecettesQuery.data ?? []) as OptionType[];
    return [
      { value: 'all', label: 'Toutes les recettes' },
      ...list.map((item) => ({
        value: String(item.id),
        label: item.libelle || item.nom || item.code || '',
      })),
    ];
  }, [typeRecettesQuery.data]);

  const periodSelectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Toutes les périodes' },
      ...periodOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
      })),
    ];
  }, [periodOptions]);

  const statutSelectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Tous les statuts' },
      ...statusOptions,
    ];
  }, []);

  // Apply filters on the list
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      if (selectedAntenneId !== 'all' && Number(order.antenneId) !== Number(selectedAntenneId)) return false;
      if (selectedNiveauId !== 'all' && Number(order.niveauId) !== Number(selectedNiveauId)) return false;
      if (selectedTypeRecetteId !== 'all' && Number(order.typeRecetteId) !== Number(selectedTypeRecetteId)) return false;
      if (selectedStatut !== 'all' && order.statut !== selectedStatut) return false;
      
      // Period filter
      if (selectedPeriod !== 'all') {
        const syn = order.synthese as { periodeDebut?: string; periodeFin?: string } | undefined;
        if (!syn?.periodeDebut || !syn?.periodeFin) return false;
        const start = new Date(syn.periodeDebut).toISOString();
        const end = new Date(syn.periodeFin).toISOString();
        const key = `${start}_${end}`;
        if (key !== selectedPeriod) return false;
      }
      
      return true;
    });
  }, [allOrders, selectedAntenneId, selectedNiveauId, selectedTypeRecetteId, selectedStatut, selectedPeriod]);

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((page - 1) * limit, page * limit);
  }, [filteredOrders, page, limit]);

  const totalMontant = useMemo(() => {
    return filteredOrders.reduce((acc, curr) => acc + Number(curr.montantCumule ?? 0), 0);
  }, [filteredOrders]);

  const totalTransactions = useMemo(() => {
    return filteredOrders.reduce((acc, curr) => acc + Number(curr.nombreFlux ?? 0), 0);
  }, [filteredOrders]);

  // Determine current period display text for print template
  const periodDisplayText = useMemo(() => {
    const selectedPeriodObj = periodOptions.find((p) => p.value === selectedPeriod);
    return selectedPeriodObj
      ? `${selectedPeriodObj.label} (Fichiers Trésor Pay)`
      : 'Toutes les périodes (Fichiers Trésor Pay)';
  }, [periodOptions, selectedPeriod]);

  const isOrdersPayloadInvalid = Boolean(ordersQuery.data) && !Array.isArray(ordersQuery.data);

  return {
    ordersQuery,
    page,
    setPage,
    limit,
    setLimit,
    selectedAntenneId,
    setSelectedAntenneId,
    selectedNiveauId,
    setSelectedNiveauId,
    selectedTypeRecetteId,
    setSelectedTypeRecetteId,
    selectedPeriod,
    setSelectedPeriod,
    selectedStatut,
    setSelectedStatut,
    selectedOtCodes,
    setSelectedOtCodes,
    antennesQuery,
    niveauxQuery,
    typeRecettesQuery,
    getAntenneLabel,
    getNiveauLabel,
    getTypeRecetteLabel,
    allOrders,
    isTransmissionEligible,
    antenneSelectOptions,
    niveauSelectOptions,
    typeRecetteSelectOptions,
    periodSelectOptions,
    statutSelectOptions,
    filteredOrders,
    paginatedOrders,
    totalMontant,
    totalTransactions,
    periodDisplayText,
    isOrdersPayloadInvalid,
  };
}
