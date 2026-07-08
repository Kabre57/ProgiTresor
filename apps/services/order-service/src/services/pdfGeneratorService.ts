import PDFDocument from 'pdfkit';
import { http, ETUDIANT_SERVICE_URL } from '../utils/httpClient';
import logger from '../utils/logger';

interface OrdreTraitementData {
  codeOt: string;
  antenneId: number;
  niveauId: number;
  typeRecetteId: number;
  montantCumule: bigint | number | string;
  nombreFlux: number;
  statut: string;
}

interface SyntheseOTData {
  reference: string;
  periodeDebut: Date | string;
  periodeFin: Date | string;
  nbTransactions: number;
  montantTotal: bigint | number | string;
  ordresTraitement: OrdreTraitementData[];
}

const fetchReferentialMaps = async () => {
  const antenneMap = new Map<number, string>();
  const niveauMap = new Map<number, string>();
  const typeRecetteMap = new Map<number, string>();

  try {
    const [antennesRes, niveauxRes, typeRecettesRes] = await Promise.all([
      http.get(`${ETUDIANT_SERVICE_URL}/antennes`),
      http.get(`${ETUDIANT_SERVICE_URL}/niveaux`),
      http.get(`${ETUDIANT_SERVICE_URL}/types-recettes`),
    ]);

    if (Array.isArray(antennesRes.data)) {
      antennesRes.data.forEach((a: { id: number; nom?: string; libelle?: string }) => {
        antenneMap.set(a.id, a.nom || a.libelle || `Antenne #${a.id}`);
      });
    }

    if (Array.isArray(niveauxRes.data)) {
      niveauxRes.data.forEach((n: { id: number; libelle?: string }) => {
        niveauMap.set(n.id, n.libelle || `Niveau #${n.id}`);
      });
    }

    if (Array.isArray(typeRecettesRes.data)) {
      typeRecettesRes.data.forEach((t: { id: number; nom?: string; libelle?: string }) => {
        typeRecetteMap.set(t.id, t.nom || t.libelle || `Recette #${t.id}`);
      });
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to load referential maps for PDF generation');
  }

  return { antenneMap, niveauMap, typeRecetteMap };
};

/**
 * Génère le PDF de synthèse de l'OT.
 */
export const generateSynthesePdf = async (synthese: SyntheseOTData): Promise<Buffer> => {
  const { antenneMap, niveauMap, typeRecetteMap } = await fetchReferentialMaps();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // --- Header ---
    doc.fillColor('#1E3A8A').fontSize(20).text('Synthèse des Recettes Hors Budget', { align: 'center' });
    doc.moveDown();

    doc.strokeColor('#2563EB').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // --- Info Card ---
    doc.fillColor('#1F2937').fontSize(11);
    doc.text(`Référence : ${synthese.reference}`);

    const startStr = new Date(synthese.periodeDebut).toLocaleDateString('fr-FR');
    const endStr = new Date(synthese.periodeFin).toLocaleDateString('fr-FR');
    doc.text(`Période d'Analyse : du ${startStr} au ${endStr}`);

    doc.text(`Date Génération : ${new Date().toLocaleDateString('fr-FR')}`);
    doc.text('Auteur / Service : Direction Comptable & Financière');
    doc.moveDown(2);

    // --- Table Headers ---
    const startY = doc.y;
    doc.fillColor('#1E3A8A').fontSize(10);
    doc.text('Code OT', 50, startY, { width: 100 });
    doc.text('Antenne', 150, startY, { width: 100 });
    doc.text('Niveau', 250, startY, { width: 80 });
    doc.text('Recette', 330, startY, { width: 100 });
    doc.text('Montant (XOF)', 430, startY, { width: 80, align: 'right' });
    doc.text('Flux', 510, startY, { width: 35, align: 'right' });

    doc.moveDown();
    doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // --- Table Data ---
    doc.fillColor('#374151');
    for (const op of synthese.ordresTraitement) {
      const currentY = doc.y;

      // Page break check
      if (currentY > 700) {
        doc.addPage();
        // Reprint table headers
        const headerY = doc.y;
        doc.fillColor('#1E3A8A');
        doc.text('Code OT', 50, headerY, { width: 100 });
        doc.text('Antenne', 150, headerY, { width: 100 });
        doc.text('Niveau', 250, headerY, { width: 80 });
        doc.text('Recette', 330, headerY, { width: 100 });
        doc.text('Montant (XOF)', 430, headerY, { width: 80, align: 'right' });
        doc.text('Flux', 510, headerY, { width: 35, align: 'right' });
        doc.moveDown();
        doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fillColor('#374151');
      }

      const rowY = doc.y;
      const antLabel = antenneMap.get(Number(op.antenneId)) || `Antenne #${op.antenneId}`;
      const nivLabel = niveauMap.get(Number(op.niveauId)) || `Niveau #${op.niveauId}`;
      const recLabel = typeRecetteMap.get(Number(op.typeRecetteId)) || `Recette #${op.typeRecetteId}`;
      const formattedMontant = Number(op.montantCumule).toLocaleString('fr-FR');

      doc.text(op.codeOt, 50, rowY, { width: 100 });
      doc.text(antLabel, 150, rowY, { width: 100 });
      doc.text(nivLabel, 250, rowY, { width: 80 });
      doc.text(recLabel, 330, rowY, { width: 100 });
      doc.text(formattedMontant, 430, rowY, { width: 80, align: 'right' });
      doc.text(String(op.nombreFlux), 510, rowY, { width: 35, align: 'right' });

      doc.moveDown();
      doc.strokeColor('#F3F4F6').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
    }

    doc.moveDown();

    // --- Total row ---
    const totalY = doc.y;
    doc.fillColor('#111827').fontSize(10);
    doc.text('TOTAL GÉNÉRAL', 50, totalY, { width: 280 });
    doc.text(Number(synthese.montantTotal).toLocaleString('fr-FR'), 430, totalY, { width: 80, align: 'right' });
    doc.text(String(synthese.nbTransactions), 510, totalY, { width: 35, align: 'right' });

    doc.end();
  });
};
