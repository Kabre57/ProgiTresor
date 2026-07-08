'use client';

import EtudiantListSearch from './EtudiantListSearch';
import EtudiantListTableFilter from './EtudiantListTableFilter';
import { useEtudiantListStore } from '@/lib/store/etudiant/etudiantListStore';
import type { Antenne, Filiere, Niveau, Promotion, StatutEtudiant } from '@/types/etudiant.types';

type EtudiantListTableToolsProps = {
  antennes: Antenne[];
  filieres: Filiere[];
  niveaux: Niveau[];
  statuts: StatutEtudiant[];
  promotions: Promotion[];
};

const EtudiantListTableTools = ({ antennes, filieres, niveaux, statuts, promotions }: EtudiantListTableToolsProps) => {
  const setQuery = useEtudiantListStore((state) => state.setQuery);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <EtudiantListSearch onInputChange={setQuery} />
      <EtudiantListTableFilter antennes={antennes} filieres={filieres} niveaux={niveaux} statuts={statuts} promotions={promotions} />
    </div>
  );
};

export default EtudiantListTableTools;
