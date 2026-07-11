import PDFDocument from 'pdfkit';
import type { SynthesisLine } from './aggregation.service';

const formatMoney = (amount: number) => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(amount);
  // Replace narrow non-breaking space (\u202f) and non-breaking space (\u00a0) with regular space (\u0020)
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

const formatPeriodText = (start: string | Date, end: string | Date) => {
  const dStart = new Date(start);
  const dEnd = new Date(end);
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  if (dStart.getFullYear() === dEnd.getFullYear()) {
    if (dStart.getMonth() === dEnd.getMonth()) {
      return `${months[dStart.getMonth()]} ${dStart.getFullYear()}`;
    }
    return `${months[dStart.getMonth()]} - ${months[dEnd.getMonth()]} ${dStart.getFullYear()}`;
  }
  return `${months[dStart.getMonth()]} ${dStart.getFullYear()} - ${months[dEnd.getMonth()]} ${dEnd.getFullYear()}`;
};

const normalizeFluxLabel = (value: unknown): string => String(value ?? '')
  .trim()
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ');

const isBudgetFlux = (typeFluxLabel?: string | null) => {
  const label = normalizeFluxLabel(typeFluxLabel);
  if (label.includes('HORS BUDGET')) return false;
  if (label.includes('BUDGET')) return true;
  return false;
};

interface WriteCellOptions {
  align?: 'left' | 'center' | 'right';
  fillColor?: string;
  textColor?: string;
  bold?: boolean;
}

const writeCell = (
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: WriteCellOptions = {},
) => {
  doc.save();
  
  // Fill background if specified
  if (options.fillColor) {
    doc.fillColor(options.fillColor).rect(x, y, width, height).fill();
  }
  
  // Stroke border
  doc.lineWidth(0.5).strokeColor('#CBD5E1'); // Slate-300
  doc.rect(x, y, width, height).stroke();
  
  // Write text
  doc.fillColor(options.textColor || '#1E293B');
  if (options.bold) {
    doc.font('Helvetica-Bold');
  } else {
    doc.font('Helvetica');
  }
  
  // Padding top of 6 is safe for wrapping text (like Code OT)
  const textY = y + 6;
  
  doc.text(text, x + 6, textY, {
    width: width - 12,
    height: height - 10,
    ellipsis: true,
    align: options.align || 'left',
  });
  
  doc.restore();
};

