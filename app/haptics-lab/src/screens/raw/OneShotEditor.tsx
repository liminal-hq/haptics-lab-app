// Raw tab: one-shot vibration
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Button, Stack } from '@mui/material';
import * as haptics from '@liminal-hq/plugin-haptics';
import NoteList from '../../components/NoteList';
import RequestPreview from '../../components/RequestPreview';
import SliderField from '../../components/SliderField';
import { useLab } from '../../context/LabContext';
import { oneShotEffect, oneShotNotes } from '../../utils/rawRequests';

export default function OneShotEditor() {
	const { caps, run } = useLab();
	const [durationMs, setDurationMs] = useState(50);
	const [amplitude, setAmplitude] = useState(200);
	const request = { usage: 'touch', effect: oneShotEffect({ durationMs, amplitude }) } as const;

	return (
		<Stack spacing={2}>
			<NoteList notes={oneShotNotes(caps)} />
			<SliderField
				label="Duration"
				value={durationMs}
				min={5}
				max={1000}
				step={5}
				display={`${durationMs} ms`}
				onChange={setDurationMs}
			/>
			<SliderField
				label="Amplitude"
				value={amplitude}
				min={1}
				max={255}
				step={1}
				onChange={setAmplitude}
				disabled={caps !== null && !caps.hasAmplitudeControl}
			/>
			<RequestPreview request={request} />
			<Button
				variant="contained"
				onClick={() => void run(`One-shot ${durationMs} ms`, () => haptics.play(request))}
			>
				Play one-shot
			</Button>
		</Stack>
	);
}
