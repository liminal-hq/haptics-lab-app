// Bench tab: author a portable pattern, see what it compiles to, and trigger it
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import * as haptics from '@liminal-hq/plugin-haptics';
import { compilePattern, validatePattern } from '@liminal-hq/plugin-haptics';
import NoteList from '../components/NoteList';
import ResultsLog from '../components/ResultsLog';
import { useLab } from '../context/LabContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { usePlayhead } from '../hooks/usePlayhead';
import {
	DEFAULT_BENCH,
	addHum,
	addTransient,
	buildPattern,
	deleteEvent,
	duplicateEvent,
	setCurvePoint,
	updateEvent,
} from '../utils/bench';
import type { BenchState } from '../utils/bench';
import CompiledCard from './bench/CompiledCard';
import EventEditor from './bench/EventEditor';
import Timeline from './bench/Timeline';
import TriggerCard from './bench/TriggerCard';

const PREVIEW_GAP_MS = 80;

export default function BenchScreen() {
	const { caps, maxTier, masterScale, run, onStop } = useLab();
	const [state, setState] = usePersistentState<BenchState>('bench', DEFAULT_BENCH);
	const [triggerScale, setTriggerScale] = usePersistentState('bench-trigger-scale', 1);
	const [respect, setRespect] = usePersistentState('bench-respect', false);
	const [previewTick, setPreviewTick] = usePersistentState('bench-preview-tick', false);
	const [selected, setSelected] = useState(0);
	const playhead = usePlayhead();
	const lastTick = useRef(0);

	useEffect(() => onStop(playhead.cancel), [onStop, playhead.cancel]);

	const index = Math.min(selected, state.events.length - 1);
	const event = state.events[index];
	const pattern = useMemo(() => buildPattern(state), [state]);
	const issues = useMemo(
		() => validatePattern(pattern, { maxDurationMs: caps?.limits.maxDurationMs }),
		[pattern, caps],
	);

	const report = useMemo(
		() =>
			caps && issues.length === 0
				? compilePattern(pattern, caps, {
						maxTier,
						scale: masterScale * triggerScale,
						usage: state.usage,
						respectSystemSettings: respect,
					})
				: null,
		[caps, issues, pattern, maxTier, masterScale, triggerScale, state.usage, respect],
	);

	const setEvents = (events: BenchState['events']) => setState({ ...state, events });

	const tick = (intensity: number) => {
		const now = performance.now();
		if (!previewTick || now - lastTick.current < PREVIEW_GAP_MS) return;
		lastTick.current = now;
		haptics
			.play({
				usage: 'touch',
				effect: {
					type: 'oneshot',
					durationMs: 12,
					amplitude: Math.max(1, Math.round(intensity * 255)),
				},
			})
			.catch(() => undefined);
	};

	const trigger = async () => {
		if (issues.length) return;
		const id = pattern.id ?? 'bench';
		const played = await run(
			id,
			async () => {
				await haptics.register(id, pattern);
				return haptics.trigger(id, {
					scale: triggerScale,
					usage: state.usage,
					respectSystemSettings: respect,
				});
			},
			report?.segments,
		);
		if (played && report && played.tier > 0) playhead.start(Math.max(report.estimatedMs, 60));
	};

	return (
		<Stack spacing={2} sx={{ p: 2 }}>
			<Box>
				<Typography variant="h1">Bench</Typography>
				<Typography variant="body2" color="text.secondary">
					Author a portable pattern and see what it compiles to on this device.
				</Typography>
			</Box>

			<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
				<Stack spacing={1.5}>
					<TextField
						label="Pattern id"
						size="small"
						value={state.name}
						onChange={(e) => setState({ ...state, name: e.target.value })}
					/>
					<Timeline
						events={state.events}
						selected={index}
						onSelect={setSelected}
						playhead={playhead.position}
					/>
					<Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
						{state.events.map((ev, i) => (
							<Chip
								key={i}
								label={`${i + 1} · ${ev.type === 'transient' ? 'Transient' : 'Hum'} ${ev.at} ms`}
								color={i === index ? 'primary' : 'default'}
								variant={i === index ? 'filled' : 'outlined'}
								onClick={() => setSelected(i)}
							/>
						))}
					</Stack>
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						useFlexGap
						sx={{ flexWrap: 'wrap' }}
					>
						<Button
							size="small"
							variant="tonal"
							onClick={() => {
								setEvents(addTransient(state.events));
								setSelected(state.events.length);
							}}
						>
							Add transient
						</Button>
						<Button
							size="small"
							variant="tonal"
							onClick={() => {
								setEvents(addHum(state.events));
								setSelected(state.events.length);
							}}
						>
							Add hum
						</Button>
						<IconButton
							aria-label="Duplicate event"
							onClick={() => {
								setEvents(duplicateEvent(state.events, index));
								setSelected(index + 1);
							}}
						>
							<ContentCopyRounded fontSize="small" />
						</IconButton>
						<IconButton
							aria-label="Delete event"
							disabled={state.events.length <= 1}
							onClick={() => {
								setEvents(deleteEvent(state.events, index));
								setSelected(Math.max(0, index - 1));
							}}
						>
							<DeleteOutlineRounded fontSize="small" />
						</IconButton>
					</Stack>
					{event ? (
						<EventEditor
							event={event}
							index={index}
							onChange={(patch) => setEvents(updateEvent(state.events, index, patch))}
							onCurve={(point, v) => setEvents(setCurvePoint(state.events, index, point, v))}
							onIntensityDrag={tick}
						/>
					) : null}
					<NoteList
						notes={issues.map((i) => ({
							severity: 'warning' as const,
							text: `${i.path}: ${i.message}`,
						}))}
					/>
				</Stack>
			</Paper>

			<CompiledCard report={report} />
			<TriggerCard
				state={state}
				onState={setState}
				triggerScale={triggerScale}
				onTriggerScale={setTriggerScale}
				respect={respect}
				onRespect={setRespect}
				previewTick={previewTick}
				onPreviewTick={setPreviewTick}
				onTrigger={() => void trigger()}
			/>
			<ResultsLog />
		</Stack>
	);
}
