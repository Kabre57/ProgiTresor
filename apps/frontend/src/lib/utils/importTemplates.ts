import * as XLSX from 'xlsx';
import { etudiantApi, type ReferentialEndpoint } from '@/lib/api/etudiantApi';

type TemplateKind = ReferentialEndpoint | 'etudiants' | 'transactions';

const headers: Partial<Record<TemplateKind, string[]>> = {
  etudiants: ['Matricule', 'Nom', 'Prénom', 'Antenne', 'Filière', 'Statut', 'Promotion', 'Niveau', 'Matricule Trésor Pay'],
  transactions: ['reference', 'date', 'montant', 'matricule', 'payeur', 'produit'],
  promotions: ['Nom', 'Ordre', 'Niveau'],
  antennes: ['Code', 'Nom', 'Ville'],
  filieres: ['Code', 'Libellé', 'Abréviation'],
  'statuts-etudiants': ['Code', 'Libellé'],
  'types-flux': ['Code', 'Libellé'],
  'types-recettes': ['Code', 'Libellé', 'Flux'],
  nomenclatures: ['Code produit', 'Libellé', 'Type de recette', 'Flux', 'Montant'],
};

type ReferenceSheet = { endpoint: ReferentialEndpoint; name: string; columns: [string, string][] };
const referenceSheets: ReferenceSheet[] = [
  { endpoint: 'antennes', name: 'Antennes', columns: [['code', 'Code'], ['nom', 'Nom']] },
  { endpoint: 'filieres', name: 'Filières', columns: [['code', 'Code'], ['libelle', 'Libellé'], ['abreviation', 'Abréviation']] },
  { endpoint: 'statuts-etudiants', name: 'Statuts', columns: [['code', 'Code'], ['libelle', 'Libellé']] },
  { endpoint: 'promotions', name: 'Promotions', columns: [['nom', 'Nom'], ['niveau', 'Niveau'], ['ordre', 'Ordre']] },
  { endpoint: 'types-flux', name: 'Flux', columns: [['code', 'Code'], ['libelle', 'Libellé']] },
  { endpoint: 'types-recettes', name: 'Types de recettes', columns: [['code', 'Code'], ['libelle', 'Libellé'], ['typeFlux.libelle', 'Flux']] },
  { endpoint: 'nomenclatures', name: 'Nomenclatures', columns: [['codeProduit', 'Code produit'], ['libelle', 'Libellé'], ['typeRecette.libelle', 'Type de recette'], ['typeRecette.typeFlux.libelle', 'Flux']] },
];

export async function downloadImportTemplate(kind: TemplateKind): Promise<void> {
  const columns = headers[kind];
  if (!columns) throw new Error('Modèle Excel indisponible pour ce référentiel.');
  const required: ReferentialEndpoint[] = kind === 'etudiants'
    ? ['antennes', 'filieres', 'statuts-etudiants', 'promotions']
    : kind === 'transactions' ? []
    : kind === 'nomenclatures' ? ['types-recettes', 'types-flux']
    : kind === 'types-recettes' ? ['types-flux'] : [];
  const references = await Promise.all(required.map(async endpoint => ({
    sheet: referenceSheets.find(sheet => sheet.endpoint === endpoint)!,
    values: await etudiantApi.listReferential(endpoint),
  })));
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([columns]);
  dataSheet['!cols'] = columns.map(column => ({ wch: Math.max(20, column.length + 3) }));
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Données à remplir');
  const instructions = [
    ['Consigne'],
    ['Remplir la première feuille, sous les en-têtes. Les autres feuilles servent de référence.'],
    ['Utiliser les noms, libellés ou codes métier des feuilles de référence.'],
    ['Ne pas saisir de numéro interne de base de données.'],
    ['Si une valeur est inconnue ou ambiguë, la ligne est signalée pour correction.'],
  ];
  if (kind === 'etudiants') instructions.push(
    ['Antenne, Filière, Statut et Promotion sont obligatoires.'],
    ['Préciser le Niveau si plusieurs promotions portent le même nom.'],
    ['Matricule Trésor Pay est facultatif ; à défaut, le matricule étudiant est utilisé.'],
  );
  if (kind === 'nomenclatures') instructions.push(['Préciser le Flux ou le code du type de recette si son libellé existe plusieurs fois.']);
  if (kind === 'transactions') instructions.push(
    ['Les six colonnes reference, date, montant, matricule, payeur et produit sont obligatoires.'],
    ['Date : date Excel, AAAA-MM-JJ ou JJ/MM/AAAA. Montant : nombre entier positif en FCFA.'],
    ['Le matricule doit correspondre à un étudiant ou à un matricule Trésor Pay déjà associé.'],
    ['Produit : utiliser le libellé ou le code d’une nomenclature active pour le rattachement automatique.'],
  );
  const helpSheet = XLSX.utils.aoa_to_sheet(instructions);
  helpSheet['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(workbook, helpSheet, 'Instructions');
  for (const { sheet, values } of references) {
    const records = values as unknown as Record<string, unknown>[];
    const rows = records.map(record => sheet.columns.map(([field]) => {
      const value = field.split('.').reduce<unknown>((value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : '', record);
      return typeof value === 'number' ? value : String(value ?? '');
    }));
    const reference = XLSX.utils.aoa_to_sheet([sheet.columns.map(([, label]) => label), ...rows]);
    reference['!cols'] = sheet.columns.map(() => ({ wch: 35 }));
    XLSX.utils.book_append_sheet(workbook, reference, sheet.name);
  }
  XLSX.writeFile(workbook, `modele_${kind}.xlsx`);
}
