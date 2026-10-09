// Bench: what the pattern compiles to on this device, with the tier control
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { CompileReport, Tier } from '@liminal-hq/plugin-haptics';
import TierBadge, { useTierColour } from '../../components/TierBadge';
import { useLab } from '../../context/LabContext';
import { tierName } from '../../utils/tiers';

function Bars({ report }: { report: CompileReport }) {
	const colour = useTierColour(report.tier);
	const t2 = useTierColour(2);
	const span = Math.max(40, ...report.segments.map((s) => s.atMs + s.durationMs)) * 1.04;
	if (report.segments.length === 0) return null;
	return (
		<Box
			aria-label="Compiled segments"
			role="img"
			sx={{ position: 'relative', height: 56, bgcolor: 'container.lowest', borderRadius: '8px' }}
		>
			{report.segments.map((s, i) => (
				<Box
					key={i}
					sx={{
						position: 'absolute',
						bottom: 0,
						left: `${(s.atMs / span) * 100}%`,
						width: `${Math.max(0.6, (s.durationMs / span) * 100)}%`,
						height: `${Math.max(10, s.amplitude * 100)}%`,
						bgcolor: s.tier === 2 && report.tier === 3 ? t2 : colour,
						borderRadius: '2px 2px 0 0',
					}}
				/>
			))}
		</Box>
	);
}

export default function CompiledCard({ report }: { report: CompileReport | null }) {
	const { caps, maxTier, setMaxTier } = useLab();
	const top = caps?.topTier ?? 0;

	return (
		<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
			<Stack spacing={1.5}>
				<Typography variant="h3">Compiled</Typography>
				<ToggleButtonGroup
					exclusive
					fullWidth
					size="small"
					value={maxTier === null ? 'auto' : maxTier}
					aria-label="Compile tier"
					onChange={(_, v: 'auto' | Tier | null) => {
						if (v !== null) setMaxTier(v === 'auto' ? null : v);
					}}
				>
					<ToggleButton value="auto">Auto</ToggleButton>
					{([4, 3, 2, 1, 0] as Tier[]).map((t) => (
						<ToggleButton key={t} value={t} disabled={t > top}>
							{t === 0 ? 'Off' : t}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
				{report ? (
					<>
						<Stack direction="row" spacing={1} alignItems="center">
							<TierBadge tier={report.tier} mixed={report.mixed} />
							<Typography variant="body2">
								{tierName(report.tier)} · {report.estimatedMs} ms
							</Typography>
						</Stack>
						<Bars report={report} />
						<Stack spacing={0.5}>
							{report.notes.map((n) => (
								<Typography key={n} variant="caption" color="text.secondary">
									{n}
								</Typography>
							))}
						</Stack>
					</>
				) : (
					<Typography variant="body2" color="text.secondary">
						Reading the device…
					</Typography>
				)}
			</Stack>
		</Paper>
	);
}
