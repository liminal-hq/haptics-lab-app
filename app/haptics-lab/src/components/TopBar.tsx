// Top app bar: app icon, title and the tier chip that opens the Device tab
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, Chip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import icon from '../../../../assets/icon/icon.svg';
import { useLab } from '../context/LabContext';
import { tierName } from '../utils/tiers';
import { useTierColour } from './TierBadge';

export default function TopBar({ onOpenDevice }: { onOpenDevice: () => void }) {
	const { caps, effectiveTier, maxTier } = useLab();
	const colour = useTierColour(effectiveTier);
	const capped = caps !== null && maxTier !== null && maxTier < caps.topTier;

	return (
		<Box
			component="header"
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: 1.5,
				minHeight: 64,
				px: 2,
				pt: 'env(safe-area-inset-top, 0px)',
				bgcolor: 'background.default',
			}}
		>
			<Box component="img" src={icon} alt="" sx={{ width: 32, height: 32, borderRadius: '8px' }} />
			<Typography variant="h2" component="h1" sx={{ flex: 1 }}>
				Haptics Lab
			</Typography>
			<Chip
				onClick={onOpenDevice}
				label={
					caps
						? `Tier ${effectiveTier} · ${tierName(effectiveTier)}${capped ? ' (capped)' : ''}`
						: 'Reading device…'
				}
				sx={{
					bgcolor: alpha(colour, 0.18),
					color: colour,
					border: `1px solid ${alpha(colour, 0.5)}`,
				}}
			/>
		</Box>
	);
}
