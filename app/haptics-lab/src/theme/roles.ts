// Colour roles for the lab, mapped from the Material You system palette
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import type { MaterialYouPalettes } from '@liminal-hq/plugin-material-you';

/** Every colour the lab draws with. Components read these through the theme, never as literals. */
export type Roles = {
	primary: string;
	onPrimary: string;
	primaryContainer: string;
	onPrimaryContainer: string;
	secondary: string;
	onSecondary: string;
	secondaryContainer: string;
	onSecondaryContainer: string;
	tertiary: string;
	onTertiary: string;
	tertiaryContainer: string;
	onTertiaryContainer: string;
	error: string;
	onError: string;
	errorContainer: string;
	onErrorContainer: string;
	attention: string;
	onAttention: string;
	attentionContainer: string;
	onAttentionContainer: string;
	surface: string;
	surfaceContainerLowest: string;
	surfaceContainerLow: string;
	surfaceContainer: string;
	surfaceContainerHigh: string;
	surfaceContainerHighest: string;
	onSurface: string;
	onSurfaceVariant: string;
	outline: string;
	outlineVariant: string;
};

/**
 * Used when Material You is unavailable (desktop, or before the palette loads), and for `error` and
 * `attention`, which Android has no system palette for. These are the Cadence dark tokens.
 */
export const fallbackRoles: Roles = {
	primary: '#cbbeff',
	onPrimary: '#300b8f',
	primaryContainer: '#4626b2',
	onPrimaryContainer: '#e7deff',
	secondary: '#cac3dc',
	onSecondary: '#322e41',
	secondaryContainer: '#494458',
	onSecondaryContainer: '#e7dff6',
	tertiary: '#ffb0cb',
	onTertiary: '#561d3b',
	tertiaryContainer: '#71334f',
	onTertiaryContainer: '#ffd9e4',
	error: '#ffb4ab',
	onError: '#690005',
	errorContainer: '#93000a',
	onErrorContainer: '#ffdad6',
	attention: '#ffb86b',
	onAttention: '#2c1600',
	attentionContainer: '#6a3800',
	onAttentionContainer: '#ffddb8',
	surface: '#141318',
	surfaceContainerLowest: '#0f0e13',
	surfaceContainerLow: '#1c1b20',
	surfaceContainer: '#201f25',
	surfaceContainerHigh: '#2b292f',
	surfaceContainerHighest: '#36343a',
	onSurface: '#e5e1e9',
	onSurfaceVariant: '#c9c5d0',
	outline: '#938f99',
	outlineVariant: '#484554',
};

/** `#AARRGGBB` or `#RRGGBB` to `#rrggbb`, or `undefined` for anything else. */
export function toHex(colour: string | undefined): string | undefined {
	if (!colour) return undefined;
	const m = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(colour.trim());
	if (!m) return undefined;
	const digits = m[1].toLowerCase();
	return `#${digits.length === 8 ? digits.slice(2) : digits}`;
}

/** Mixes two `#rrggbb` colours; `amount` 0 gives `a` and 1 gives `b`. */
export function blend(a: string, b: string, amount: number): string {
	const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
	const mixed = [0, 1, 2].map((i) => {
		const v = Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * amount);
		return v.toString(16).padStart(2, '0');
	});
	return `#${mixed.join('')}`;
}

type Tones = Record<string, string> | undefined;

/**
 * Builds the roles from Android's palettes. Android names tones 0 to 1000 from white to black, so
 * tone 200 is Material tone 80. Anything the palette lacks keeps its fallback colour.
 */
export function rolesFromPalettes(palettes: MaterialYouPalettes | undefined): Roles {
	const pick = (tones: Tones, tone: number, fallback: string) =>
		toHex(tones?.[String(tone)]) ?? fallback;
	const a1 = palettes?.system_accent1;
	const a2 = palettes?.system_accent2;
	const a3 = palettes?.system_accent3;
	const n1 = palettes?.system_neutral1;
	const n2 = palettes?.system_neutral2;
	const f = fallbackRoles;

	const surface = pick(n1, 900, f.surface);
	const high = pick(n1, 800, f.surfaceContainerHigh);
	// The in-between surfaces are blended from the system tones, so without them keep the fallback.
	const haveSurfaces = toHex(n1?.['900']) !== undefined && toHex(n1?.['800']) !== undefined;

	return {
		...f,
		primary: pick(a1, 200, f.primary),
		onPrimary: pick(a1, 800, f.onPrimary),
		primaryContainer: pick(a1, 700, f.primaryContainer),
		onPrimaryContainer: pick(a1, 100, f.onPrimaryContainer),
		secondary: pick(a2, 200, f.secondary),
		onSecondary: pick(a2, 800, f.onSecondary),
		secondaryContainer: pick(a2, 700, f.secondaryContainer),
		onSecondaryContainer: pick(a2, 100, f.onSecondaryContainer),
		tertiary: pick(a3, 200, f.tertiary),
		onTertiary: pick(a3, 800, f.onTertiary),
		tertiaryContainer: pick(a3, 700, f.tertiaryContainer),
		onTertiaryContainer: pick(a3, 100, f.onTertiaryContainer),
		surface,
		surfaceContainerLowest: haveSurfaces
			? blend(surface, '#000000', 0.3)
			: f.surfaceContainerLowest,
		surfaceContainerLow: haveSurfaces ? blend(surface, high, 0.4) : f.surfaceContainerLow,
		surfaceContainer: haveSurfaces ? blend(surface, high, 0.7) : f.surfaceContainer,
		surfaceContainerHigh: high,
		surfaceContainerHighest: haveSurfaces
			? blend(high, pick(n1, 700, f.surfaceContainerHighest), 0.5)
			: f.surfaceContainerHighest,
		onSurface: pick(n1, 100, f.onSurface),
		onSurfaceVariant: pick(n2, 200, f.onSurfaceVariant),
		outline: pick(n2, 400, f.outline),
		outlineVariant: pick(n2, 700, f.outlineVariant),
	};
}

/** CSS custom properties for SVG strokes and anything else that can't read the MUI theme. */
export function rolesToCssVariables(roles: Roles): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [name, value] of Object.entries(roles)) {
		out[`--lab-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = value;
	}
	return out;
}
