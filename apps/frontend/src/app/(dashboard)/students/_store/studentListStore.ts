'use client';

import { create } from 'zustand';
import type { OnSortParam } from '@/components/shared/DataTable';
import type { Etudiant } from '@/types/student.types';

export type StudentListFilter = {
  antenneId?: number;
  filiereId?: number;
  statutId?: number;
  promotionId?: number;
};

type StudentListState = {
  studentList: Etudiant[];
  selectedStudents: Etudiant[];
  initialLoading: boolean;
  query: string;
  filterData: StudentListFilter;
  pageIndex: number;
  pageSize: number;
  sort: OnSortParam;
  setStudentList: (studentList: Etudiant[]) => void;
  setInitialLoading: (loading: boolean) => void;
  setQuery: (query: string) => void;
  setFilterData: (filterData: StudentListFilter) => void;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  setSort: (sort: OnSortParam) => void;
  setSelectedStudent: (checked: boolean, student: Etudiant) => void;
  setSelectAllStudent: (students: Etudiant[]) => void;
};

export const useStudentListStore = create<StudentListState>((set) => ({
  studentList: [],
  selectedStudents: [],
  initialLoading: true,
  query: '',
  filterData: {},
  pageIndex: 1,
  pageSize: 10,
  sort: { key: '', order: '' },
  setStudentList: (studentList) => set({ studentList }),
  setInitialLoading: (initialLoading) => set({ initialLoading }),
  setQuery: (query) => set({ query, pageIndex: 1 }),
  setFilterData: (filterData) => set({ filterData, pageIndex: 1 }),
  setPageIndex: (pageIndex) => set({ pageIndex }),
  setPageSize: (pageSize) => set({ pageSize, pageIndex: 1 }),
  setSort: (sort) => set({ sort, pageIndex: 1 }),
  setSelectedStudent: (checked, student) =>
    set((state) => {
      if (checked) {
        const exists = state.selectedStudents.some((item) => item.id === student.id);
        return exists ? state : { selectedStudents: [...state.selectedStudents, student] };
      }
      return {
        selectedStudents: state.selectedStudents.filter((item) => item.id !== student.id),
      };
    }),
  setSelectAllStudent: (selectedStudents) => set({ selectedStudents }),
}));
