// Raw tab: envelope editor with sliders bounded by the device's envelope limits
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Alert, Box, Button, IconButton, Stack, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import * as haptics from '@liminal-hq/plugin-haptics';
import NoteList from '../../components/NoteList';
import RequestPreview from '../../components/RequestPreview';
import SliderField from '../../components/SliderField';
import { useLab } from '../../context/LabContext';
import { buildEnvelope, defaultEnvelopeRows } from '../../utils/envelope';
import type { EnvelopeRow } from '../../utils/envelope';
import { envelopeNotes } from '../../utils/rawRequests';

// Used while the device reports no limits, so the sliders still have a range.
const FALLBACK = { minHz: 60, maxHz: 300, minMs: 10, maxMs: 1000 };

export default function EnvelopeEditor() {
	const { caps, run } = useLab();
	const [rows, setRows] = useState<EnvelopeRow[]>(defaultEnvelopeRows());
	const info = caps?.envelopeInfo;
	const unsupported = caps !== null && !caps.envelopeSupported;

	const minHz = info?.frequencyProfile?.minHz ?? FALLBACK.minHz;
	const maxHz = info?.frequencyProfile?.maxHz ?? FALLBACK.maxHz;
	const minMs = info?.minControlPointDurationMs ?? FALLBACK.minMs;
	const maxMs = info?.maxControlPointDurationMs ?? FALLBACK.maxMs;

	const update = (i: number, patch: Partial<EnvelopeRow>) =>
		setRows((prev) => prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));

	const built = buildEnvelope(rows, null, info);
	const request = built.ok ? ({ usage: 'touch', effect: built.effect } as const) : null;

	return (
		<Stack spacing={2}>
			<NoteList notes={envelopeNotes(caps)} />
			{rows.map((r, i) => (
				<Box
					key={i}
					sx={{
						p: 1.5,
						borderRadius: '12px',
						bgcolor: 'container.high',
						opacity: unsupported ? 0.6 : 1,
					}}
				>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Typography variant="caption" sx={{ fontWeight: 600 }}>
							Point {i + 1}
						</Typography>
						<IconButton
							size="small"
							aria-label={`Delete point ${i + 1}`}
							disabled={rows.length === 1}
							onClick={() => setRows((p) => p.filter((_, k) => k !== i))}
						>
							<DeleteOutlineRounded fontSize="small" />
						</IconButton>
					</Stack>
					<SliderField
						label="Amplitude"
						value={r.amplitude}
						min={0}
						max={1}
						step={0.05}
						display={r.amplitude.toFixed(2)}
						onChange={(v) => update(i, { amplitude: v })}
						disabled={unsupported}
					/>
					<SliderField
						label="Frequency"
						value={Math.min(maxHz, Math.max(minHz, r.frequencyHz))}
						min={minHz}
						max={maxHz}
						step={1}
						display={`${r.frequencyHz} Hz`}
						onChange={(v) => update(i, { frequencyHz: v })}
						disabled={unsupported}
					/>
					<SliderField
						label="Duration"
						value={Math.min(maxMs, Math.max(minMs, r.durationMs))}
						min={minMs}
						max={maxMs}
						step={5}
						display={`${r.durationMs} ms`}
						onChange={(v) => update(i, { durationMs: v })}
						disabled={unsupported}
					/>
				</Box>
			))}
			<Button
				startIcon={<AddRounded />}
				variant="tonal"
				disabled={unsupported || (info !== undefined && rows.length >= info.maxSize)}
				onClick={() =>
					setRows((p) => [
						...p,
						{
							amplitude: 0.5,
							frequencyHz: Math.round((minHz + maxHz) / 2),
							durationMs: Math.max(minMs, 100),
						},
					])
				}
			>
				Add point
			</Button>
			{!built.ok ? (
				<Alert severity="warning" variant="outlined" sx={{ py: 0 }}>
					{built.errors.join(' · ')}
				</Alert>
			) : null}
			{request ? <RequestPreview request={request} /> : null}
			<Button
				variant="contained"
				disabled={!request}
				onClick={() => request && void run('Envelope', () => haptics.play(request))}
			>
				{unsupported ? 'Play envelope (falls back to a tick)' : 'Play envelope'}
			</Button>
		</Stack>
	);
}
