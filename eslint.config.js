import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
	{ ignores: ['**/dist', '**/node_modules', '**/target', '**/src-tauri/target', '**/*.d.ts'] },
	{
		files: ['**/*.{ts,tsx}'],
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
	{
		files: ['app/haptics-lab/src/**/*.{ts,tsx}'],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		files: ['eslint.config.js', 'plugin/tauri-plugin-haptics/src/**/*.js'],
		extends: [js.configs.recommended],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
		},
	},
	{
		files: ['eslint.config.js', 'app/haptics-lab/vite.config.ts'],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: ['plugin/tauri-plugin-haptics/src/init-iife.js'],
		languageOptions: {
			globals: globals.browser,
		},
	},
);
