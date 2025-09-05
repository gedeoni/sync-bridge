module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },

  plugins: ['@typescript-eslint'],
  rules: {
    // 'no-unused-vars': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    // indent: ['error', 'tab'],
    'no-multiple-empty-lines': ['error', { max: 1 }],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'max-lines': ['error', { max: 1000, skipBlankLines: true, skipComments: true }],
  },
};
