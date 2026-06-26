'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Link2,
  Search,
  Edit,
  AlertTriangle,
  Check,
  CheckCircle2,
  Bell,
  RefreshCw,
  GraduationCap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import {
  useStudents,
  useMapTresorPay,
  useTemporaryStudentNotifications,
  useMarkTemporaryStudentNotificationTreated
} from '@/lib/hooks/useStudentQueries';
import { formatDate } from '@/lib/utils/format';

const mappingFormSchema = z.object({
  matriculeTresorPay: z
    .string()
    .trim()
    .min(1, 'Le matricule Trésor Pay est requis'),
});

type MappingFormInput = z.infer<typeof mappingFormSchema>;

export default function AdminMappingPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'mappings' | 'notifications'>('mappings');
  const [searchTerm, setSearchTerm] = useState('');
  const [mappingsPage, setMappingsPage] = useState(1);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const pageSize = 10;
  
  // Modals state
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  
  // Queries & Mutations
  const studentsQuery = useStudents(searchTerm || undefined);
  const notificationsQuery = useTemporaryStudentNotifications();
  const mapTresorPay = useMapTresorPay();
  const markTreated = useMarkTemporaryStudentNotificationTreated();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MappingFormInput>({
    resolver: zodResolver(mappingFormSchema),
  });

  const handleStartEdit = (student: any) => {
    setEditingStudent(student);
    reset({
      matriculeTresorPay: student.matriculeTresorPay || '',
    });
  };

  const onSubmit = async (values: MappingFormInput) => {
    if (!editingStudent) return;
    try {
      await mapTresorPay.mutateAsync({
        matricule: editingStudent.matricule,
        matriculeTresorPay: values.matriculeTresorPay,
      });
      toast.success(`Le matricule Trésor Pay de ${editingStudent.nom} ${editingStudent.prenom} a été enregistré.`);
      setEditingStudent(null);
      studentsQuery.refetch();
      notificationsQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de la mise à jour');
    }
  };

  const handleMarkTreated = async (id: number) => {
    try {
      await markTreated.mutateAsync(id);
      toast.success('Notification marquée comme traitée avec succès.');
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de la mise à jour');
    }
  };

  // Mappings Columns
  const mappingColumns: DataTableColumn<any>[] = [
    {
      key: 'matricule',
      header: 'Matricule Interne',
      render: (row: any) => (
        <span className="font-mono font-semibold text-slate-200">{row.matricule}</span>
      ),
    },
    {
      key: 'nom',
      header: 'Nom Complet',
      render: (row: any) => (
        <span className="font-bold text-white">{row.nom} {row.prenom}</span>
      ),
    },
    {
      key: 'estTemporaire',
      header: 'Type de Compte',
      render: (row: any) => (
        row.estTemporaire ? (
          <Badge tone="danger">
            <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />
            Temporaire
          </Badge>
        ) : (
          <Badge tone="info">
            <GraduationCap className="h-3 w-3 mr-1 shrink-0" />
            Réel
          </Badge>
        )
      ),
    },
    {
      key: 'matriculeTresorPay',
      header: 'Matricule Trésor Pay (Externe)',
      render: (row: any) => (
        row.matriculeTresorPay ? (
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono text-xs border border-amber-500/20">
            {row.matriculeTresorPay}
          </span>
        ) : (
          <span className="text-slate-500">-</span>
        )
      ),
    },
    {
      key: 'antenne',
      header: 'Antenne',
      render: (row: any) => row.antenne?.nom || '-',
    },
    {
      key: 'filiere',
      header: 'Filières',
      render: (row: any) => (
        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
          {row.filiere?.code || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleStartEdit(row)}
          className="flex items-center gap-1 hover:bg-amber-500 hover:text-slate-950"
        >
          <Edit className="h-3 w-3" />
          Associer
        </Button>
      ),
    },
  ];

  // Notifications Columns
  const notificationColumns: DataTableColumn<any>[] = [
    {
      key: 'dateCreation',
      header: 'Date de création',
      render: (row: any) => formatDate(row.dateCreation),
    },
    {
      key: 'matriculeTresorPay',
      header: 'Matricule Externe',
      render: (row: any) => (
        <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-xs text-amber-500 border border-slate-700">
          {row.matriculeTresorPay}
        </span>
      ),
    },
    {
      key: 'nomPayeur',
      header: 'Nom du Payeur Brut',
      render: (row: any) => <span className="font-semibold text-white">{row.nomPayeur}</span>,
    },
    {
      key: 'etudiantTemporaireId',
      header: 'ID Temporaire Créé',
      render: (row: any) => (
        <span className="text-xs text-slate-400">
          ID: {row.etudiantTemporaireId} ({row.etudiantTemporaire?.matricule})
        </span>
      ),
    },
    {
      key: 'traite',
      header: 'Statut',
      render: (row: any) => (
        row.traite ? (
          <Badge tone="success">
            <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
            Traité
          </Badge>
        ) : (
          <Badge tone="warning">
            <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />
            À traiter
          </Badge>
        )
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        !row.traite ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleMarkTreated(row.id)}
              className="text-emerald-500 hover:bg-emerald-500 hover:text-slate-950"
            >
              <Check className="h-3 w-3 mr-1" />
              Traiter
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleStartEdit(row.etudiantTemporaire)}
              className="text-amber-500 hover:bg-amber-500 hover:text-slate-950"
            >
              <Link2 className="h-3 w-3 mr-1" />
              Rattacher
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-500">-</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapping Matricules Trésor Pay"
        description="Associez les identifiants externes Trésor Pay aux fiches étudiants et résolvez les profils temporaires créés à l'import."
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          type="button"
          className={`px-5 py-2.5 border-b-2 text-sm font-medium transition-all duration-150 ${
            activeTab === 'mappings'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('mappings')}
        >
          <GraduationCap className="h-4 w-4 inline mr-1.5" />
          Correspondances Étudiants
        </button>
        <button
          type="button"
          className={`px-5 py-2.5 border-b-2 text-sm font-medium transition-all duration-150 relative ${
            activeTab === 'notifications'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell className="h-4 w-4 inline mr-1.5" />
          Alertes Profils Temporaires
          {(notificationsQuery.data || []).filter((n: any) => !n.traite).length > 0 && (
            <span className="absolute top-1.5 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          )}
        </button>
      </div>

      {activeTab === 'mappings' ? (
        <Card className="border-slate-800/80 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Link2 className="h-5 w-5 text-amber-500" />
              Liste des mappings étudiants
            </CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Rechercher par nom ou matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-950/60 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-amber-500"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <DataTable
              columns={mappingColumns}
              data={(studentsQuery.data || []).slice((mappingsPage - 1) * pageSize, mappingsPage * pageSize)}
              loading={studentsQuery.isLoading}
              getRowKey={(row: any) => row.matricule}
              pagination={{
                currentPage: mappingsPage,
                pageSize: pageSize,
                totalCount: (studentsQuery.data || []).length,
                onPageChange: (p) => setMappingsPage(p),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800/80 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader className="flex justify-between items-center pb-4 border-b border-slate-800">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Journal des signalements étudiants temporaires
            </CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => notificationsQuery.refetch()}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Actualiser
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <DataTable
              columns={notificationColumns}
              data={(notificationsQuery.data || []).slice((notificationsPage - 1) * pageSize, notificationsPage * pageSize)}
              loading={notificationsQuery.isLoading}
              getRowKey={(row: any) => row.id}
              pagination={{
                currentPage: notificationsPage,
                pageSize: pageSize,
                totalCount: (notificationsQuery.data || []).length,
                onPageChange: (p) => setNotificationsPage(p),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Mapping Modal */}
      <Modal
        open={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Configurer le matricule externe Trésor Pay"
        width={500}
      >
        {editingStudent && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm space-y-2">
              <div className="text-slate-400">
                Étudiant : <span className="font-semibold text-white">{editingStudent.nom} {editingStudent.prenom}</span>
              </div>
              <div className="text-slate-400">
                Matricule Interne : <span className="font-mono font-semibold text-amber-500">{editingStudent.matricule}</span>
              </div>
              {editingStudent.estTemporaire && (
                <div className="text-rose-400 text-xs font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Ce profil est temporaire. Mappez-le à un étudiant réel pour fusionner automatiquement toutes ses transactions vers cet étudiant.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="matriculeTresorPay" className="text-sm font-semibold text-slate-300">
                Matricule Trésor Pay Externe
              </label>
              <Input
                id="matriculeTresorPay"
                type="text"
                placeholder="Ex: TP-KOUAME-01"
                className="bg-slate-950/60 border-slate-800 text-white focus:border-amber-500 focus:ring-amber-500"
                {...register('matriculeTresorPay')}
              />
              {errors.matriculeTresorPay && (
                <p className="text-xs text-rose-500 mt-1">{errors.matriculeTresorPay.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingStudent(null)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                loading={isSubmitting || mapTresorPay.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
