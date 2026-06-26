'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { LogIn, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

// Données simulées pour l'interface
const activityLogs = [
  {
    id: 1,
    action: 'Connexion réussie',
    description: 'Nouvelle connexion depuis une adresse IP inconnue (192.168.1.45)',
    date: 'Aujourd\'hui à 08:30',
    icon: LogIn,
    status: 'success'
  },
  {
    id: 2,
    action: 'Génération d\'OP',
    description: 'A généré un ordre de paiement de 450 000 FCFA pour la filière INF',
    date: 'Aujourd\'hui à 10:15',
    icon: FileText,
    status: 'info'
  },
  {
    id: 3,
    action: 'Validation',
    description: 'A validé la transaction bancaire MAT-2026-009',
    date: 'Hier à 14:20',
    icon: CheckCircle,
    status: 'success'
  },
  {
    id: 4,
    action: 'Erreur de connexion',
    description: 'Tentative de connexion échouée (mot de passe incorrect)',
    date: '23 Juin 2026 à 18:05',
    icon: AlertTriangle,
    status: 'warning'
  }
];

export default function ActivityLogPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Journal d'activité"
        description="Consultez l'historique de vos actions et événements de sécurité sur la plateforme."
      />

      <Card className="border border-gray-100 shadow-md dark:border-gray-800">
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activityLogs.map((log) => {
              const Icon = log.icon;
              return (
                <div key={log.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-150">
                  <div className={`mt-1 h-10 w-10 shrink-0 flex items-center justify-center rounded-xl ${
                    log.status === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    log.status === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{log.action}</h4>
                      <Tag className="text-[10px] w-fit" tone={log.status as any}>{log.date}</Tag>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{log.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-slate-50 dark:bg-slate-800/20 text-center">
            <span className="text-xs text-slate-500 font-medium">Fin de l'historique des 30 derniers jours.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
