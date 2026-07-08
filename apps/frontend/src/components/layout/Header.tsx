'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Menu, Moon, Sun, Search, Bell, LogOut, User, AlignLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Badge } from '@/components/ui/Badge';
import { isStudentUser } from '@/lib/auth/roles';
import { cn } from '@/lib/utils/cn';
import type { UserProfile } from '@/types/auth.types';

type HeaderProps = {
  user: UserProfile | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onMenuClick: () => void;
  onLogout: () => void;
};

export function Header({
  user,
  sidebarCollapsed,
  onToggleSidebar,
  onMenuClick,
  onLogout,
}: HeaderProps) {
  const [dark, setDark] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isStudent = isStudentUser(user);
  const profileHref = isStudent ? '/etudiant/profile' : '/account/settings?tab=profile';
  const settingsHref = isStudent ? '/etudiant/security' : '/account/settings?tab=security';

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('pt_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextDark = saved ? saved === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', nextDark);
    setDark(nextDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !dark;
    document.documentElement.classList.toggle('dark', nextDark);
    window.localStorage.setItem('pt_theme', nextDark ? 'dark' : 'light');
    setDark(nextDark);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (user: UserProfile | null) => {
    if (!user) return 'PT';
    const first = user.prenom?.[0] ?? '';
    const last = user.nom?.[0] ?? '';
    return (first + last).toUpperCase() || 'U';
  };

  // Fake notifications data
  const notifications = [
    { id: 1, title: 'Nouvelle transaction', desc: 'MAT20260619 - 45 000 FCFA reçu.', time: 'il y a 5 min' },
    { id: 2, title: 'Ordre de traitement validé', desc: 'OT #1043 a été validé.', time: 'il y a 1 heure' },
    { id: 3, title: 'Nouveau compte créé', desc: 'Compte 706200 ajouté.', time: 'il y a 3 heures' },
  ];

  return (
    <header className="header sticky top-0 z-30 h-16 w-full bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between px-4 sm:px-6">
      {/* Start Actions */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden hover:bg-slate-100 dark:hover:bg-slate-700"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu mobile"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop sidebar toggle button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          aria-label={sidebarCollapsed ? 'Déployer la sidebar' : 'Replier la sidebar'}
        >
          <AlignLeft className={cn('h-5 w-5 transition-transform duration-200', sidebarCollapsed && 'rotate-180')} />
        </button>

        {/* Search bar (Desktop) */}
        <div className="hidden md:flex items-center relative w-64">
          <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="h-9 w-full rounded-xl border border-gray-200 bg-slate-50 pl-9 pr-4 text-xs outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-1 focus:ring-[var(--primary)] dark:border-gray-700 dark:bg-gray-900 dark:focus:bg-gray-800"
          />
        </div>
      </div>

      {/* End Actions */}
      <div className="flex items-center gap-2.5">
        <Link
          href="/etudiant/portail"
          className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition duration-150 flex items-center mr-1"
        >
          Espace étudiant
        </Link>
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Changer le thème"
        >
          {dark ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-slate-500" />}
        </Button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <Badge content={3} className="cursor-pointer">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
            </button>
          </Badge>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
              </div>
              <div className="py-1 divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition duration-150 cursor-pointer">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{notif.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{notif.desc}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{notif.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)] text-xs font-bold text-white dark:text-slate-900">
              {getInitials(user)}
            </div>
            {user && (
              <span className="hidden text-xs font-semibold text-slate-700 dark:text-slate-200 md:block pr-1">
                {user.prenom} {user.nom}
              </span>
            )}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
              {user && (
                <div className="flex items-center gap-3 border-b border-gray-100 p-3 dark:border-gray-700">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white dark:text-slate-900">
                    {getInitials(user)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {user.prenom} {user.nom}
                    </div>
                    <div className="truncate text-[10px] text-slate-400">{user.email}</div>
                    <div className="mt-1">
                      <Tag tone="info" className="text-[9px] px-1.5 py-0.5">
                        {user.role.libelle ?? user.role.code}
                      </Tag>
                    </div>
                  </div>
                </div>
              )}
              <div className="py-1">
                <Link
                  href={profileHref}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50 transition"
                  onClick={() => setProfileOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>Profil</span>
                </Link>
                <Link
                  href={settingsHref}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50 transition"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Paramètres du compte</span>
                </Link>
                {!isStudent && (
                  <Link
                    href="/account/activity-log"
                    className="flex w-full items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50 transition"
                    onClick={() => setProfileOpen(false)}
                  >
                    <AlignLeft className="h-4 w-4" />
                    <span>Journal d'activité</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-b-2xl px-3 py-2 mt-1 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
