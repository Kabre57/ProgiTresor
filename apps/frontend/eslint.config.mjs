import nextConfig from 'eslint-config-next';

/** @type {import("eslint").Linter.Config[]} */
const config = [
  // Ignore build artefacts and dependencies
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'public/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
    ],
  },
  // Spread the flat config array exported by eslint-config-next
  ...nextConfig,
  // Project-level overrides
  {
    rules: {
      // Allow unused vars prefixed with _ (common pattern in TS)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow explicit `any` in edge cases (warn only)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Enforce consistent use of type imports
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
      // Next.js specific: allow img elements (project may use both)
      '@next/next/no-img-element': 'warn',
      // React hooks exhaustive deps: warn only (not error)
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

export default config;
