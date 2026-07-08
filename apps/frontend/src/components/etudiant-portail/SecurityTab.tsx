import React from 'react';
import { LockKeyhole, User, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { InfoItem, StatusPill } from './PortalComponents';
import type { Etudiant } from '@/types/etudiant.types';

export type SecurityTabProps = {
  etudiant: Etudiant;
};

export function SecurityTab({ etudiant }: SecurityTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-primary" />
            Securite du compte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoItem label="Identifiant" value={etudiant.matricule} icon={<User className="h-3.5 w-3.5" />} />
          <InfoItem label="Session" value="Session active sur ce navigateur" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Mot de passe</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              La modification du mot de passe doit etre raccordee au service d'authentification.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Profil etudiant</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lie a la base Etudiant</p>
            </div>
            <StatusPill status="AFFECTE" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Tresor Pay</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Matricule externe</p>
            </div>
            <StatusPill status={etudiant.matriculeTresorPay ? 'AFFECTE' : 'EN_ATTENTE'} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
