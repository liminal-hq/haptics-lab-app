// Tier names and the colour role each tier is drawn with
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import type { Tier } from '@liminal-hq/plugin-haptics';
import type { Roles } from '../theme/roles';

export const TIERS: Tier[] = [4, 3, 2, 1, 0];

export type TierInfo = {
	name: string;
	/** The role from the theme this tier is drawn in. */
	role: keyof Pick<Roles, 'primary' | 'tertiary' | 'attention' | 'secondary' | 'outline'>;
	/** One line on what the tier is, for the Device tab. */
	summary: string;
};

export const TIER_INFO: Record<Tier, TierInfo> = {
	4: { name: 'Envelope', role: 'primary', summary: 'Smooth amplitude and frequency curves' },
	3: { name: 'Primitives', role: 'tertiary', summary: 'Tuned clicks, ticks, thuds and rises' },
	2: { name: 'Amplitude', role: 'attention', summary: 'Timed pulses with adjustable strength' },
	1: { name: 'On / off', role: 'secondary', summary: 'The motor can only switch on and off' },
	0: { name: 'Off', role: 'outline', summary: 'No vibration motor' },
};

export function tierName(tier: Tier): string {
	return TIER_INFO[tier].name;
}
