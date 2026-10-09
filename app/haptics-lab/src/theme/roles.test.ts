// Unit tests for mapping the Android palette onto the lab's colour roles
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { blend, fallbackRoles, rolesFromPalettes, rolesToCssVariables, toHex } from './roles';
import { TIER_INFO, TIERS, tierName } from '../utils/tiers';

const palettes = {
	system_accent1: {
		'100': '#FFD8E4FF',
		'200': '#FFAABBCC',
		'700': '#FF112233',
		'800': '#FF445566',
	},
	system_neutral1: {
		'100': '#FFEEEEEE',
		'700': '#FF303030',
		'800': '#FF202020',
		'900': '#FF101010',
	},
	system_neutral2: { '200': '#FFCCCCCC', '400': '#FF999999', '700': '#FF444444' },
};

describe('toHex', () => {
	it('drops the alpha from ARGB', () => {
		expect(toHex('#FFAABBCC')).toBe('#aabbcc');
		expect(toHex('#AABBCC')).toBe('#aabbcc');
	});

	it('rejects anything that is not a hex colour', () => {
		expect(toHex(undefined)).toBeUndefined();
		expect(toHex('red')).toBeUndefined();
		expect(toHex('#abc')).toBeUndefined();
	});
});

describe('blend', () => {
	it('returns each end at 0 and 1 and the middle at 0.5', () => {
		expect(blend('#000000', '#ffffff', 0)).toBe('#000000');
		expect(blend('#000000', '#ffffff', 1)).toBe('#ffffff');
		expect(blend('#000000', '#ffffff', 0.5)).toBe('#808080');
	});
});

describe('rolesFromPalettes', () => {
	it('maps Android tones onto the roles', () => {
		const roles = rolesFromPalettes(palettes);
		expect(roles.primary).toBe('#aabbcc');
		expect(roles.onPrimary).toBe('#445566');
		expect(roles.primaryContainer).toBe('#112233');
		expect(roles.onPrimaryContainer).toBe('#d8e4ff');
		expect(roles.surface).toBe('#101010');
		expect(roles.surfaceContainerHigh).toBe('#202020');
		expect(roles.onSurface).toBe('#eeeeee');
		expect(roles.outline).toBe('#999999');
		expect(roles.outlineVariant).toBe('#444444');
	});

	it('keeps the surfaces ordered from darkest to lightest', () => {
		const r = rolesFromPalettes(palettes);
		const lum = (hex: string) => parseInt(hex.slice(1, 3), 16);
		const order = [
			r.surfaceContainerLowest,
			r.surface,
			r.surfaceContainerLow,
			r.surfaceContainer,
			r.surfaceContainerHigh,
			r.surfaceContainerHighest,
		].map(lum);
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it('falls back for anything the palette lacks, and for error and attention', () => {
		const roles = rolesFromPalettes(palettes);
		expect(roles.secondary).toBe(fallbackRoles.secondary);
		expect(roles.error).toBe(fallbackRoles.error);
		expect(roles.attention).toBe(fallbackRoles.attention);
	});

	it('returns the fallback roles when there is no palette', () => {
		expect(rolesFromPalettes(undefined)).toEqual(fallbackRoles);
		expect(rolesFromPalettes({})).toEqual(fallbackRoles);
	});
});

describe('rolesToCssVariables', () => {
	it('names variables in kebab case', () => {
		const vars = rolesToCssVariables(fallbackRoles);
		expect(vars['--lab-surface-container-high']).toBe(fallbackRoles.surfaceContainerHigh);
		expect(vars['--lab-on-primary']).toBe(fallbackRoles.onPrimary);
		expect(Object.keys(vars)).toHaveLength(Object.keys(fallbackRoles).length);
	});
});

describe('tiers', () => {
	it('names every tier and colours it from a theme role', () => {
		expect(TIERS).toEqual([4, 3, 2, 1, 0]);
		expect(tierName(3)).toBe('Primitives');
		for (const tier of TIERS) expect(fallbackRoles[TIER_INFO[tier].role]).toBeTruthy();
	});
});
