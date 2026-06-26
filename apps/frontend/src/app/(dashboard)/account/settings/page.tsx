'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { User, Lock, Bell, ShieldCheck } from 'lucide-react';

export default function AccountSettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Paramètres du compte"
        description="Gérez vos informations personnelles et vos préférences de sécurité."
      />

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar navigation for settings */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'profile'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
              }`}
            >
              <User className="h-4 w-4" />
              Profil personnel
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'security'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
              }`}
            >
              <Lock className="h-4 w-4" />
              Sécurité & Mot de passe
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'notifications'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
              }`}
            >
              <Bell className="h-4 w-4" />
              Préférences de notification
            </button>
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card className="border border-gray-100 shadow-md dark:border-gray-800">
              <CardHeader>
                <CardTitle>Informations Personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="h-20 w-20 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center text-3xl font-bold shadow-lg shadow-orange-500/20">
                    {user?.prenom?.[0]}{user?.nom?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{user?.prenom} {user?.nom}</h3>
                    <p className="text-sm text-slate-500">{user?.role?.libelle}</p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="default" size="sm">Changer l'avatar</Button>
                      <Button variant="plain" size="sm" className="text-red-500 hover:text-red-600">Supprimer</Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Input label="Prénom" defaultValue={user?.prenom} />
                  <Input label="Nom de famille" defaultValue={user?.nom} />
                  <Input label="Adresse Email" type="email" defaultValue={user?.email} />
                  <Input label="Numéro de téléphone" type="tel" placeholder="+225 01 02 03 04 05" />
                </div>
                
                <div className="pt-4 flex justify-end">
                  <Button variant="solid">Enregistrer les modifications</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="border border-gray-100 shadow-md dark:border-gray-800">
              <CardHeader>
                <CardTitle>Sécurité et Accès</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-start gap-3 border border-slate-100 dark:border-slate-700">
                  <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Votre compte est sécurisé</h4>
                    <p className="text-xs text-slate-500 mt-1">L'authentification par mot de passe robuste est activée sur votre compte.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">Changer le mot de passe</h4>
                  <Input label="Mot de passe actuel" type="password" placeholder="••••••••" />
                  <Input label="Nouveau mot de passe" type="password" placeholder="••••••••" />
                  <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••" />
                </div>
                
                <div className="pt-4 flex justify-end">
                  <Button variant="solid">Mettre à jour le mot de passe</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="border border-gray-100 shadow-md dark:border-gray-800">
              <CardHeader>
                <CardTitle>Préférences de notification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-6">Choisissez comment vous souhaitez être informé des activités sur ProgiTresor.</p>
                <div className="space-y-4">
                  {[
                    { title: "Nouveaux Ordres de Paiement", desc: "Soyez notifié lorsqu'un nouvel OP est généré" },
                    { title: "Transactions hors-budget", desc: "Alertes pour les entrées financières hors-budget" },
                    { title: "Rapports hebdomadaires", desc: "Recevez une synthèse financière chaque lundi" },
                  ].map((notif, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-orange-500/50 transition">
                      <div>
                        <div className="font-medium text-sm text-slate-900 dark:text-white">{notif.title}</div>
                        <div className="text-xs text-slate-500">{notif.desc}</div>
                      </div>
                      <div className="w-10 h-5 bg-orange-500 rounded-full relative cursor-pointer shadow-inner">
                        <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