export const generateSynthesisPDF = async (
  aggregationData: SynthesisLine[],
  opCode: string,
  typeFluxId: number,
  periodeDebut: string | Date,
  periodeFin: string | Date,
  typeFluxLabel?: string | null,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 32, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const totalAmount = aggregationData.reduce((sum, line) => sum + line.montantCumule, 0);
    const totalFlux = aggregationData.reduce((sum, line) => sum + line.nombreFlux, 0);
    const isBudget = isBudgetFlux(typeFluxLabel);
    const displayFluxLabel = typeFluxLabel || `Flux #${typeFluxId}`;

    // Header header ScolarPaie
    doc.fontSize(8.5).fillColor('#64748B').font('Helvetica-Bold').text('ScolarPaie • ERP FINANCIER', { align: 'left' });
    doc.moveDown(0.5);
    
    // Main Title
    const titleText = `Synthèse des Recettes ${displayFluxLabel}`;
    doc.fontSize(15).fillColor('#1E293B').font('Helvetica-Bold').text(titleText, { align: 'center' });
    doc.moveDown(0.2);
    
    // Reference sub-header
    doc.fontSize(8.5).fillColor('#64748B').font('Helvetica').text(`Référence : ${opCode}`, { align: 'center' });
    doc.moveDown(0.8);

    const startX = doc.page.margins.left;
    let y = doc.y;

    // 1. Draw 4-column Metadata Block
    const blockWidth = 531;
    const blockHeight = 44; // 2 rows of 22pt
    
    const w1 = 90;
    const w2 = 215;
    const w3 = 95;
    const w4 = 131;

    doc.lineWidth(0.5).strokeColor('#CBD5E1'); // Slate-300
    doc.rect(startX, y, blockWidth, blockHeight).stroke();
    
    // Draw vertical dividers
    doc.moveTo(startX + w1, y).lineTo(startX + w1, y + blockHeight).stroke();
    doc.moveTo(startX + w1 + w2, y).lineTo(startX + w1 + w2, y + blockHeight).stroke();
    doc.moveTo(startX + w1 + w2 + w3, y).lineTo(startX + w1 + w2 + w3, y + blockHeight).stroke();
    
    // Draw horizontal divider
    doc.moveTo(startX, y + blockHeight / 2).lineTo(startX + blockWidth, y + blockHeight / 2).stroke();
    
    // Row 1
    // Cell 1: Période d'Analyse label
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B');
    doc.text("Période d'Analyse :", startX + 6, y + 6, { width: w1 - 12 });
    
    // Cell 2: Période d'Analyse value
    doc.font('Helvetica').fontSize(8).fillColor('#475569');
    doc.text(`${formatPeriodText(periodeDebut, periodeFin)} (Fichiers Trésor Pay)`, startX + w1 + 6, y + 6, { width: w2 - 12 });
    
    // Cell 3: Date Génération label
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B');
    doc.text("Date Génération :", startX + w1 + w2 + 6, y + 6, { width: w3 - 12 });
    
    // Cell 4: Date Génération value
    doc.font('Helvetica').fontSize(8).fillColor('#475569');
    doc.text(formatDateFrench(new Date()), startX + w1 + w2 + w3 + 6, y + 6, { width: w4 - 12 });
    
    // Row 2 (y offset + 22)
    // Cell 1: Statut des Flux label
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B');
    doc.text("Statut des Flux :", startX + 6, y + 22 + 6, { width: w1 - 12 });
    
    // Cell 2: Statut des Flux value (with badge color)
    const statusText = normalizeFluxLabel(displayFluxLabel);
    const statusColor = isBudget ? '#2B6CB0' : '#D69E2E'; // blue / orange
    doc.font('Helvetica-Bold').fontSize(8).fillColor(statusColor);
    doc.text(statusText, startX + w1 + 6, y + 22 + 6);
    
    const statusWidth = doc.widthOfString(statusText);
    doc.font('Helvetica').fontSize(8).fillColor('#475569');
    doc.text(' (En attente de reversement)', startX + w1 + 6 + statusWidth + 2, y + 22 + 6, { width: w2 - statusWidth - 14 });
    
    // Cell 3: Auteur / Service label
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B');
    doc.text("Auteur / Service :", startX + w1 + w2 + 6, y + 22 + 6, { width: w3 - 12 });
    
    // Cell 4: Auteur / Service value
    doc.font('Helvetica').fontSize(8).fillColor('#475569');
    doc.text('Direction Comptable & Financière', startX + w1 + w2 + w3 + 6, y + 22 + 6, { width: w4 - 12 });
    
    y += blockHeight + 20;

    // Section 1 label
    doc.fontSize(10).fillColor('#1E293B').font('Helvetica-Bold').text('1. Agrégation par antenne, filière et type de recette', startX, y);
    y += 18;

    // Table Column Definitions
    const columns = [
      { label: 'CODE OT', width: 90, align: 'left' as const },
      { label: 'ANTENNE (INFAS)', width: 80, align: 'left' as const },
      { label: 'FILIÈRE', width: 80, align: 'left' as const },
      { label: 'TYPE DE RECETTE (FLUX)', width: 110, align: 'left' as const },
      { label: 'MONTANT CUMULÉ (XOF)', width: 95, align: 'right' as const },
      { label: 'NBR TRANSACTIONS', width: 76, align: 'right' as const },
    ];
    const rowHeight = 34;

    // Draw Blue Header Row
    let x = startX;
    columns.forEach((column) => {
      writeCell(doc, column.label, x, y, column.width, 26, {
        align: 'center',
        fillColor: '#1E5D9D', // Premium Blue color matching screenshot
        textColor: '#FFFFFF',
        bold: true,
      });
      x += column.width;
    });
    y += 26;

    // Draw Data Rows
    doc.font('Helvetica').fontSize(7); // Decreased font size to 7 for better spacing
    aggregationData.forEach((line) => {
      if (y + rowHeight > doc.page.height - 120) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      x = startX;
      const cells = [
        line.codeOt,
        line.antenneLibelle,
        line.filiereLibelle,
        line.typeRecetteLibelle,
        formatMoney(line.montantCumule),
        String(line.nombreFlux),
      ];

      cells.forEach((cell, index) => {
        const col = columns[index];
        writeCell(doc, cell, x, y, col.width, rowHeight, {
          align: col.align,
          textColor: '#1E293B',
          bold: index === 0 || index === 4, // Bold for Code OT and Montant
        });
        x += col.width;
      });
      y += rowHeight;
    });

    // Draw Total Row (Matches the bottom of table in Screenshot 1)
    if (y + 24 > doc.page.height - 120) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    
    x = startX;
    const combinedWidth = 90 + 80 + 80 + 110; // 360
    const totalLabel = `TOTAL GÉNÉRAL DES FLUX ${statusText}`;
      
    writeCell(doc, totalLabel, x, y, combinedWidth, 24, {
      bold: true,
      fillColor: '#F8FAFC',
      textColor: '#0F172A',
    });
    x += combinedWidth;

    writeCell(doc, formatMoney(totalAmount), x, y, 95, 24, {
      bold: true,
      align: 'right',
      fillColor: '#F8FAFC',
      textColor: '#0F172A',
    });
    x += 95;

    writeCell(doc, String(totalFlux), x, y, 76, 24, {
      bold: true,
      align: 'right',
      fillColor: '#F8FAFC',
      textColor: '#0F172A',
    });
    y += 24 + 20;

    // Imputation comptable section
    if (y + 80 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    // Signatures section
    if (y + 90 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E293B').text('Visa et signatures', startX, y);
    y += 16;
    const signatureWidth = 160;
    ['Comptable', 'Chef Comptable', 'Directeur Financier'].forEach((label, index) => {
      const sigX = startX + index * (signatureWidth + 22);
      doc.save();
      doc.lineWidth(0.5).strokeColor('#CBD5E1');
      doc.rect(sigX, y, signatureWidth, 54).stroke();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569').text(label, sigX + 8, y + 8, { width: signatureWidth - 16, align: 'center' });
      doc.restore();
    });

    doc.end();
  });
};
