// MUI theme augmentation for the lab's extra colour roles
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import '@mui/material/styles';

declare module '@mui/material/styles' {
	interface Palette {
		tertiary: PaletteColor;
		attention: PaletteColor;
		outline: { main: string; variant: string };
		container: {
			lowest: string;
			low: string;
			main: string;
			high: string;
			highest: string;
		};
		onContainer: {
			primary: string;
			secondary: string;
			tertiary: string;
			error: string;
			attention: string;
		};
		containers: {
			primary: string;
			secondary: string;
			tertiary: string;
			error: string;
			attention: string;
		};
	}
	interface PaletteOptions {
		tertiary?: PaletteColorOptions;
		attention?: PaletteColorOptions;
		outline?: { main: string; variant: string };
		container?: Palette['container'];
		onContainer?: Palette['onContainer'];
		containers?: Palette['containers'];
	}
}

declare module '@mui/material/Button' {
	interface ButtonPropsVariantOverrides {
		tonal: true;
	}
}
