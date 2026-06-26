'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import Tag, { type TagTone } from '@/components/ui/Tag';
import Tooltip from '@/components/ui/Tooltip';
import DataTable from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils/format';
import { useEtudiantListStore } from '.@/lib/store/etudiant/etudiantListStore';
import { TbEye, TbPencil } from 'react-icons/tb';
import type { ColumnDef, OnSortParam, Row } from '@/components/shared/DataTable';
import type { Etudiant } from '@/types/etudiant.types';

const getInitials = (etudiant: Etudiant) =>
  `${etudiant.nom?.[0] ?? ''}${etudiant.prenom?.[0] ?? ''}`.toUpperCase() || 'ET';

const getStatusTone = (label?: string): TagTone => {
  const normalized = (label ?? '').toLowerCase();
  if (normalized.includes('actif') || normalized.includes('dipl')) return 'success';
  if (normalized.includes('arr') || normalized.includes('suspend')) return 'warning';
  if (normalized.includes('bloq') || normalized.includes('excl')) return 'danger';
  return 'info';
};

const getSortValue = (etudiant: Etudiant, key: string | number) => {
  switch (String(key)) {
    case 'name':
      return `${etudiant.nom} ${etudiant.prenom}`;
    case 'matricule':
      return etudiant.matricule;
    case 'promotion':
      return etudiant.promotion?.nom || etudiant.promotionString || '';
    case 'antenne':
      return etudiant.antenne?.nom || etudiant.antenneId;
    case 'filiere':
      return etudiant.filiere?.libelle || etudiant.filiereId;
    case 'statut':
      return etudiant.statut?.libelle || etudiant.statutId;
    case 'dateCreation':
      return etudiant.dateCreation;
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
        href={`/etudiant/${encodeURIComponent(row.matricule)}`}
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

const EtudiantListTable = () => {
  const router = useRouter();
  const etudiantList = useEtudiantListStore((state) => state.etudiantList);
  const selectedEtudiants = useEtudiantListStore((state) => state.selectedEtudiants);
  const initialLoading = useEtudiantListStore((state) => state.initialLoading);
  const pageIndex = useEtudiantListStore((state) => state.pageIndex);
  const pageSize = useEtudiantListStore((state) => state.pageSize);
  const sort = useEtudiantListStore((state) => state.sort);
  const setPageIndex = useEtudiantListStore((state) => state.setPageIndex);
  const setPageSize = useEtudiantListStore((state) => state.setPageSize);
  const setSort = useEtudiantListStore((state) => state.setSort);
  const setSelectedEtudiant = useEtudiantListStore((state) => state.setSelectedEtudiant);
  const setSelectAllEtudiant = useEtudiantListStore((state) => state.setSelectAllEtudiant);

  const handleEdit = (etudiant: Etudiant) => {
    router.push(`/etudiant/${encodeURIComponent(etudiant.matricule)}/edit`);
  };

  const handleViewDetails = (etudiant: Etudiant) => {
    router.push(`/etudiant/${encodeURIComponent(etudiant.matricule)}`);
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

  const sortedEtudiants = useMemo(() => {
    const items = [...etudiantList];
    if (!sort.key || !sort.order) return items;
    return items.sort((a, b) => {
      const result = compareValues(getSortValue(a, sort.key), getSortValue(b, sort.key));
      return sort.order === 'desc' ? -result : result;
    });
  }, [etudiantList, sort]);

  const paginatedEtudiants = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return sortedEtudiants.slice(start, start + pageSize);
  }, [pageIndex, pageSize, sortedEtudiants]);

  const handleSort = (sortParam: OnSortParam) => {
    setSort(sortParam);
  };

  const handleRowSelect = (checked: boolean, row: Etudiant) => {
    setSelectedEtudiant(checked, row);
  };

  const handleAllRowSelect = (checked: boolean, rows: Row<Etudiant>[]) => {
    setSelectAllEtudiant(checked ? rows.map((row) => row.original) : []);
  };

  return (
    <DataTable
      selectable
      columns={columns}
      data={paginatedEtudiants}
      noData={etudiantList.length === 0}
      skeletonAvatarColumns={[0]}
      skeletonAvatarProps={{ width: 28, height: 28 }}
      loading={initialLoading}
      pagingData={{
        total: sortedEtudiants.length,
        pageIndex,
        pageSize,
      }}
      checkboxChecked={(row) => selectedEtudiants.some((selected) => selected.id === row.id)}
      onPaginationChange={setPageIndex}
      onSelectChange={setPageSize}
      onSort={handleSort}
      onCheckBoxChange={handleRowSelect}
      onIndeterminateCheckBoxChange={handleAllRowSelect}
    />
  );
};

export default EtudiantListTable;
