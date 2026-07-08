'use client';

import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import { Form, FormItem } from '@/components/ui/Form';
import { TbFilter } from 'react-icons/tb';
import { useEtudiantListStore, type EtudiantListFilter } from '@/lib/store/etudiant/etudiantListStore';
import type { Antenne, Filiere, Niveau, Promotion, StatutEtudiant } from '@/types/etudiant.types';

type EtudiantListTableFilterProps = {
  antennes: Antenne[];
  filieres: Filiere[];
  niveaux: Niveau[];
  statuts: StatutEtudiant[];
  promotions: Promotion[];
};

const toNumberOrUndefined = (value: unknown) => {
  const numeric = Number(value);
  return numeric > 0 ? numeric : undefined;
};

const EtudiantListTableFilter = ({ antennes, filieres, niveaux, statuts, promotions }: EtudiantListTableFilterProps) => {
  const [dialogIsOpen, setIsOpen] = useState(false);
  const filterData = useEtudiantListStore((state) => state.filterData);
  const setFilterData = useEtudiantListStore((state) => state.setFilterData);
  const [draft, setDraft] = useState<EtudiantListFilter>(filterData);

  const antenneOptions = [
    { label: 'Toutes les antennes', value: 0 },
    ...antennes.map((item) => ({ label: `${item.code} - ${item.nom}`, value: item.id })),
  ];
  const niveauOptions = [
    { label: 'Tous les niveaux', value: 0 },
    ...niveaux.map((item) => ({ label: `${item.code} - ${item.libelle}`, value: item.id })),
  ];
  const filiereOptions = [
    { label: 'Toutes les filières', value: 0 },
    ...filieres.map((item) => ({ label: `${item.code} - ${item.libelle}`, value: item.id })),
  ];
  const statutOptions = [
    { label: 'Tous les statuts', value: 0 },
    ...statuts.map((item) => ({ label: `${item.code} - ${item.libelle}`, value: item.id })),
  ];
  const promotionOptions = [
    { label: 'Toutes les promotions', value: 0 },
    ...promotions.map((item) => ({ label: item.nom, value: item.id })),
  ];

  const openDialog = () => {
    setDraft(filterData);
    setIsOpen(true);
  };

  const activeFilterCount = Object.values(filterData).filter(Boolean).length;

  const handleReset = () => {
    setDraft({});
    setFilterData({});
    setIsOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilterData(draft);
    setIsOpen(false);
  };

  return (
    <>
      <Button icon={<TbFilter />} onClick={openDialog}>
        Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
      </Button>
      <Dialog
        isOpen={dialogIsOpen}
        width={520}
        title="Filtres avancés"
        onClose={() => setIsOpen(false)}
        onRequestClose={() => setIsOpen(false)}
      >
        <Form onSubmit={handleSubmit}>
          <FormItem label="Antenne">
            <Select
              instanceId="etudiant-filter-antenne"
              placeholder="Toutes les antennes"
              options={antenneOptions}
              value={draft.antenneId ?? 0}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  antenneId: toNumberOrUndefined(event.target.value),
                }))
              }
              searchable
            />
          </FormItem>
          <FormItem label="Promotion">
            <Select
              instanceId="etudiant-filter-promotion"
              placeholder="Toutes les promotions"
              options={promotionOptions}
              value={draft.promotionId ?? 0}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  promotionId: toNumberOrUndefined(event.target.value),
                }))
              }
              searchable
            />
          </FormItem>
          <FormItem label="Niveau">
            <Select
              instanceId="etudiant-filter-niveau"
              placeholder="Tous les niveaux"
              options={niveauOptions}
              value={draft.niveauId ?? 0}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  niveauId: toNumberOrUndefined(event.target.value),
                }))
              }
              searchable
            />
          </FormItem>
          <FormItem label="Filière">
            <Select
              instanceId="etudiant-filter-filiere"
              placeholder="Toutes les filières"
              options={filiereOptions}
              value={draft.filiereId ?? 0}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  filiereId: toNumberOrUndefined(event.target.value),
                }))
              }
              searchable
            />
          </FormItem>
          <FormItem label="Statut">
            <Select
              instanceId="etudiant-filter-statut"
              placeholder="Tous les statuts"
              options={statutOptions}
              value={draft.statutId ?? 0}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  statutId: toNumberOrUndefined(event.target.value),
                }))
              }
              searchable
            />
          </FormItem>
          <div className="flex justify-end items-center gap-2 mt-6">
            <Button type="button" onClick={handleReset}>
              Réinitialiser
            </Button>
            <Button type="submit" variant="solid">
              Appliquer
            </Button>
          </div>
        </Form>
      </Dialog>
    </>
  );
};

export default EtudiantListTableFilter;
