'use client';

import { useEffect, useState } from 'react';
import Container from '@/components/shared/Container';
import AdaptiveCard from '@/components/shared/AdaptiveCard';
import EtudiantListActionTools from '@/components/etudiants/EtudiantListActionTools';
import EtudiantListTable from '@/components/etudiants/EtudiantListTable';
import EtudiantListTableTools from '@/components/etudiants/EtudiantListTableTools';
import EtudiantImportDialog from '@/components/etudiants/EtudiantImportDialog';
import { useReferential, useEtudiants, usePromotions } from '@/lib/hooks/useEtudiantQueries';
import { useEtudiantListStore } from '@/lib/store/etudiant/etudiantListStore';

export default function EtudiantsPage() {
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const query = useEtudiantListStore((state) => state.query);
  const filterData = useEtudiantListStore((state) => state.filterData);
  const setEtudiantList = useEtudiantListStore((state) => state.setEtudiantList);
  const setInitialLoading = useEtudiantListStore((state) => state.setInitialLoading);

  const antennesQuery = useReferential('antennes');
  const filieresQuery = useReferential('filieres');
  const niveauxQuery = useReferential('niveaux');
  const statutsQuery = useReferential('statuts-etudiants');
  const promotionsQuery = usePromotions();
  const etudiantQuery = useEtudiants({
    search: query || undefined,
    ...filterData,
  });

  useEffect(() => {
    setEtudiantList(etudiantQuery.data ?? []);
  }, [setEtudiantList, etudiantQuery.data]);

  useEffect(() => {
    setInitialLoading(etudiantQuery.isLoading);
  }, [setInitialLoading, etudiantQuery.isLoading]);

  return (
    <>
      <Container>
        <AdaptiveCard>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3>Fiches étudiants</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Liste générale avec recherche, tri, pagination et filtres métier.
                </p>
              </div>
              <EtudiantListActionTools onImportClick={() => setImportDialogOpen(true)} />
            </div>
            <EtudiantListTableTools
              antennes={antennesQuery.data ?? []}
              filieres={filieresQuery.data ?? []}
              niveaux={niveauxQuery.data ?? []}
              statuts={statutsQuery.data ?? []}
              promotions={promotionsQuery.data ?? []}
            />
            <EtudiantListTable />
          </div>
        </AdaptiveCard>
      </Container>

      <EtudiantImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImported={() => etudiantQuery.refetch()}
      />
    </>
  );
}
