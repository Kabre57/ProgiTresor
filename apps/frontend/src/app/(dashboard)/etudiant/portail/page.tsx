'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Save, CreditCard, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { useStudentMe, useMapTresorPay } from '@/lib/hooks/useStudentQueries';
import { Spinner } from '@/components/ui/Spinner';

const mappingSchema = z.object({
  matriculeTresorPay: z
    .string()
    .trim()
    .min(1, 'Le matricule Trésor Pay est requis pour la mise à jour'),
});

type MappingInput = z.infer<typeof mappingSchema>;

export default function StudentPortalPage() {
  const toast = useToast();
  const { data: student, isLoading, refetch } = useStudentMe();
  const mapTresorPay = useMapTresorPay();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MappingInput>({
    resolver: zodResolver(mappingSchema),
  });

  const onSubmit = async (values: MappingInput) => {
    try {
      await mapTresorPay.mutateAsync({
        matriculeTresorPay: values.matriculeTresorPay,
      });
      toast.success('Votre matricule Trésor Pay a été enregistré avec succès !');
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de la mise à jour');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-10 w-10 text-amber-500" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 text-center">
        <Card className="max-w-md mx-auto border-rose-500/20 bg-rose-50/5 dark:bg-rose-950/5">
          <CardContent className="pt-6">
            <Info className="h-12 w-12 mx-auto text-rose-500 mb-4" />
            <h3 className="text-lg font-bold text-rose-800 dark:text-rose-400 mb-2">Profil non trouvé</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Aucun profil étudiant ne correspond à votre identifiant de connexion actuel. Veuillez contacter l'administration de l'école.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        title="Portail Étudiant"
        description="Gérez votre dossier et associez votre matricule Trésor Pay pour le suivi de vos paiements."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1 border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all duration-500">
            <GraduationCap className="h-32 w-32 -mr-8 -mt-8 text-amber-500" />
          </div>
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-500" />
              Mon Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 relative z-10">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nom complet</label>
              <p className="text-base font-bold text-white mt-0.5">{student.nom} {student.prenom}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Matricule interne</label>
              <p className="text-base font-semibold text-slate-200 mt-0.5">{student.matricule}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Antenne</label>
              <p className="text-sm text-slate-300 mt-0.5">{student.antenne?.nom || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filières</label>
              <p className="text-sm text-slate-300 mt-0.5">{student.filiere?.libelle || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</label>
              <p className="text-sm text-slate-300 mt-0.5">{student.statut?.libelle || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Action / Form Card */}
        <Card className="md:col-span-2 border-slate-800/80 bg-slate-900/40 backdrop-blur-md shadow-xl">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Rattachement Trésor Pay
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-300">
              <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white">Pourquoi associer votre matricule ?</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Le matricule Trésor Pay est requis pour faire le lien entre les paiements effectués sur la plateforme externe Trésor Pay et votre dossier au sein de l'école. Saisir ce matricule permet de valider automatiquement vos frais de scolarité.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="matriculeTresorPay" className="text-sm font-semibold text-slate-300">
                  Matricule Trésor Pay (Externe)
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-4 w-4 text-slate-500" />
                  </div>
                  <Input
                    id="matriculeTresorPay"
                    type="text"
                    placeholder="Saisissez votre matricule externe (ex: TP-XXXXXX)"
                    className="pl-10 bg-slate-950/60 border-slate-800 text-white focus:border-amber-500 focus:ring-amber-500"
                    defaultValue={student.matriculeTresorPay || ''}
                    {...register('matriculeTresorPay')}
                  />
                </div>
                {errors.matriculeTresorPay && (
                  <p className="text-xs text-rose-500 mt-1">{errors.matriculeTresorPay.message}</p>
                )}
              </div>

              {student.matriculeTresorPay ? (
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-semibold py-1">
                  <span>✓ Matricule actuellement configuré : </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 font-mono border border-emerald-500/20">{student.matriculeTresorPay}</span>
                </div>
              ) : (
                <div className="text-amber-500 text-xs font-semibold py-1">
                  ⚠ Aucun matricule Trésor Pay n'est configuré pour le moment.
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <Button
                  type="submit"
                  loading={isSubmitting || mapTresorPay.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  Enregistrer mon matricule
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
