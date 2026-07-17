import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.husky/**',
      '.vscode/**',
      'lib/**',
      'node_modules/**',
      // Examples are standalone apps pinned to different RN/Expo generations; their
      // scaffolded template code follows upstream conventions (require() imports etc.)
      // and `expo prebuild` regenerates files. Each example is typechecked on its own —
      // the root lint gate covers the library only.
      'examples/**',
      'android/**',
      'ios/**',
      '**/*.d.ts',
      'coverage/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: globals.node
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        __DEV__: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off'
    }
  },
  {
    files: ['**/__tests__/**/*.{js,ts}', 'jest.setup.js', 'jest.config.js', 'babel.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
);
