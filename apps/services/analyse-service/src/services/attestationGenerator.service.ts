import PDFDocument from 'pdfkit';

const formatMoney = (amount: number) => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(amount);
  return formatted.replace(/[\u202f\u00a0]/g, ' ');
};

const formatDateFrench = (date: Date | string) => {
  const d = new Date(date);
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const generateAttestationPDF = async (
  student: any,
  transactions: any[]
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header ScolarPaie
    doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold').text('ScolarPaie • ERP FINANCIER', { align: 'left' });
    doc.moveDown(2);

    // Title
    doc.fontSize(16).fillColor('#1E293B').font('Helvetica-Bold').text('ATTESTATION DE RÈGLEMENT DE SCOLARITÉ', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor('#64748B').font('Helvetica').text(`Généré le ${formatDateFrench(new Date())}`, { align: 'center' });
    doc.moveDown(2);

    // Certify statement
    doc.fontSize(11).fillColor('#1E293B').font('Helvetica').text(
      `Nous, soussignés, Direction Comptable et Financière, certifions par la présente que l'étudiant :`,
      { align: 'left' }
    );
    doc.moveDown(1);

    const startX = doc.page.margins.left;
    let y = doc.y;

    // Student Info Card Box
    const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const boxHeight = 100;
    doc.lineWidth(0.8).strokeColor('#CBD5E1'); // Slate-300
    doc.rect(startX, y, boxWidth, boxHeight).stroke();

    // Fill details
    const textX = startX + 15;
    const col2X = startX + boxWidth / 2 + 10;
    
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E293B');
    doc.text('Matricule :', textX, y + 15);
    doc.font('Helvetica').fillColor('#475569');
    doc.text(student.matricule || 'N/A', textX + 80, y + 15);

    doc.font('Helvetica-Bold').fillColor('#1E293B');
    doc.text('Nom :', textX, y + 35);
    doc.font('Helvetica').fillColor('#475569');
    doc.text(student.nom || 'N/A', textX + 80, y + 35);

    doc.font('Helvetica-Bold').fillColor('#1E293B');
    doc.text('Prénoms :', textX, y + 55);
    doc.font('Helvetica').fillColor('#475569');
    doc.text(student.prenom || 'N/A', textX + 80, y + 55);

    doc.font('Helvetica-Bold').fillColor('#1E293B');
    doc.text('Antenne :', textX, y + 75);
    doc.font('Helvetica').fillColor('#475569');
    doc.text(student.antenne?.libelle || 'N/A', textX + 80, y + 75);

    // Column 2
    doc.font('Helvetica-Bold').fillColor('#1E293B');
    doc.text('Niveau :', col2X, y + 15);
    doc.font('Helvetica').fillColor('#475569');
    doc.text(student.niveau?.libelle || 'N/A', col2X + 80, y + 15);

    doc.font('Helvetica-Bold').fillColor('#1E293B');
    doc.text('Filière :', col2X, y + 35);
    doc.font('Helvetica').fillColor('#475569');
    doc.text(student.niveau?.filiere?.libelle || 'N/A', col2X + 80, y + 35);

    doc.font('Helvetica-Bold').fillColor('#1E293B');
    doc.text('Statut :', col2X, y + 55);
    doc.font('Helvetica').fillColor('#475569');
    doc.text(student.statut?.libelle || 'N/A', col2X + 80, y + 55);

    doc.font('Helvetica-Bold').fillColor('#1E293B');
    doc.text('Promotion :', col2X, y + 75);
    doc.font('Helvetica').fillColor('#475569');
    doc.text(student.promotion?.nom || student.promotionString || 'N/A', col2X + 80, y + 75);

    doc.y = y + boxHeight + 20;
    doc.moveDown(0.5);

    // Certification statement
    doc.font('Helvetica').fontSize(11).fillColor('#1E293B').text(
      `est à jour de l'intégralité de ses frais de scolarité obligatoires pour son niveau d'études.`,
      { align: 'left' }
    );
    doc.moveDown(1.5);

    // History Title
    doc.font('Helvetica-Bold').fontSize(12).text('Historique des Versements Classés', { align: 'left' });
    doc.moveDown(0.5);

    // Table Header
    y = doc.y;
    const tableCols = [
      { label: 'Date', width: 100 },
      { label: 'Référence / Code OT', width: 150 },
      { label: 'Libellé Produit', width: 165 },
      { label: 'Montant', width: 100, align: 'right' }
    ];

    let currentX = startX;
    tableCols.forEach(col => {
      doc.save()
         .fillColor('#F1F5F9')
         .rect(currentX, y, col.width, 20)
         .fill()
         .strokeColor('#CBD5E1')
         .lineWidth(0.5)
         .rect(currentX, y, col.width, 20)
         .stroke();

      doc.fillColor('#1E293B')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(col.label, currentX + 5, y + 5, { width: col.width - 10, align: (col.align as any) || 'left' });
      currentX += col.width;
    });

    y += 20;

    // Table Rows
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime());
    let totalPaid = 0;

    sortedTransactions.forEach(tx => {
      currentX = startX;
      const rowHeight = 20;
      const formattedDate = formatDateFrench(tx.dateHeure);
      const codeOt = tx.codeOt || tx.reference || 'N/A';
      const libelle = (tx.nomenclature as any)?.libelleStandard || tx.libelleProduitBrut || 'Scolarité';
      const amount = Number(tx.montant);
      totalPaid += amount;

      const rowCols = [
        { text: formattedDate, width: 100 },
        { text: codeOt, width: 150 },
        { text: libelle, width: 165 },
        { text: `${formatMoney(amount)} FCFA`, width: 100, align: 'right' }
      ];

      rowCols.forEach(col => {
        doc.save()
           .strokeColor('#CBD5E1')
           .lineWidth(0.5)
           .rect(currentX, y, col.width, rowHeight)
           .stroke();

        doc.fillColor('#475569')
           .font('Helvetica')
           .fontSize(8.5)
           .text(col.text, currentX + 5, y + 5, { width: col.width - 10, align: (col.align as any) || 'left' });
        currentX += col.width;
      });

      y += rowHeight;
    });

    // Total Row
    currentX = startX;
    doc.save()
       .fillColor('#F8FAFC')
       .rect(startX, y, boxWidth - 100, 20)
       .fill()
       .strokeColor('#CBD5E1')
       .rect(startX, y, boxWidth - 100, 20)
       .stroke();

    doc.fillColor('#1E293B')
       .font('Helvetica-Bold')
       .fontSize(9)
       .text('TOTAL PAYÉ', startX + 5, y + 5);

    doc.rect(startX + boxWidth - 100, y, 100, 20)
       .stroke();

    doc.fillColor('#1E293B')
       .font('Helvetica-Bold')
       .fontSize(9)
       .text(`${formatMoney(totalPaid)} FCFA`, startX + boxWidth - 95, y + 5, { width: 90, align: 'right' });

    y += 40;

    // Signature Area
    const sigY = y;
    doc.fontSize(10).fillColor('#1E293B');
    doc.font('Helvetica').text('Fait à Abidjan, le ' + formatDateFrench(new Date()), startX + 300, sigY);
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Pour la Direction Financière', startX + 300, sigY + 15);
    
    // Digital Stamp / Signature stamp
    doc.save()
       .strokeColor('#2B6CB0')
       .lineWidth(1.5)
       .rect(startX + 320, sigY + 35, 140, 50)
       .stroke();
    
    doc.fillColor('#2B6CB0')
       .font('Helvetica-Bold')
       .fontSize(8.5)
       .text('ScolarPaie', startX + 330, sigY + 45, { align: 'center', width: 120 });
    
    doc.fontSize(7.5)
       .font('Helvetica')
       .text('CACHET NUMÉRIQUE DE VALIDATION', startX + 330, sigY + 60, { align: 'center', width: 120 });

    doc.end();
  });
};
