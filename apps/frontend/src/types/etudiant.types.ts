import { z } from 'zod';

export type Antenne = {
  id: number;
  code: string;
  nom: string;
  ville: string;
  actif: boolean;
};

export type Niveau = {
  id: number;
  code: string;
  libelle: string;
  cycle: string;
  anneeEtude: number;
  filiereId?: number | null;
  filiere?: Filiere | null;
};

export type Filiere = {
  id: number;
  code: string;
  libelle: string;
  niveauId: number;
  niveau?: Niveau;
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
  niveauId: number;
  filiereId: number | null;
  statutId: number;
  dateCreation: string;
  photoUrl: string | null;
  matriculeTresorPay: string | null;
  estTemporaire: boolean;
  antenne?: Antenne;
  niveau?: Niveau;
  filiere?: Filiere | null;
  statut?: StatutEtudiant;
  promotion?: Promotion;
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
  libelleBrut: string;
  codeProduit: string;
  libelleStandard: string;
  typeRecetteId: number;
  niveauId: number | null;
  filiereId: number | null;
  statutId: number | null;
  numVersement: number | null;
  montant: number;
  actif: boolean;
  regexPattern?: string | null;
  typeRecette?: TypeRecette;
  niveau?: Niveau | null;
  filiere?: Filiere | null;
  statut?: StatutEtudiant | null;
};

export type ConfigurationFraisNiveau = {
  id: number;
  nomenclatureProduitId: number;
  nomenclatureProduit?: NomenclatureProduit;
  niveauId: number;
  niveau?: Niveau;
  statutEtudiantId: number;
  statutEtudiant?: StatutEtudiant;
  montantSpecifique: number | null;
  estObligatoire: boolean;
  dateDebutValidite: string;
  dateFinValidite: string | null;
};

export const etudiantFormSchema = z.object({
  matricule: z.string().min(1, "Le matricule est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  antenneId: z.number().positive("L'antenne est requise"),
  niveauId: z.number().positive("Le niveau est requis"),
  filiereId: z.number().positive("La filière est requise").optional().nullable(),
  statutId: z.number().positive("Le statut est requis"),
  matriculeTresorPay: z.string().min(1, "Le matricule Trésor Pay est requis"),
  promotionId: z.number().positive("La promotion est requise"),
  photoUrl: z.string().optional().nullable(),
});

export type EtudiantFormInput = z.infer<typeof etudiantFormSchema>;
