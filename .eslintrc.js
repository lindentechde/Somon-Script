module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'coverage/', 'node_modules/', 'tests/'],
  rules: {
    // General rules
    'no-console': 'off', // Allow console for CLI tool
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'error',

    // SomonScript specific rules
    'no-irregular-whitespace': 'off', // Allow Cyrillic characters

    // Code quality rules
    complexity: ['warn', 15],
    'max-depth': ['warn', 4],
    'max-params': ['warn', 5],
  },
  overrides: [
    {
      files: ['tests/**/*.ts'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
  ],
};
