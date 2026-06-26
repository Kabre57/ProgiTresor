'use client';

import { Badge } from '@/components/ui/Badge';
import { ReferentialPage } from '@/components/referentials/ReferentialPage';
import { useReferential } from '@/lib/hooks/useStudentQueries';
import type { NomenclatureProduit } from '@/types/student.types';

export default function NomenclaturesPage() {
  const typeRecettesQuery = useReferential('types-recettes');
  const filieresQuery = useReferential('filieres');
  const statutsQuery = useReferential('statuts-etudiants');

  return (
    <ReferentialPage<NomenclatureProduit>
      endpoint="nomenclatures"
      title="Nomenclatures produits"
      description="Normalisation des libellés de recettes et produits comptables."
      fields={[
        { name: 'libelleBrut', label: 'Libellé brut', required: true },
        { name: 'codeProduit', label: 'Code produit', required: true },
        { name: 'libelleStandard', label: 'Libellé standard', required: true },
        {
          name: 'typeRecetteId',
          label: 'Type recette',
          type: 'select',
          required: true,
          options: (typeRecettesQuery.data ?? []).map((item) => ({ label: `${item.code} - ${item.libelle}`, value: item.id })),
        },
        {
          name: 'filiereId',
          label: 'Filières',
          type: 'select',
          options: (filieresQuery.data ?? []).map((item) => ({ label: `${item.code} - ${item.libelle}`, value: item.id })),
        },
        {
          name: 'statutId',
          label: 'Statut',
          type: 'select',
          options: (statutsQuery.data ?? []).map((item) => ({ label: `${item.code} - ${item.libelle}`, value: item.id })),
        },
        { name: 'numVersement', label: 'N° versement', type: 'number' },
        { name: 'actif', label: 'Actif', type: 'checkbox' },
      ]}
      columns={[
        { key: 'codeProduit', header: 'Code', render: (row) => <Badge tone="info">{row.codeProduit}</Badge> },
        { key: 'libelleBrut', header: 'Brut', render: (row) => row.libelleBrut },
        { key: 'standard', header: 'Standard', render: (row) => row.libelleStandard },
        { key: 'typeRecette', header: 'Recette', render: (row) => row.typeRecette?.libelle ?? row.typeRecetteId },
        { key: 'actif', header: 'Statut', render: (row) => <Badge tone={row.actif ? 'success' : 'danger'}>{row.actif ? 'Actif' : 'Inactif'}</Badge> },
      ]}
    />
  );
}
