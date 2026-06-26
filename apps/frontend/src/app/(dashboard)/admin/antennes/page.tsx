'use client';

import { Badge } from '@/components/ui/Badge';
import { ReferentialPage } from '@/components/referentials/ReferentialPage';
import type { Antenne } from '@/types/student.types';

export default function AntennesPage() {
  return (
    <ReferentialPage<Antenne>
      endpoint="antennes"
      title="Antennes"
      description="Sites et antennes utilisées pour rattacher les étudiants."
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'nom', label: 'Nom', required: true },
        { name: 'ville', label: 'Ville', required: true },
        { name: 'actif', label: 'Actif', type: 'checkbox' },
      ]}
      columns={[
        { key: 'code', header: 'Code', render: (row) => <Badge tone="info">{row.code}</Badge> },
        { key: 'nom', header: 'Nom', render: (row) => row.nom },
        { key: 'ville', header: 'Ville', render: (row) => row.ville },
        { key: 'actif', header: 'Statut', render: (row) => <Badge tone={row.actif ? 'success' : 'danger'}>{row.actif ? 'Actif' : 'Inactif'}</Badge> },
      ]}
    />
  );
}
