module.exports = {
  root: true,
  ignorePatterns: ['dist', 'node_modules'],
  env: {
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import', 'promise'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:import/recommended',
    'plugin:promise/recommended',
    'prettier',
  ],
  settings: {
    'import/resolver': {
      typescript: true,
    },
  },
  rules: {
    'import/order': [
      'warn',
      {
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always',
      },
    ],
    'no-console': 'warn',
  },
};
