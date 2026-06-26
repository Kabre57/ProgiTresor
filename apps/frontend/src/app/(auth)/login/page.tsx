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
import { useAuthStore } from '@/lib/store/useAuthStore';
import { loginSchema, type LoginInput } from '@/types/auth.types';

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
      setSession(session);
      const params = new URLSearchParams(window.location.search);
      router.replace(params.get('next') || '/dashboard');
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
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/25">
            PT
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ProgiTresor
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Connectez-vous à votre espace de gestion
          </p>
        </div>

        {/* Icon badge */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] ring-4 ring-[var(--primary-subtle)]/30">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
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
        © {new Date().getFullYear()} ProgiTresor · Tous droits réservés
      </p>
    </div>
  );
}
