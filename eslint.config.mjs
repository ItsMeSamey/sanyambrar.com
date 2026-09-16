import tseslint from 'typescript-eslint';

export default [{
  files: ['src/**/*.ts', 'src/**/*.tsx'],
  ignores: ['**/*.d.ts'],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      project: ['tsconfig.app.json', 'tsconfig.node.json', 'src/games/keybr/tsconfig.ported.json', 'tsconfig.worker.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: { '@typescript-eslint': tseslint.plugin },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
  },
}];
