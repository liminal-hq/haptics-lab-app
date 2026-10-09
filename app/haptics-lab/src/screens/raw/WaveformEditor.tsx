// Raw tab: waveform editor with one row per segment
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import * as haptics from '@liminal-hq/plugin-haptics';
import NoteList from '../../components/NoteList';
import RequestPreview from '../../components/RequestPreview';
import SliderField from '../../components/SliderField';
import { useLab } from '../../context/LabContext';
import {
	DEFAULT_WAVEFORM,
	WAVEFORM_PRESETS,
	waveformEffect,
	waveformLength,
	waveformNotes,
} from '../../utils/rawRequests';
import type { WaveSegment } from '../../utils/rawRequests';

export default function WaveformEditor() {
	const { caps, run } = useLab();
	const [segments, setSegments] = useState<WaveSegment[]>(DEFAULT_WAVEFORM);
	const [repeat, setRepeat] = useState(-1);

	const values = { segments, repeat: Math.min(repeat, segments.length - 1) };
	const request = { usage: 'touch', effect: waveformEffect(values) } as const;
	const update = (i: number, patch: Partial<WaveSegment>) =>
		setSegments((prev) => prev.map((s, k) => (k === i ? { ...s, ...patch } : s)));

	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
				{Object.entries(WAVEFORM_PRESETS).map(([name, preset]) => (
					<Chip key={name} label={name} onClick={() => setSegments(preset)} />
				))}
			</Stack>
			<NoteList notes={waveformNotes(values, caps)} />
			<Stack spacing={1.5}>
				{segments.map((s, i) => (
					<Box key={i} sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'container.high' }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between">
							<Typography variant="caption" sx={{ fontWeight: 600 }}>
								Segment {i + 1}
							</Typography>
							<IconButton
								size="small"
								aria-label={`Delete segment ${i + 1}`}
								disabled={segments.length === 1}
								onClick={() => setSegments((p) => p.filter((_, k) => k !== i))}
							>
								<DeleteOutlineRounded fontSize="small" />
							</IconButton>
						</Stack>
						<SliderField
							label="Length"
							value={s.ms}
							min={0}
							max={500}
							step={5}
							display={`${s.ms} ms`}
							onChange={(v) => update(i, { ms: v })}
						/>
						<SliderField
							label="Amplitude (0 is off)"
							value={s.amplitude}
							min={0}
							max={255}
							step={1}
							onChange={(v) => update(i, { amplitude: v })}
							disabled={caps !== null && !caps.hasAmplitudeControl}
						/>
					</Box>
				))}
			</Stack>
			<Button
				startIcon={<AddRounded />}
				variant="tonal"
				onClick={() => setSegments((p) => [...p, { ms: 50, amplitude: 128 }])}
			>
				Add segment
			</Button>
			<SliderField
				label="Repeat from segment (off to play once)"
				value={values.repeat}
				min={-1}
				max={Math.max(0, segments.length - 1)}
				step={1}
				display={values.repeat < 0 ? 'Off' : String(values.repeat + 1)}
				onChange={setRepeat}
			/>
			<Typography variant="caption" color="text.secondary">
				{waveformLength(segments)} ms in total
			</Typography>
			<RequestPreview request={request} />
			<Button variant="contained" onClick={() => void run('Waveform', () => haptics.play(request))}>
				Play waveform
			</Button>
		</Stack>
	);
}
