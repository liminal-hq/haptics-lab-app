// Unit tests for the MUI theme the lab builds from its colour roles
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { buildTheme } from './buildTheme';
import { fallbackRoles } from './roles';

describe('buildTheme', () => {
	const theme = buildTheme(fallbackRoles);

	it('takes its colours from the roles', () => {
		expect(theme.palette.primary.main).toBe(fallbackRoles.primary);
		expect(theme.palette.background.default).toBe(fallbackRoles.surface);
		expect(theme.palette.container.high).toBe(fallbackRoles.surfaceContainerHigh);
	});

	it('lets a swipe that starts on a slider scroll the page, and only the thumb take touches', () => {
		const slider = theme.components?.MuiSlider?.styleOverrides as Record<
			string,
			Record<string, unknown>
		>;
		expect(slider.root.pointerEvents).toBe('none');
		expect(slider.thumb.pointerEvents).toBe('auto');
		expect(slider.thumb.touchAction).toBe('none');
	});
});
