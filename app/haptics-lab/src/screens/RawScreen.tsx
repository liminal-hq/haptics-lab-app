// Raw tab: play(EffectRequest), the escape hatch, with one editor per effect type and the UI lane
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, Chip, Stack, Typography } from '@mui/material';
import { usePersistentState } from '../hooks/usePersistentState';
import CompositionEditor from './raw/CompositionEditor';
import EnvelopeEditor from './raw/EnvelopeEditor';
import OneShotEditor from './raw/OneShotEditor';
import PredefinedEditor from './raw/PredefinedEditor';
import UiLaneEditor from './raw/UiLaneEditor';
import WaveformEditor from './raw/WaveformEditor';

const MODES = [
	{ id: 'oneshot', label: 'One-shot' },
	{ id: 'predefined', label: 'Predefined' },
	{ id: 'waveform', label: 'Waveform' },
	{ id: 'composition', label: 'Composition' },
	{ id: 'envelope', label: 'Envelope' },
	{ id: 'ui', label: 'UI lane' },
] as const;

type Mode = (typeof MODES)[number]['id'];

export default function RawScreen() {
	const [mode, setMode] = usePersistentState<Mode>('raw-mode', 'waveform');

	return (
		<Stack spacing={2} sx={{ p: 2 }}>
			<Box>
				<Typography variant="h1">Raw</Typography>
				<Typography variant="body2" color="text.secondary">
					play(EffectRequest), the escape hatch. No compiler, straight to Android.
				</Typography>
			</Box>
			<Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
				{MODES.map((m) => (
					<Chip
						key={m.id}
						label={m.label}
						color={mode === m.id ? 'primary' : 'default'}
						variant={mode === m.id ? 'filled' : 'outlined'}
						onClick={() => setMode(m.id)}
					/>
				))}
			</Stack>
			{mode === 'oneshot' ? <OneShotEditor /> : null}
			{mode === 'predefined' ? <PredefinedEditor /> : null}
			{mode === 'waveform' ? <WaveformEditor /> : null}
			{mode === 'composition' ? <CompositionEditor /> : null}
			{mode === 'envelope' ? <EnvelopeEditor /> : null}
			{mode === 'ui' ? <UiLaneEditor /> : null}
		</Stack>
	);
}
