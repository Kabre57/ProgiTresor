'use client';

import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import { Form, FormItem } from '@/components/ui/Form';
import { TbFilter } from 'react-icons/tb';
import { useStudentListStore, type StudentListFilter } from '../_store/studentListStore';
import type { Antenne, Filiere, Promotion, StatutEtudiant } from '@/types/student.types';

type StudentListTableFilterProps = {
  antennes: Antenne[];
  filieres: Filiere[];
  statuts: StatutEtudiant[];
  promotions: Promotion[];
};

const toNumberOrUndefined = (value: unknown) => {
  const numeric = Number(value);
  return numeric > 0 ? numeric : undefined;
};

const StudentListTableFilter = ({ antennes, filieres, statuts, promotions }: StudentListTableFilterProps) => {
  const [dialogIsOpen, setIsOpen] = useState(false);
  const filterData = useStudentListStore((state) => state.filterData);
  const setFilterData = useStudentListStore((state) => state.setFilterData);
  const [draft, setDraft] = useState<StudentListFilter>(filterData);

  const antenneOptions = [
    { label: 'Toutes les antennes', value: 0 },
    ...antennes.map((item) => ({ label: `${item.code} - ${item.nom}`, value: item.id })),
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
              instanceId="student-filter-antenne"
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
              instanceId="student-filter-promotion"
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
          <FormItem label="Filière">
            <Select
              instanceId="student-filter-filiere"
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
              instanceId="student-filter-statut"
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

export default StudentListTableFilter;
