// Persistent transport bar: the last result, a mini scope, why it played that way, and Stop
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, IconButton, Typography } from '@mui/material';
import StopRounded from '@mui/icons-material/StopRounded';
import { useLab } from '../context/LabContext';
import TierBadge, { useTierColour } from './TierBadge';

export default function TransportBar() {
	const { last, stopAll, caps } = useLab();
	const tier = last?.result.tier ?? caps?.topTier ?? 0;
	const colour = useTierColour(tier);
	const segments = last?.segments ?? [];
	const span = Math.max(40, ...segments.map((s) => s.atMs + s.durationMs)) * 1.04;

	return (
		<Box
			role="region"
			aria-label="Transport"
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: 1.5,
				px: 2,
				py: 1,
				bgcolor: 'container.high',
				borderTop: 1,
				borderColor: 'divider',
			}}
		>
			{last ? <TierBadge tier={last.result.tier} /> : null}
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
					{last
						? `${last.label} · ${last.result.estimatedMs} ms`
						: caps
							? `Ready · ${caps.device.model || caps.platform}`
							: 'Reading device…'}
				</Typography>
				<Typography
					variant="caption"
					sx={{
						display: 'block',
						color: last?.result.downgraded ? 'attention.main' : 'text.secondary',
					}}
				>
					{last ? (last.result.reason ?? 'Played as compiled') : 'Results show the tier and why'}
				</Typography>
				{segments.length ? (
					<Box
						aria-hidden
						sx={{
							position: 'relative',
							height: 14,
							mt: 0.5,
							display: 'flex',
							alignItems: 'flex-end',
						}}
					>
						{segments.map((s, i) => (
							<Box
								key={i}
								sx={{
									position: 'absolute',
									left: `${(s.atMs / span) * 100}%`,
									width: `${Math.max(0.6, (s.durationMs / span) * 100)}%`,
									height: `${Math.max(12, s.amplitude * 100)}%`,
									bgcolor: colour,
									borderRadius: '2px',
								}}
							/>
						))}
					</Box>
				) : null}
			</Box>
			<IconButton
				aria-label="Stop"
				onClick={() => void stopAll()}
				sx={{
					bgcolor: 'error.main',
					color: 'error.contrastText',
					'&:hover': { bgcolor: 'error.main', filter: 'brightness(1.1)' },
				}}
			>
				<StopRounded />
			</IconButton>
		</Box>
	);
}
