'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ChevronDown } from 'lucide-react';
import { PiGraduationCapDuotone } from 'react-icons/pi';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { canAccessItem, navigationGroups } from '@/components/layout/navigation';
import { cn } from '@/lib/utils/cn';
import type { UserProfile } from '@/types/auth.types';

type SidebarProps = {
  user: UserProfile | null;
  collapsed: boolean;
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ user, collapsed, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const roleCode = user?.role?.code;
  const [etudiantOpen, setEtudiantsOpen] = useState(false);

  // Auto-open submenu if pathname matches one of the sub-items
  useEffect(() => {
    if (pathname.includes('/etudiant') || pathname.includes('/admin/promotions') || pathname.includes('/admin/antennes') || pathname.includes('/admin/filieres') || pathname.includes('/admin/statuts') || pathname.includes('/admin/types-flux') || pathname.includes('/admin/types-recettes') || pathname.includes('/admin/nomenclatures')) {
      setEtudiantsOpen(true);
    }
  }, [pathname]);

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-900 transition-all duration-300 ease-in-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-20' : 'w-[290px]'
        )}
      >
        {/* Header/Logo */}
        <div className={cn(
          'flex h-16 items-center justify-between border-b border-slate-800 px-5 transition-all duration-300',
          collapsed && 'justify-center px-0'
        )}>
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20">
              PT
            </span>
            {!collapsed && (
              <span className="transition-all duration-300">
                <span className="block text-sm font-bold text-white tracking-wide">ProgiTresor</span>
                <span className="block text-[10px] text-slate-400">Administration</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={onClose}
              aria-label="Fermer le menu"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {navigationGroups.map((group) => {
            const items = group.items.filter((item) => canAccessItem(roleCode, item));
            if (items.length === 0) return null;

            // Handle the "Étudiants" group as a special collapsible sub-menu
            const isEtudiantsGroup = group.label === 'Étudiants';

            if (isEtudiantsGroup) {
              return (
                <div key={group.label} className="relative group/menu">
                  {!collapsed && (
                    <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {group.label}
                    </div>
                  )}

                  {collapsed ? (
                    // Collapsed mode: Hover floating menu
                    <div className="group relative flex flex-col items-center">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition duration-150 text-gray-100 hover:bg-slate-800 hover:text-white',
                        (pathname.includes('/etudiant') || pathname.includes('/admin/')) ? 'bg-blue-600/20 text-blue-400' : ''
                      )}>
                        <PiGraduationCapDuotone className="h-5 w-5" />
                      </div>
                      
                      {/* Tooltip / Floating Submenu on Hover */}
                      <div className="absolute left-14 top-0 z-50 w-52 origin-left scale-95 opacity-0 invisible transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 group-hover:visible rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-800 mb-1">
                          {group.label}
                        </div>
                        <div className="space-y-1">
                          {items.map((subItem) => {
                            const subActive = subItem.href === '/etudiant'
                              ? (pathname === '/etudiant' || (pathname.startsWith('/etudiant/') && !pathname.startsWith('/etudiant/promotions')))
                              : pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                onClick={onClose}
                                className={cn(
                                  'block px-3 py-1.5 text-xs rounded-lg transition-colors',
                                  subActive ? 'text-white font-semibold bg-blue-600' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                )}
                              >
                                {subItem.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Expanded mode: Collapsible list
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setEtudiantsOpen(!etudiantOpen)}
                        className={cn(
                          'flex w-full h-10 items-center justify-between rounded-xl px-3 text-sm font-medium transition duration-150',
                          etudiantOpen ? 'text-white font-semibold' : 'text-gray-100 hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <PiGraduationCapDuotone className={cn('h-4.5 w-4.5 shrink-0', etudiantOpen ? 'text-blue-400' : 'text-slate-400')} />
                          <span>{group.label}</span>
                        </div>
                        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', etudiantOpen && 'rotate-180')} />
                      </button>

                      <div
                        className={cn(
                          'overflow-hidden transition-all duration-300 ease-in-out pl-9 space-y-1',
                          etudiantOpen ? 'max-h-[300px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                        )}
                      >
                        {items.map((subItem) => {
                          const subActive = subItem.href === '/etudiant'
                            ? (pathname === '/etudiant' || (pathname.startsWith('/etudiant/') && !pathname.startsWith('/etudiant/promotions')))
                            : pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={onClose}
                              className={cn(
                                'flex h-8 items-center rounded-lg px-3 text-xs transition duration-150',
                                subActive 
                                  ? 'text-white font-semibold bg-blue-600 border-l-2 border-blue-400 pl-2 shadow-lg shadow-blue-600/20' 
                                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                              )}
                            >
                              {subItem.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Normal Navigation Groups
            return (
              <div key={group.label} className="relative group/menu">
                {!collapsed && (
                  <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.label}
                  </div>
                )}
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <div key={item.href} className="relative group flex items-center">
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'flex h-10 items-center rounded-xl transition-all duration-150 w-full',
                            collapsed ? 'justify-center w-10 mx-auto' : 'px-3 gap-3 text-sm font-medium',
                            active
                              ? 'bg-blue-600 text-white font-semibold border-l-2 border-blue-400 rounded-l-none pl-2.5 shadow-lg shadow-blue-600/20'
                              : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                          )}
                        >
                          <Icon className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-white' : 'text-slate-400')} />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>

                        {/* Collapsed Item Tooltip */}
                        {collapsed && (
                          <div className="absolute left-14 z-50 origin-left scale-95 opacity-0 invisible transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 group-hover:visible rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white shadow-xl whitespace-nowrap">
                            {item.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with version */}
        <div className="border-t border-slate-800 p-4 text-center">
          {collapsed ? (
            <span className="text-[10px] font-bold text-amber-500">v0.1</span>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500 px-2">
              <span>ProgiTresor</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                v0.1.0
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
