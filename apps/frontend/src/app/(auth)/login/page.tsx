'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api/authApi';
import { getErrorMessage } from '@/lib/api/client';
import { applyPermissionPayload, decodeJwtPermissions } from '@/lib/auth/permissionPayload';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { loginSchema, type LoginInput } from '@/types/auth.types';
import Logo from '@/components/template/Logo';
import { isStudentUser } from '@/lib/auth/roles';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setError(null);
    try {
      const session = await authApi.login(values);
      let user = session.user;

      try {
        const { accessToken } = await authApi.refreshAccessToken();
        user = applyPermissionPayload(user, decodeJwtPermissions(accessToken));
      } catch {
        user = applyPermissionPayload(user, null);
      }

      setSession({ ...session, user });
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      const safeNext = next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : null;
      router.replace(isStudentUser(user) ? '/etudiant/portail' : safeNext || '/dashboard');
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Card container */}
      <div className="rounded-2xl border border-gray-200/60 bg-white/80 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm dark:border-gray-700/50 dark:bg-slate-800/80 dark:shadow-slate-900/50 sm:p-10">
        {/* Logo and branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5">
            <Logo
              type="streamline"
              mode="light"
              logoWidth={60}
              logoHeight={60}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ScolarPaie
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Connectez-vous à votre espace de gestion
          </p>
        </div>


        {/* Login form */}
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Nom d'utilisateur"
            autoComplete="username"
            placeholder="Entrez votre identifiant"
            error={errors.username?.message}
            {...register('username')}
          />
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Se connecter
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-100 pt-6 text-center dark:border-gray-700/50">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Plateforme interne · Back-office de recette
          </p>
        </div>
      </div>

      {/* Bottom text */}
      <p className="mt-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ScolarPaie · Tous droits réservés
      </p>
    </div>
  );
}
