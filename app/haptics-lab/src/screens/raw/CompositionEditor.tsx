// Raw tab: composition of primitives, with unsupported steps marked and a neighbour suggested
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import * as haptics from '@liminal-hq/plugin-haptics';
import { PRIMITIVE_IDS } from '@liminal-hq/plugin-haptics';
import NoteList from '../../components/NoteList';
import RequestPreview from '../../components/RequestPreview';
import SliderField from '../../components/SliderField';
import { useLab } from '../../context/LabContext';
import {
	DEFAULT_COMPOSITION,
	compositionEffect,
	compositionHints,
	compositionNotes,
} from '../../utils/rawRequests';
import type { CompositionStepValue } from '../../utils/rawRequests';

export default function CompositionEditor() {
	const { caps, run } = useLab();
	const [steps, setSteps] = useState<CompositionStepValue[]>(DEFAULT_COMPOSITION);
	const hints = compositionHints(caps, steps);
	const request = { usage: 'touch', effect: compositionEffect(steps) } as const;
	const update = (i: number, patch: Partial<CompositionStepValue>) =>
		setSteps((prev) => prev.map((s, k) => (k === i ? { ...s, ...patch } : s)));

	return (
		<Stack spacing={2}>
			<NoteList notes={compositionNotes(caps)} />
			{steps.map((s, i) => (
				<Box key={i} sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'container.high' }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Typography variant="caption" sx={{ fontWeight: 600 }}>
							Step {i + 1}
						</Typography>
						<IconButton
							size="small"
							aria-label={`Delete step ${i + 1}`}
							disabled={steps.length === 1}
							onClick={() => setSteps((p) => p.filter((_, k) => k !== i))}
						>
							<DeleteOutlineRounded fontSize="small" />
						</IconButton>
					</Stack>
					<Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', my: 1 }}>
						{PRIMITIVE_IDS.map((id) => {
							const supported = caps === null || caps.primitives[id]?.supported === true;
							return (
								<Chip
									key={id}
									size="small"
									label={supported ? id : `${id} · missing`}
									color={s.primitive === id ? 'primary' : 'default'}
									variant={s.primitive === id ? 'filled' : 'outlined'}
									onClick={() => update(i, { primitive: id })}
								/>
							);
						})}
					</Stack>
					{hints[i].text ? (
						<Typography
							variant="caption"
							sx={{ display: 'block', color: 'attention.main', mb: 0.5 }}
						>
							{hints[i].text}
						</Typography>
					) : null}
					<SliderField
						label="Scale"
						value={s.scale}
						min={0}
						max={1}
						step={0.05}
						display={s.scale.toFixed(2)}
						onChange={(v) => update(i, { scale: v })}
					/>
					<SliderField
						label="Delay before"
						value={s.delayMs}
						min={0}
						max={500}
						step={5}
						display={`${s.delayMs} ms`}
						onChange={(v) => update(i, { delayMs: v })}
					/>
				</Box>
			))}
			<Button
				startIcon={<AddRounded />}
				variant="tonal"
				onClick={() => setSteps((p) => [...p, { primitive: 'click', scale: 1, delayMs: 60 }])}
			>
				Add step
			</Button>
			<RequestPreview request={request} />
			<Button
				variant="contained"
				onClick={() => void run('Composition', () => haptics.play(request))}
			>
				Play composition
			</Button>
		</Stack>
	);
}
