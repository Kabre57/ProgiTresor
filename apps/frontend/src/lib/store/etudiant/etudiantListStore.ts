'use client';

import { create } from 'zustand';
import type { OnSortParam } from '@/components/shared/DataTable';
import type { Etudiant } from '@/types/etudiant.types';

export type EtudiantListFilter = {
  antenneId?: number;
  filiereId?: number;
  niveauId?: number;
  statutId?: number;
  promotionId?: number;
};

type EtudiantListState = {
  etudiantList: Etudiant[];
  selectedEtudiants: Etudiant[];
  initialLoading: boolean;
  query: string;
  filterData: EtudiantListFilter;
  pageIndex: number;
  pageSize: number;
  sort: OnSortParam;
  setEtudiantList: (etudiantList: Etudiant[]) => void;
  setInitialLoading: (loading: boolean) => void;
  setQuery: (query: string) => void;
  setFilterData: (filterData: EtudiantListFilter) => void;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  setSort: (sort: OnSortParam) => void;
  setSelectedEtudiant: (checked: boolean, etudiant: Etudiant) => void;
  setSelectAllEtudiant: (etudiant: Etudiant[]) => void;
};

export const useEtudiantListStore = create<EtudiantListState>((set) => ({
  etudiantList: [],
  selectedEtudiants: [],
  initialLoading: true,
  query: '',
  filterData: {},
  pageIndex: 1,
  pageSize: 10,
  sort: { key: '', order: '' },
  setEtudiantList: (etudiantList) => set({ etudiantList }),
  setInitialLoading: (initialLoading) => set({ initialLoading }),
  setQuery: (query) => set({ query, pageIndex: 1 }),
  setFilterData: (filterData) => set({ filterData, pageIndex: 1 }),
  setPageIndex: (pageIndex) => set({ pageIndex }),
  setPageSize: (pageSize) => set({ pageSize, pageIndex: 1 }),
  setSort: (sort) => set({ sort, pageIndex: 1 }),
  setSelectedEtudiant: (checked, etudiant) =>
    set((state) => {
      if (checked) {
        const exists = state.selectedEtudiants.some((item) => item.id === etudiant.id);
        return exists ? state : { selectedEtudiants: [...state.selectedEtudiants, etudiant] };
      }
      return {
        selectedEtudiants: state.selectedEtudiants.filter((item) => item.id !== etudiant.id),
      };
    }),
  setSelectAllEtudiant: (selectedEtudiants) => set({ selectedEtudiants }),
}));
