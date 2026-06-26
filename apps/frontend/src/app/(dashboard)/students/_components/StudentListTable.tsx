'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import Tag, { type TagTone } from '@/components/ui/Tag';
import Tooltip from '@/components/ui/Tooltip';
import DataTable from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils/format';
import { useStudentListStore } from '../_store/studentListStore';
import { TbEye, TbPencil } from 'react-icons/tb';
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable';
import type { Etudiant } from '@/types/student.types';

const getInitials = (student: Etudiant) =>
  `${student.nom?.[0] ?? ''}${student.prenom?.[0] ?? ''}`.toUpperCase() || 'ET';

const getStatusTone = (label?: string): TagTone => {
  const normalized = (label ?? '').toLowerCase();
  if (normalized.includes('actif') || normalized.includes('dipl')) return 'success';
  if (normalized.includes('arr') || normalized.includes('suspend')) return 'warning';
  if (normalized.includes('bloq') || normalized.includes('excl')) return 'danger';
  return 'info';
};

const getSortValue = (student: Etudiant, key: string | number) => {
  switch (String(key)) {
    case 'name':
      return `${student.nom} ${student.prenom}`;
    case 'matricule':
      return student.matricule;
    case 'promotion':
      return student.promotion?.nom || student.promotionString || '';
    case 'antenne':
      return student.antenne?.nom || student.antenneId;
    case 'filiere':
      return student.filiere?.libelle || student.filiereId;
    case 'statut':
      return student.statut?.libelle || student.statutId;
    case 'dateCreation':
      return student.dateCreation;
    default:
      return '';
  }
};

const compareValues = (a: unknown, b: unknown) => {
  const left = String(a ?? '').toLowerCase();
  const right = String(b ?? '').toLowerCase();
  return left.localeCompare(right, 'fr', { numeric: true, sensitivity: 'base' });
};

const NameColumn = ({ row }: { row: Etudiant }) => {
  return (
    <div className="flex items-center">
      <Avatar size={40} shape="circle" src={row.photoUrl ?? undefined}>
        {getInitials(row)}
      </Avatar>
      <Link
        className="hover:text-primary ml-2 rtl:mr-2 font-semibold text-gray-900 dark:text-gray-100"
        href={`/students/${encodeURIComponent(row.matricule)}`}
      >
        {row.nom} {row.prenom}
      </Link>
    </div>
  );
};

const ActionColumn = ({ onEdit, onViewDetail }: { onEdit: () => void; onViewDetail: () => void }) => {
  return (
    <div className="flex items-center gap-3">
      <Tooltip title="Modifier">
        <div className="text-xl cursor-pointer select-none font-semibold" role="button" onClick={onEdit}>
          <TbPencil />
        </div>
      </Tooltip>
      <Tooltip title="Voir">
        <div className="text-xl cursor-pointer select-none font-semibold" role="button" onClick={onViewDetail}>
          <TbEye />
        </div>
      </Tooltip>
    </div>
  );
};

const StudentListTable = () => {
  const router = useRouter();
  const studentList = useStudentListStore((state) => state.studentList);
  const selectedStudents = useStudentListStore((state) => state.selectedStudents);
  const initialLoading = useStudentListStore((state) => state.initialLoading);
  const pageIndex = useStudentListStore((state) => state.pageIndex);
  const pageSize = useStudentListStore((state) => state.pageSize);
  const sort = useStudentListStore((state) => state.sort);
  const setPageIndex = useStudentListStore((state) => state.setPageIndex);
  const setPageSize = useStudentListStore((state) => state.setPageSize);
  const setSort = useStudentListStore((state) => state.setSort);
  const setSelectedStudent = useStudentListStore((state) => state.setSelectedStudent);
  const setSelectAllStudent = useStudentListStore((state) => state.setSelectAllStudent);

  const handleEdit = (student: Etudiant) => {
    router.push(`/students/${encodeURIComponent(student.matricule)}/edit`);
  };

  const handleViewDetails = (student: Etudiant) => {
    router.push(`/students/${encodeURIComponent(student.matricule)}`);
  };

  const columns: ColumnDef<Etudiant>[] = useMemo(
    () => [
      {
        header: 'Nom',
        accessorKey: 'name',
        cell: (props) => <NameColumn row={props.row.original} />,
      },
      {
        header: 'Matricule',
        accessorKey: 'matricule',
        cell: (props) => (
          <Tag tone="info" className="font-mono">
            {props.row.original.matricule}
          </Tag>
        ),
      },
      {
        header: 'Promotion',
        accessorKey: 'promotion',
        cell: (props) => props.row.original.promotion?.nom || props.row.original.promotionString || '-',
      },
      {
        header: 'Antenne',
        accessorKey: 'antenne',
        cell: (props) => props.row.original.antenne?.nom || props.row.original.antenneId || '-',
      },
      {
        header: 'Filière',
        accessorKey: 'filiere',
        cell: (props) => props.row.original.filiere?.libelle || props.row.original.filiereId || '-',
      },
      {
        header: 'Statut',
        accessorKey: 'statut',
        cell: (props) => {
          const label = props.row.original.statut?.libelle || String(props.row.original.statutId || '-');
          return <Tag tone={getStatusTone(label)}>{label}</Tag>;
        },
      },
      {
        header: 'Créé le',
        accessorKey: 'dateCreation',
        cell: (props) => formatDate(props.row.original.dateCreation),
      },
      {
        header: '',
        id: 'action',
        cell: (props) => (
          <ActionColumn
            onEdit={() => handleEdit(props.row.original)}
            onViewDetail={() => handleViewDetails(props.row.original)}
          />
        ),
      },
    ],
    [],
  );

  const sortedStudents = useMemo(() => {
    const items = [...studentList];
    if (!sort.key || !sort.order) return items;
    return items.sort((a, b) => {
      const result = compareValues(getSortValue(a, sort.key), getSortValue(b, sort.key));
      return sort.order === 'desc' ? -result : result;
    });
  }, [studentList, sort]);

  const paginatedStudents = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [pageIndex, pageSize, sortedStudents]);

  const handleSort = (sortParam: OnSortParam) => {
    setSort(sortParam);
  };

  const handleRowSelect = (checked: boolean, row: Etudiant) => {
    setSelectedStudent(checked, row);
  };

  const handleAllRowSelect = (checked: boolean, rows: Row<Etudiant>[]) => {
    setSelectAllStudent(checked ? rows.map((row) => row.original) : []);
  };

  return (
    <DataTable
      selectable
      columns={columns}
      data={paginatedStudents}
      noData={studentList.length === 0}
      skeletonAvatarColumns={[0]}
      skeletonAvatarProps={{ width: 28, height: 28 }}
      loading={initialLoading}
      pagingData={{
        total: sortedStudents.length,
        pageIndex,
        pageSize,
      }}
      checkboxChecked={(row) => selectedStudents.some((selected) => selected.id === row.id)}
      onPaginationChange={setPageIndex}
      onSelectChange={setPageSize}
      onSort={handleSort}
      onCheckBoxChange={handleRowSelect}
      onIndeterminateCheckBoxChange={handleAllRowSelect}
    />
  );
};

export default StudentListTable;
