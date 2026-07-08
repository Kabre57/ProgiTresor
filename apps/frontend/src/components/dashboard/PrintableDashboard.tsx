'use client';

import React, { forwardRef } from 'react';
import { formatCurrency } from '@/lib/utils/format';

export interface PrintableDashboardProps {
  period: { dateDebut: string; dateFin: string };
  kpis: {
    totalBudget: number;
    totalHorsBudget: number;
  } | null;
  byLibelle: { libelle: string; type: string; montant: number }[];
  topNomenclatures: {
    libelleStandard: string;
    typeRecette: string;
    montantBudget: number;
    montantHorsBudget: number;
    montantTotal: number;
  }[];
}

export const PrintableDashboard = forwardRef<HTMLDivElement, PrintableDashboardProps>(
  ({ period, kpis, byLibelle, topNomenclatures }, ref) => {
    const totalBudget = kpis?.totalBudget ?? 0;
    const totalHorsBudget = kpis?.totalHorsBudget ?? 0;
    const totalGlobal = totalBudget + totalHorsBudget;

    return (
      <div ref={ref} className="printable-dashboard">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
            ProgiTresor — Tableau de bord
          </h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>
            Période : {period.dateDebut || '—'} au {period.dateFin || '—'} ·
            Généré le {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>

        {/* KPIs summary */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '24px',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ ...cellStyle, textAlign: 'left' }}>Indicateur</th>
              <th style={{ ...cellStyle, textAlign: 'right' }}>Montant (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellStyle}>Recettes Budget</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(totalBudget)}</td>
            </tr>
            <tr>
              <td style={cellStyle}>Recettes Hors-Budget</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(totalHorsBudget)}</td>
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <td style={cellStyle}>Total général</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(totalGlobal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Recettes par libellé */}
        {byLibelle.length > 0 && (
          <>
            <h2 style={sectionTitleStyle}>Recettes par libellé standard</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ ...cellStyle, textAlign: 'left' }}>Libellé</th>
                  <th style={{ ...cellStyle, textAlign: 'left' }}>Type</th>
                  <th style={{ ...cellStyle, textAlign: 'right' }}>Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {byLibelle.map((item, i) => (
                  <tr key={i}>
                    <td style={cellStyle}>{item.libelle}</td>
                    <td style={cellStyle}>{item.type}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(item.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Top Nomenclatures */}
        {topNomenclatures.length > 0 && (
          <>
            <h2 style={sectionTitleStyle}>Top nomenclatures / produits</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ ...cellStyle, textAlign: 'left' }}>Produit</th>
                  <th style={{ ...cellStyle, textAlign: 'left' }}>Type recette</th>
                  <th style={{ ...cellStyle, textAlign: 'right' }}>Budget</th>
                  <th style={{ ...cellStyle, textAlign: 'right' }}>Hors-Budget</th>
                  <th style={{ ...cellStyle, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {topNomenclatures.map((item, i) => (
                  <tr key={i}>
                    <td style={cellStyle}>{item.libelleStandard}</td>
                    <td style={cellStyle}>{item.typeRecette}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(item.montantBudget)}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(item.montantHorsBudget)}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(item.montantTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '32px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#999',
            borderTop: '1px solid #eee',
            paddingTop: '12px',
          }}
        >
          ProgiTresor © {new Date().getFullYear()} · Document généré automatiquement
        </div>
      </div>
    );
  },
);

PrintableDashboard.displayName = 'PrintableDashboard';

const cellStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '6px 10px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  marginBottom: '8px',
  borderBottom: '2px solid #333',
  paddingBottom: '4px',
};
