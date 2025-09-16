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
  ignorePatterns: ['.eslintrc.js', 'dist/', 'coverage/', 'node_modules/'],
  rules: {
    // General rules
    'no-console': 'off', // Allow console for CLI tool
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'error',

    // SomonScript specific rules
    'no-irregular-whitespace': 'off', // Allow Cyrillic characters

    // Ban explicit any in source (tests override below)
    '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: false }],

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
        // Allow explicit any in tests for rapid prototyping of AST expectations
        '@typescript-eslint/no-explicit-any': 'off',
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
