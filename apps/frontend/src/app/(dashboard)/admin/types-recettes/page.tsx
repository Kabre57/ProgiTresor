'use client';

import { Badge } from '@/components/ui/Badge';
import { ReferentialPage } from '@/components/referentials/ReferentialPage';
import { useReferential } from '@/lib/hooks/useEtudiantQueries';
import type { TypeRecette } from '@/types/etudiant.types';

export default function TypesRecettesPage() {
  const fluxQuery = useReferential('types-flux');
  const fluxOptions = (fluxQuery.data ?? []).map((flux) => ({
    label: `${flux.code} - ${flux.libelle}`,
    value: flux.id,
  }));

  return (
    <ReferentialPage<TypeRecette>
      endpoint="types-recettes"
      title="Types de recettes"
      description="Référentiel des recettes et rattachement aux flux."
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'libelle', label: 'Libellé', required: true },
        { name: 'typeFluxId', label: 'Type de flux', type: 'select', required: true, options: fluxOptions },
      ]}
      columns={[
        { key: 'code', header: 'Code', render: (row) => <Badge tone="info">{row.code}</Badge> },
        { key: 'libelle', header: 'Libellé', render: (row) => row.libelle },
        { key: 'typeFlux', header: 'Flux', render: (row) => row.typeFlux?.libelle ?? row.typeFluxId },
      ]}
    />
  );
}
