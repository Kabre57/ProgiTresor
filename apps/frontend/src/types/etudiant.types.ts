import { z } from 'zod';

export type Antenne = {
  id: number;
  code: string;
  nom: string;
  ville: string;
  actif: boolean;
};

export type Filiere = {
  id: number;
  code: string;
  libelle: string;
  abreviation: string;
};

export type StatutEtudiant = {
  id: number;
  code: string;
  libelle: string;
};

export type Promotion = {
  id: number;
  nom: string;
  ordre: number;
  actif: boolean;
  niveau?: string;
};

export type Etudiant = {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  prefixeMatricule: string | null;
  promotionId: number | null;
  promotionString: string | null;
  antenneId: number;
  filiereId: number;
  statutId: number;
  dateCreation: string;
  photoUrl: string | null;
  matriculeTresorPay: string | null;
  estTemporaire: boolean;
  niveauId?: number | null;
  antenne?: Antenne;
  filiere?: Filiere;
  statut?: StatutEtudiant;
  promotion?: Promotion;
  niveau?: Niveau;
  nomenclatures?: NomenclatureProduit[];
};

export type TypeFlux = {
  id: number;
  code: string;
  libelle: string;
};

export type TypeRecette = {
  id: number;
  code: string;
  libelle: string;
  typeFluxId: number;
  typeFlux?: TypeFlux;
};

export type NomenclatureProduit = {
  id: number;
  codeProduit: string;
  libelle: string;
  typeRecetteId: number;
  niveauId?: number | null;
  filiereId?: number | null;
  montant: number;
  actif: boolean;
  regexPattern?: string | null;
  typeRecette?: TypeRecette;
  niveau?: Niveau | null;
};

export const etudiantFormSchema = z.object({
  matricule: z.string().min(1, "Le matricule est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  antenneId: z.number().positive("L'antenne est requise"),
  filiereId: z.number().positive("La filière est requise"),
  statutId: z.number().positive("Le statut est requis"),
  matriculeTresorPay: z.string().min(1, "Le matricule Trésor Pay est requis"),
  promotionId: z.number().positive("La promotion est requise"),
  photoUrl: z.string().optional().nullable(),
  nomenclatureIds: z.array(z.number()),
});

export type EtudiantFormInput = z.infer<typeof etudiantFormSchema>;

export type Niveau = {
  id: number;
  code: string;
  libelle: string;
  anneeEtude: number;
  filiereId?: number | null;
  filiere?: Filiere;
};

export type ConfigurationFraisNiveau = {
  id: number;
  niveauId: number;
  statutId: number;
  montant: number;
  dateCreation: string;
  dateMiseAJour: string;
};
