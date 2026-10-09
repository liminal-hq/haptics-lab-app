// A small badge showing a tier in its colour
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { Tier } from '@liminal-hq/plugin-haptics';
import { TIER_INFO } from '../utils/tiers';

export function useTierColour(tier: Tier): string {
	const theme = useTheme();
	const role = TIER_INFO[tier].role;
	if (role === 'outline') return theme.palette.outline.main;
	return theme.palette[role].main;
}

export default function TierBadge({ tier, mixed = false }: { tier: Tier; mixed?: boolean }) {
	const colour = useTierColour(tier);
	return (
		<Box
			component="span"
			role="img"
			aria-label={`Tier ${tier}${mixed ? ' mixed with tier 2' : ''}`}
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				minWidth: 34,
				height: 22,
				px: 0.75,
				borderRadius: '6px',
				fontSize: 11,
				fontWeight: 600,
				whiteSpace: 'nowrap',
				bgcolor: alpha(colour, 0.18),
				color: colour,
			}}
		>
			{mixed ? `T${tier} + 2` : `T${tier}`}
		</Box>
	);
}
