// The last few results, each with its tier, label, estimate and reason
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, Paper, Typography } from '@mui/material';
import { useLab } from '../context/LabContext';
import TierBadge from './TierBadge';

function ago(at: number): string {
	const s = Math.max(0, Math.round((Date.now() - at) / 1000));
	return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
}

export default function ResultsLog() {
	const { log } = useLab();
	return (
		<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
			<Typography variant="h3" gutterBottom>
				Results
			</Typography>
			{log.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					Nothing played yet. Every result lands here with its tier and why.
				</Typography>
			) : (
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: 'auto minmax(0, 1fr) auto',
						gap: 1,
						alignItems: 'start',
					}}
				>
					{log.map((entry) => (
						<Box key={entry.id} sx={{ display: 'contents' }}>
							<TierBadge tier={entry.result.tier} />
							<Box sx={{ minWidth: 0 }}>
								<Typography variant="caption">
									{entry.label} · {entry.result.estimatedMs} ms
									{entry.result.policy && entry.result.policy !== 'played'
										? ` · ${entry.result.policy}`
										: ''}
								</Typography>
								{entry.result.reason ? (
									<Typography variant="caption" sx={{ display: 'block', color: 'attention.main' }}>
										{entry.result.reason}
									</Typography>
								) : null}
							</Box>
							<Typography variant="caption" color="text.secondary">
								{ago(entry.at)}
							</Typography>
						</Box>
					))}
				</Box>
			)}
		</Paper>
	);
}
