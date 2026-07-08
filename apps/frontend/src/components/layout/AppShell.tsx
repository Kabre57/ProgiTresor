'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isStudentUser } from '@/lib/auth/roles';
import { useAuthStore } from '@/lib/store/useAuthStore';
import PostLoginLayout from '@/components/layouts/PostLoginLayout';
import navigationConfig from '@/configs/navigation.config';
import type { NavigationTree } from '@/@types/navigation';

function getRouteAuthority(path: string, tree: NavigationTree[]): string[] | null {
  for (const item of tree) {
    if (item.path && (item.path === path || path.startsWith(item.path + '/'))) {
      return item.authority || [];
    }
    if (item.subMenu && item.subMenu.length > 0) {
      const subAuth = getRouteAuthority(path, item.subMenu);
      if (subAuth !== null) {
        return subAuth;
      }
    }
  }
  return null;
}

function checkUserHasRouteAccess(user: any, routeAuth: string[]): boolean {
  if (!user) return false;
  const userRole = user.role?.code?.toUpperCase() || '';
  if (userRole === 'ADMIN') return true;

  // Direct role check
  return routeAuth.some(
    (r) => r.toUpperCase() === userRole.toUpperCase() || r === user.role?.libelle
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, sessionChecked, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (hydrated && sessionChecked) {
      if (!isAuthenticated) {
        if (pathname !== '/login') {
          window.location.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      } else if (user) {
        const isStudent = isStudentUser(user);
        if (isStudent) {
          const allowedPaths = ['/etudiant/portail', '/etudiant/portal', '/etudiant/scolarite', '/etudiant/attestations', '/etudiant/profile', '/etudiant/security', '/etudiant/notifications', '/account/settings'];
          const isAllowed = allowedPaths.some((path) => pathname.startsWith(path));
          if (!isAllowed) {
            router.replace('/etudiant/portail');
          }
        } else {
          const roleCode = user.role?.code?.toUpperCase() || '';
          
          if (pathname === '/dashboard' || pathname === '/') {
            if (roleCode === 'COMPTABLE') {
              router.replace('/transactions');
              return;
            } else if (roleCode === 'DF' || roleCode === 'CONSULTANT') {
              router.replace('/dashboard/recettes');
              return;
            } else if (roleCode === 'CHEF_COMPTABLE') {
              router.replace('/backoffice/synthese');
              return;
            } else if (roleCode === 'BUDGET') {
              router.replace('/orders');
              return;
            }
          }

          const routeAuth = getRouteAuthority(pathname, navigationConfig);
          if (routeAuth && routeAuth.length > 0) {
            const hasAccess = checkUserHasRouteAccess(user, routeAuth);
            if (!hasAccess) {
              if (roleCode === 'COMPTABLE') {
                router.replace('/transactions');
              } else if (roleCode === 'DF' || roleCode === 'CONSULTANT') {
                router.replace('/dashboard/recettes');
              } else if (roleCode === 'CHEF_COMPTABLE') {
                router.replace('/backoffice/synthese');
              } else if (roleCode === 'BUDGET') {
                router.replace('/orders');
              } else {
                router.replace('/dashboard');
              }
            }
          }
        }
      }
    }
  }, [hydrated, sessionChecked, isAuthenticated, user, pathname, router]);

  if (!hydrated || !sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-sm text-slate-500">
        Initialisation...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-sm text-slate-500">
        Redirection vers la connexion...
      </div>
    );
  }

  const isStudent = isStudentUser(user);
  const studentAllowedPaths = ['/etudiant/portail', '/etudiant/portal', '/etudiant/scolarite', '/etudiant/attestations', '/etudiant/profile', '/etudiant/security', '/etudiant/notifications', '/account/settings'];
  const isStudentAllowedPath = studentAllowedPaths.some((path) => pathname.startsWith(path));

  if (isStudent && !isStudentAllowedPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-sm text-slate-500">
        Redirection vers l’espace étudiant...
      </div>
    );
  }

  if (!isStudent) {
    const routeAuth = getRouteAuthority(pathname, navigationConfig);
    if (routeAuth && routeAuth.length > 0) {
      const hasAccess = checkUserHasRouteAccess(user, routeAuth);
      if (!hasAccess) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-sm text-slate-500">
            Accès refusé. Redirection...
          </div>
        );
      }
    }
  }

  return (
    <PostLoginLayout>{children}</PostLoginLayout>
  );
}
