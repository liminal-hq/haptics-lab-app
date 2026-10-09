// Builds the MUI theme from the lab's colour roles
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { createTheme } from '@mui/material';
import type { Theme } from '@mui/material';
import type { Roles } from './roles';

const sans = "'Roboto Flex Variable', 'Roboto Flex', system-ui, sans-serif";
export const monoFont = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";

/** Every colour comes from `roles`, so the theme follows the wallpaper on Android. */
export function buildTheme(roles: Roles): Theme {
	return createTheme({
		palette: {
			mode: 'dark',
			primary: { main: roles.primary, contrastText: roles.onPrimary },
			secondary: { main: roles.secondary, contrastText: roles.onSecondary },
			tertiary: { main: roles.tertiary, contrastText: roles.onTertiary },
			error: { main: roles.error, contrastText: roles.onError },
			warning: { main: roles.attention, contrastText: roles.onAttention },
			attention: { main: roles.attention, contrastText: roles.onAttention },
			background: { default: roles.surface, paper: roles.surfaceContainer },
			text: { primary: roles.onSurface, secondary: roles.onSurfaceVariant },
			divider: roles.outlineVariant,
			outline: { main: roles.outline, variant: roles.outlineVariant },
			container: {
				lowest: roles.surfaceContainerLowest,
				low: roles.surfaceContainerLow,
				main: roles.surfaceContainer,
				high: roles.surfaceContainerHigh,
				highest: roles.surfaceContainerHighest,
			},
			onContainer: {
				primary: roles.onPrimaryContainer,
				secondary: roles.onSecondaryContainer,
				tertiary: roles.onTertiaryContainer,
				error: roles.onErrorContainer,
				attention: roles.onAttentionContainer,
			},
			containers: {
				primary: roles.primaryContainer,
				secondary: roles.secondaryContainer,
				tertiary: roles.tertiaryContainer,
				error: roles.errorContainer,
				attention: roles.attentionContainer,
			},
		},
		shape: { borderRadius: 12 },
		typography: {
			fontFamily: sans,
			h1: { fontSize: 28, lineHeight: '36px', fontWeight: 500 },
			h2: { fontSize: 22, lineHeight: '28px', fontWeight: 500 },
			h3: { fontSize: 16, lineHeight: '24px', fontWeight: 600 },
			h4: { fontSize: 14, lineHeight: '20px', fontWeight: 500 },
			body1: { fontSize: 16, lineHeight: '24px' },
			body2: { fontSize: 14, lineHeight: '20px' },
			button: { textTransform: 'none', fontWeight: 600, fontSize: 14 },
			caption: { fontSize: 12, lineHeight: '16px' },
		},
		components: {
			MuiButton: {
				defaultProps: { disableElevation: true },
				styleOverrides: { root: { borderRadius: 20, minHeight: 40 } },
				variants: [
					{
						props: { variant: 'tonal' },
						style: {
							backgroundColor: roles.secondaryContainer,
							color: roles.onSecondaryContainer,
							'&:hover': { backgroundColor: roles.secondaryContainer, filter: 'brightness(1.12)' },
							'&.Mui-disabled': { opacity: 0.38 },
						},
					},
				],
			},
			MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } } },
			MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
			// MUI blocks page scrolling for any touch on a slider and jumps the value to wherever the
			// finger lands, so a swipe that happens to start on a slider moved it. Only the thumb takes
			// touches now (with a generous hit area); a touch anywhere else on the slider scrolls the page.
			MuiSlider: {
				styleOverrides: {
					root: { height: 6, pointerEvents: 'none', touchAction: 'pan-y' },
					thumb: {
						pointerEvents: 'auto',
						touchAction: 'none',
						'&::after': { inset: -14 },
					},
				},
			},
		},
	});
}
