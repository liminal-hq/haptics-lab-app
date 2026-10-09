// Cues tab: a game's cue table, compiled for this device, with play-all and every-tier runs
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import * as haptics from '@liminal-hq/plugin-haptics';
import type { Tier } from '@liminal-hq/plugin-haptics';
import NoteList from '../components/NoteList';
import ResultsLog from '../components/ResultsLog';
import TierBadge from '../components/TierBadge';
import { useLab } from '../context/LabContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { eventSummary, policyLabel } from '../utils/bench';
import { cueRows, mergeCues, parseImport } from '../utils/cues';
import type { CueRow } from '../utils/cues';
import { SEED_CUES } from '../utils/seedCues';
import type { Cue } from '../utils/seedCues';
import { sweepTiers } from '../utils/compare';

const GAP_MS = 350;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Props = {
	/** Opens a pattern cue on the Bench. */
	onOpenBench: (cue: Cue) => void;
	/** Opens the UI lane on the Raw tab. */
	onOpenUiLane: () => void;
};

export default function CuesScreen({ onOpenBench, onOpenUiLane }: Props) {
	const { caps, maxTier, masterScale, run, onStop, stopCount, setError } = useLab();
	const [cues, setCues] = usePersistentState<Cue[]>('cues', SEED_CUES);
	const [importing, setImporting] = useState(false);
	const [text, setText] = useState('');
	const [importErrors, setImportErrors] = useState<string[]>([]);
	const [running, setRunning] = useState<string | null>(null);
	const runId = useRef(0); // each run takes the next id, so an older run ends when a newer one starts

	useEffect(() => onStop(() => setRunning(null)), [onStop]);

	const rows = useMemo(
		() => (caps ? cueRows(cues, caps, { maxTier, scale: masterScale }) : []),
		[cues, caps, maxTier, masterScale],
	);

	// Register every pattern once the device is known so a play is a single trigger. Each cue is
	// registered on its own, so one bad cue can't stop the rest from registering.
	useEffect(() => {
		if (!caps) return;
		for (const cue of cues) {
			if (!cue.pattern) continue;
			haptics
				.register(cue.id, cue.pattern)
				.catch((e: unknown) =>
					setError(`${cue.name}: ${e instanceof Error ? e.message : String(e)}`),
				);
		}
	}, [caps, cues, setError]);

	const play = (row: CueRow, tier?: Tier) => {
		const { cue } = row;
		if (cue.ui) return run(`ui('${cue.ui}')`, () => haptics.ui(cue.ui!));
		return run(
			tier === undefined ? cue.name : `${cue.name} at tier ${tier}`,
			() => haptics.trigger(cue.id, tier === undefined ? {} : { tier }),
			row.report?.segments,
		);
	};

	const playSequence = async (label: string, steps: { row: CueRow; tier?: Tier }[]) => {
		const mine = ++runId.current;
		const stoppedAt = stopCount();
		// Ends on Stop (even after leaving this tab) or when a newer run has started.
		const live = () => runId.current === mine && stopCount() === stoppedAt;
		setRunning(label);
		for (const { row, tier } of steps) {
			if (!live()) break;
			await play(row, tier);
			await wait(Math.max(row.estimatedMs, 40) + GAP_MS);
		}
		if (runId.current === mine) setRunning(null);
	};

	const playAll = () =>
		void playSequence(
			'all',
			rows.map((row) => ({ row })),
		);

	const everyTier = () => {
		if (!caps) return;
		const tiers = sweepTiers(caps);
		void playSequence(
			'tiers',
			rows.filter((r) => r.cue.pattern).flatMap((row) => tiers.map((tier) => ({ row, tier }))),
		);
	};

	const doImport = () => {
		const result = parseImport(text, caps?.limits.maxDurationMs);
		if (!result.ok) {
			setImportErrors(result.errors);
			return;
		}
		setImportErrors([]);
		setCues(mergeCues(cues, result.cues));
		setText('');
		setImporting(false);
	};

	return (
		<Stack spacing={2} sx={{ p: 2 }}>
			<Box>
				<Typography variant="h1">Cues</Typography>
				<Typography variant="body2" color="text.secondary">
					Lieutenant Fizz cue table · {cues.length} cues · compiled for{' '}
					{caps?.device.model || 'this device'}
				</Typography>
			</Box>

			<Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
				<Button variant="contained" onClick={playAll} disabled={!caps || running !== null}>
					Play all
				</Button>
				<Button variant="tonal" onClick={everyTier} disabled={!caps || running !== null}>
					Every cue at every tier
				</Button>
				<Button variant="outlined" onClick={() => setImporting((v) => !v)}>
					Import
				</Button>
			</Stack>
			{running ? (
				<Typography variant="caption" color="text.secondary">
					{running === 'all' ? 'Playing every cue' : 'Playing every cue at every tier'}. Stop ends
					the run.
				</Typography>
			) : null}

			{importing ? (
				<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
					<Stack spacing={1.5}>
						<Typography variant="body2" color="text.secondary">
							Paste one pattern, or a table of patterns keyed by id. Cues with the same id are
							replaced.
						</Typography>
						<TextField
							label="Pattern JSON"
							multiline
							minRows={5}
							maxRows={12}
							value={text}
							onChange={(e) => setText(e.target.value)}
						/>
						<NoteList
							notes={importErrors.map((t) => ({ severity: 'warning' as const, text: t }))}
						/>
						<Stack direction="row" spacing={1}>
							<Button variant="contained" disabled={!text.trim()} onClick={doImport}>
								Add cues
							</Button>
							<Button
								variant="text"
								onClick={() => {
									setCues(SEED_CUES);
									setImportErrors([]);
								}}
							>
								Reset to Lieutenant Fizz
							</Button>
						</Stack>
					</Stack>
				</Paper>
			) : null}

			<Paper sx={{ p: 0, bgcolor: 'container.low', overflow: 'hidden' }}>
				{rows.length === 0 ? (
					<Alert severity="info" variant="outlined">
						Reading the device…
					</Alert>
				) : (
					rows.map((row, i) => (
						<Stack
							key={row.cue.id}
							direction="row"
							spacing={1.5}
							alignItems="center"
							sx={{ px: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}
						>
							<Box sx={{ flex: 1, minWidth: 0 }}>
								<Button
									variant="text"
									size="small"
									sx={{ p: 0, minHeight: 0, justifyContent: 'flex-start', textAlign: 'left' }}
									onClick={() => (row.cue.pattern ? onOpenBench(row.cue) : onOpenUiLane())}
								>
									{row.cue.name}
								</Button>
								<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
									{row.cue.pattern
										? `${eventSummary(row.cue.pattern.events)} · ${policyLabel(row.cue.pattern.policy ?? 'interrupt')}`
										: `${row.cue.ui} · ${row.cue.uiNote ?? 'UI lane'}`}
								</Typography>
							</Box>
							<TierBadge tier={row.tier} mixed={row.mixed} />
							<Typography
								variant="caption"
								sx={{ width: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
							>
								{row.estimatedMs} ms
							</Typography>
							<IconButton aria-label={`Play ${row.cue.name}`} onClick={() => void play(row)}>
								<PlayArrowRounded />
							</IconButton>
						</Stack>
					))
				)}
			</Paper>

			<ResultsLog />
		</Stack>
	);
}
