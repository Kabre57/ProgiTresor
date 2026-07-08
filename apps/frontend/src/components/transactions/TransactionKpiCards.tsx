'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';

interface TransactionKpiCardsProps {
  totals: {
    total: number;
    budget: number;
    horsBudget: number;
  };
}

export function TransactionKpiCards({ totals }: TransactionKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Recettes Mobilisées (Total)
              </p>
              <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-slate-100">
                {formatCurrency(totals.total)}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Flux Budget
              </p>
              <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-slate-100">
                {formatCurrency(totals.budget)}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Flux Hors-Budget
              </p>
              <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-slate-100">
                {formatCurrency(totals.horsBudget)}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
