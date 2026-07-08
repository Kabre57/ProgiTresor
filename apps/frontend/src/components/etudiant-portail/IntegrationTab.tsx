import React from 'react';
import { UseFormRegister, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { PlugZap, Save, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InfoItem } from './PortalComponents';
import type { Etudiant } from '@/types/etudiant.types';

export type MappingInput = {
  matriculeTresorPay: string;
};

export type IntegrationTabProps = {
  etudiant: Etudiant;
  isEditingMatricule: boolean;
  setIsEditingMatricule: (val: boolean) => void;
  register: UseFormRegister<MappingInput>;
  handleSubmit: UseFormHandleSubmit<MappingInput>;
  errors: FieldErrors<MappingInput>;
  isSubmitting: boolean;
  onSubmitMapping: (values: MappingInput) => Promise<void>;
  mapTresorPayPending: boolean;
};

export function IntegrationTab({
  etudiant,
  isEditingMatricule,
  setIsEditingMatricule,
  register,
  handleSubmit,
  errors,
  isSubmitting,
  onSubmitMapping,
  mapTresorPayPending,
}: IntegrationTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" />
            Liaison Tresor Pay
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {etudiant.matriculeTresorPay && !isEditingMatricule ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Identifiant lie
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-gray-900 dark:text-gray-50">
                {etudiant.matriculeTresorPay}
              </p>
              <Button className="mt-4" size="sm" variant="default" onClick={() => setIsEditingMatricule(true)}>
                Modifier
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmitMapping)} className="space-y-4">
              <div>
                <label htmlFor="matriculeTresorPay" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Matricule Tresor Pay
                </label>
                <Input
                  id="matriculeTresorPay"
                  placeholder="TP-KOUAME-01"
                  defaultValue={etudiant.matriculeTresorPay || ''}
                  {...register('matriculeTresorPay')}
                />
                {errors.matriculeTresorPay && (
                  <p className="mt-1 text-xs text-rose-500">{errors.matriculeTresorPay.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                {etudiant.matriculeTresorPay && (
                  <Button type="button" variant="default" onClick={() => setIsEditingMatricule(false)}>
                    Annuler
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="solid"
                  loading={isSubmitting || mapTresorPayPending}
                  icon={<Save className="h-4 w-4" />}
                >
                  Enregistrer
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Effet de l'integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoItem label="Rapprochement" value="Les paiements Tresor Pay peuvent etre rattaches au dossier etudiant." />
          <InfoItem label="Solde" value="Les transactions validees alimentent le reste a payer." />
          <InfoItem label="Export" value="Les donnees restent compatibles avec les exports comptables." />
        </CardContent>
      </Card>
    </div>
  );
}
