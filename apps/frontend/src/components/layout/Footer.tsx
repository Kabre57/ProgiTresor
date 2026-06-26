'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer flex h-16 items-center justify-between border-t border-gray-200 bg-white px-6 text-xs text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400">
      <div>
        Copyright &copy; {new Date().getFullYear()}{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">ProgiTresor</span>. All
        rights reserved.
      </div>
      <div className="flex gap-4">
        <Link
          href="#"
          className="hover:text-[var(--primary)] transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          Terms & Conditions
        </Link>
        <span>|</span>
        <Link
          href="#"
          className="hover:text-[var(--primary)] transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
