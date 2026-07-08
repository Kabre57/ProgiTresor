'use client';

import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { NomenclatureProduit } from '@/types/etudiant.types';

interface TestMappingSectionProps {
  nomenclatures: NomenclatureProduit[];
}

export function TestMappingSection({ nomenclatures }: TestMappingSectionProps) {
  const [testLabel, setTestLabel] = useState('');
  const [testResult, setTestResult] = useState<any | null>(null);

  const normalizeLabel = (value: unknown): string => String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testLabel.trim()) {
      setTestResult(null);
      return;
    }

    const term = normalizeLabel(testLabel);

    const exactMatch = nomenclatures.find((n) =>
      [n.libelleBrut, n.libelleStandard, n.codeProduit].some((label) => normalizeLabel(label) === term)
    );

    const regexMatch = exactMatch ?? nomenclatures.find((n) => {
      if (!n.regexPattern) return false;
      try {
        return new RegExp(n.regexPattern, 'i').test(term);
      } catch {
        return false;
      }
    });

    const match = exactMatch ?? regexMatch;

    if (match) {
      setTestResult({
        found: true,
        match,
      });
    } else {
      setTestResult({
        found: false,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HelpCircle className="h-4.5 w-4.5 text-[var(--primary)]" />
          Tester le mapping en direct
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleTest} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input
              label="Libellé brut à tester"
              placeholder="Ex: 1ER VERSEMENT FRAIS DE SCOLARITE"
              value={testLabel}
              onChange={(e) => setTestLabel(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" className="w-full md:w-auto h-10">
            Analyser le libellé
          </Button>
        </form>

        {testResult && (
          <div className="mt-4 p-4 rounded-xl border transition-all duration-300">
            {testResult.found ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold text-sm">Correspondance trouvée avec succès !</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="block text-slate-400">Code produit</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{testResult.match.codeProduit}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Libellé standard</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{testResult.match.libelleStandard}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Type de recette</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {testResult.match.typeRecette?.libelle || 'Non spécifié'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Versement rattaché</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {testResult.match.numVersement ? `N°${testResult.match.numVersement}` : 'Aucun'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 p-1">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Aucune correspondance existante.</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ce libellé sera importé sans être lié à un produit et nécessitera une affectation manuelle.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
