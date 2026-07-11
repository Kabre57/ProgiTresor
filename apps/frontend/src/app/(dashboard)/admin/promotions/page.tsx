'use client';

import { Badge } from '@/components/ui/Badge';
import { ReferentialPage } from '@/components/referentials/ReferentialPage';
import type { Promotion } from '@/types/etudiant.types';

export default function PromotionsPage() {
  return (
    <ReferentialPage<Promotion>
      endpoint="promotions"
      title="Promotions"
      description="Gérez le référentiel des promotions d'études pour ScolarPaie."
      fields={[
        { name: 'nom', label: 'Nom de la Promotion (ex: Première année)', required: true },
        { name: 'ordre', label: 'Ordre (ex: 1 pour Première année)', type: 'number', required: true },
        { name: 'niveau', label: 'Niveau (ex: Licence, Auxiliaire)', required: false },
        { name: 'actif', label: 'Actif', type: 'checkbox' },
      ]}
      columns={[
        { key: 'nom', header: 'Nom de la Promotion', render: (row) => <Badge tone="info">{row.nom}</Badge> },
        { key: 'ordre', header: 'Ordre', render: (row) => row.ordre },
        { key: 'niveau', header: 'Niveau', render: (row) => row.niveau || 'N/A' },
        { key: 'actif', header: 'Statut', render: (row) => <Badge tone={row.actif ? 'success' : 'danger'}>{row.actif ? 'Actif' : 'Inactif'}</Badge> },
        { key: 'etudiantCount', header: 'Nombre d’étudiants', render: (row: any) => row._count?.etudiant ?? 0 },
      ]}
    />
  );
}
