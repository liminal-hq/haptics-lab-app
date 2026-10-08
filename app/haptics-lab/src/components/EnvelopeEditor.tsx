// Editor for authoring and playing envelope waveform effects
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import * as haptics from '@liminal-hq/plugin-haptics';
import { buildEnvelope, defaultEnvelopeRows, type EnvelopeRow } from '../utils/envelope';

type Props = {
	caps: haptics.Capabilities | null;
	onError: (message: string) => void;
};

function EnvelopePreview({ rows }: { rows: EnvelopeRow[] }) {
	const total = rows.reduce((t, r) => t + (Number(r.durationMs) > 0 ? Number(r.durationMs) : 0), 0);
	if (total === 0) return null;
	let x = 0;
	const pts = [`0,40`];
	for (const r of rows) {
		const d = Number(r.durationMs) > 0 ? Number(r.durationMs) : 0;
		const a = Math.min(1, Math.max(0, Number(r.amplitude) || 0));
		x += d;
		pts.push(`${(x / total) * 100},${40 - a * 36}`);
	}
	return (
		<svg
			viewBox="0 0 100 40"
			preserveAspectRatio="none"
			role="img"
			aria-label="Envelope amplitude preview"
			style={{ width: '100%', height: 80 }}
		>
			<polyline points={pts.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	);
}

export default function EnvelopeEditor({ caps, onError }: Props) {
	const [rows, setRows] = useState<EnvelopeRow[]>(defaultEnvelopeRows);
	const [initialHz, setInitialHz] = useState('');
	const info = caps?.envelopeInfo;
	const result = useMemo(() => buildEnvelope(rows, initialHz, info), [rows, initialHz, info]);
	const supported = caps?.envelopeSupported === true;

	const update = (i: number, key: keyof EnvelopeRow, value: string) =>
		setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

	const play = async () => {
		if (!result.ok) return;
		try {
			const res = await haptics.play({ usage: 'touch', effect: result.effect });
			if (res.downgraded) onError(`Downgraded: ${res.downgradeReason ?? 'unknown reason'}`);
		} catch (e: unknown) {
			onError(String(e));
		}
	};

	const exportJson = async () => {
		if (!result.ok) return;
		try {
			await navigator.clipboard.writeText(JSON.stringify(result.effect, null, 2));
		} catch (e: unknown) {
			onError(String(e));
		}
	};

	return (
		<Paper sx={{ p: 2, mt: 2 }}>
			<Typography variant="h6" gutterBottom>
				Envelope Editor
			</Typography>
			{!supported && (
				<Alert severity="info" sx={{ mb: 2 }}>
					Envelope effects need Android 16 (API 36) and device support. Playback will fall back to a
					tick.
				</Alert>
			)}
			<Stack spacing={2}>
				<TextField
					label="Initial frequency (Hz) - optional"
					size="small"
					value={initialHz}
					onChange={(e) => setInitialHz(e.target.value)}
					helperText={
						info?.frequencyProfile
							? `Device range ${info.frequencyProfile.minHz}–${info.frequencyProfile.maxHz} Hz`
							: undefined
					}
				/>
				{rows.map((r, i) => (
					<Stack key={i} direction="row" spacing={1} alignItems="center">
						<Typography sx={{ minWidth: 20 }}>{i + 1}</Typography>
						<TextField
							label="Amp 0–1"
							size="small"
							value={r.amplitude}
							onChange={(e) => update(i, 'amplitude', e.target.value)}
						/>
						<TextField
							label="Hz"
							size="small"
							value={r.frequencyHz}
							onChange={(e) => update(i, 'frequencyHz', e.target.value)}
						/>
						<TextField
							label="ms"
							size="small"
							value={r.durationMs}
							onChange={(e) => update(i, 'durationMs', e.target.value)}
						/>
						<IconButton
							aria-label={`Remove point ${i + 1}`}
							onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
						>
							✕
						</IconButton>
					</Stack>
				))}
				<Box>
					<Button
						size="small"
						onClick={() =>
							setRows((rs) => [
								...rs,
								{
									amplitude: '0.5',
									frequencyHz: rs[rs.length - 1]?.frequencyHz ?? '150',
									durationMs: '100',
								},
							])
						}
					>
						Add point
					</Button>
				</Box>
				<EnvelopePreview rows={rows} />
				{!result.ok && (
					<Alert severity="warning">
						{result.errors.map((m) => (
							<div key={m}>{m}</div>
						))}
					</Alert>
				)}
				<Stack direction="row" spacing={2}>
					<Button variant="contained" color="secondary" disabled={!result.ok} onClick={play}>
						Play Envelope
					</Button>
					<Button variant="outlined" disabled={!result.ok} onClick={exportJson}>
						Export JSON
					</Button>
				</Stack>
			</Stack>
		</Paper>
	);
}
