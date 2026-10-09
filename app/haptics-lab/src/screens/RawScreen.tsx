// Raw tab (for now): the quick play buttons, the waveform editor and the envelope editor
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { Box, Button, Paper, Slider, Stack, TextField, Typography } from '@mui/material';
import * as haptics from '@liminal-hq/plugin-haptics';
import EnvelopeEditor from '../components/EnvelopeEditor';
import { useLab } from '../context/LabContext';

const toNumbers = (text: string) =>
	text
		.split(',')
		.map((s) => parseInt(s.trim()))
		.filter((n) => !isNaN(n));

export default function RawScreen() {
	const { caps, run, setError } = useLab();

	const [timings, setTimings] = useState('0, 50, 50, 100');
	const [amplitudes, setAmplitudes] = useState('0, 128, 0, 255');
	const [repeat, setRepeat] = useState(-1);
	const timingsArr = toNumbers(timings);
	const repeatMax = Math.max(0, timingsArr.length - 1);

	useEffect(() => {
		if (repeat > repeatMax) setRepeat(-1);
	}, [repeat, repeatMax]);

	const playClick = () =>
		run('Predefined click', () =>
			haptics.play({ usage: 'touch', effect: { type: 'predefined', effectId: 'click' } }),
		);

	const playOneShot = () =>
		run('One-shot 50 ms', () =>
			haptics.play({
				usage: 'touch',
				effect: { type: 'oneshot', durationMs: 50, amplitude: 255 },
			}),
		);

	const playWaveform = () => {
		const amps = toNumbers(amplitudes);
		if (timingsArr.length === 0) {
			setError('Timings cannot be empty');
			return Promise.resolve(null);
		}
		return run('Waveform', () =>
			haptics.play({
				usage: 'touch',
				effect: {
					type: 'waveform',
					timingsMs: timingsArr,
					amplitudes: amps.length > 0 ? amps : undefined,
					repeat,
				},
			}),
		);
	};

	const exportJson = async () => {
		const payload = {
			type: 'waveform',
			timingsMs: timingsArr,
			amplitudes: toNumbers(amplitudes),
			repeat,
		};
		try {
			await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
		} catch {
			setError('Could not copy to the clipboard');
		}
	};

	return (
		<Stack spacing={2} sx={{ p: 2 }}>
			<Typography variant="h1">Raw</Typography>

			<Stack direction="row" spacing={2}>
				<Button variant="contained" onClick={() => void playClick()}>
					Play click
				</Button>
				<Button variant="contained" onClick={() => void playOneShot()}>
					One-shot (50 ms)
				</Button>
			</Stack>

			<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
				<Typography variant="h3" gutterBottom>
					Waveform editor
				</Typography>
				<Stack spacing={2}>
					<TextField
						label="Timings (ms), comma separated"
						fullWidth
						value={timings}
						onChange={(e) => setTimings(e.target.value)}
						helperText="For example 0, 50, 50, 100 (off, on, off, on)"
					/>
					<TextField
						label="Amplitudes (0–255), optional"
						fullWidth
						value={amplitudes}
						onChange={(e) => setAmplitudes(e.target.value)}
						helperText="For example 0, 128, 0, 255; must match the timings count"
					/>
					<Box>
						<Typography gutterBottom>
							Repeat index (-1 to disable, 0–{repeatMax} to loop)
						</Typography>
						<Slider
							value={repeat}
							min={-1}
							max={repeatMax}
							step={1}
							marks
							valueLabelDisplay="auto"
							onChange={(_, v) => setRepeat(v as number)}
						/>
					</Box>
					<Stack direction="row" spacing={2}>
						<Button variant="contained" color="secondary" onClick={() => void playWaveform()}>
							Play waveform
						</Button>
						<Button variant="outlined" onClick={() => void exportJson()}>
							Copy JSON
						</Button>
					</Stack>
				</Stack>
			</Paper>

			<EnvelopeEditor caps={caps} onError={setError} />
		</Stack>
	);
}
