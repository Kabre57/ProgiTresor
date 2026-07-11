import React from 'react';
import { UseFormRegister, FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import { GraduationCap, BookOpen, Calendar, Award, MapPin, ShieldCheck, User, Mail, Phone, Home, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InfoItem } from './PortalComponents';
import type { Etudiant } from '@/types/etudiant.types';

export type ProfileInput = {
  email: string;
  telephone: string;
  adresse: string;
};

export type ProfileTabProps = {
  etudiant: Etudiant;
  handleAdminRequest: (type: string) => void;
  register: UseFormRegister<ProfileInput>;
  handleSubmit: UseFormHandleSubmit<ProfileInput>;
  errors: FieldErrors<ProfileInput>;
  isSubmitting: boolean;
  onSubmitProfile: (values: ProfileInput) => void;
};

export function ProfileTab({
  etudiant,
  handleAdminRequest,
  register,
  handleSubmit,
  errors,
  isSubmitting,
  onSubmitProfile,
}: ProfileTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Cursus academique
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <InfoItem label="Matricule" value={etudiant.matricule} icon={<BookOpen className="h-3.5 w-3.5" />} />
          <InfoItem label="Promotion" value={etudiant.promotion?.niveau ? `${etudiant.promotion.niveau} ${etudiant.promotion.ordre}` : (etudiant.promotion?.nom || etudiant.promotionString)} icon={<Calendar className="h-3.5 w-3.5" />} />
          <InfoItem label="Filiere / Niveau" value={etudiant.filiere?.libelle} icon={<Award className="h-3.5 w-3.5" />} />
          <InfoItem label="Antenne" value={etudiant.antenne?.nom} icon={<MapPin className="h-3.5 w-3.5" />} />
          <InfoItem label="Statut" value={etudiant.statut?.libelle} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
          <Button
            className="mt-2"
            variant="default"
            block
            onClick={() => handleAdminRequest('academic')}
          >
            Demander une correction administrative
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Coordonnees personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Email
                </label>
                <Input id="email" type="email" prefix={<Mail className="h-4 w-4" />} {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="telephone" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Telephone
                </label>
                <Input id="telephone" prefix={<Phone className="h-4 w-4" />} {...register('telephone')} />
                {errors.telephone && <p className="mt-1 text-xs text-rose-500">{errors.telephone.message}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="adresse" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Adresse
              </label>
              <Input id="adresse" prefix={<Home className="h-4 w-4" />} {...register('adresse')} />
              {errors.adresse && <p className="mt-1 text-xs text-rose-500">{errors.adresse.message}</p>}
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="solid" loading={isSubmitting} icon={<Save className="h-4 w-4" />}>
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
