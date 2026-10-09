// Compare tab: the bench pattern across tiers, the strength ladder and the policy bench
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, Paper, Stack, Typography } from '@mui/material';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import * as haptics from '@liminal-hq/plugin-haptics';
import { compilePattern } from '@liminal-hq/plugin-haptics';
import type { Tier } from '@liminal-hq/plugin-haptics';
import SliderField from '../components/SliderField';
import TierBadge, { useTierColour } from '../components/TierBadge';
import { useLab } from '../context/LabContext';
import { usePersistentState } from '../hooks/usePersistentState';
import {
	DEFAULT_BENCH,
	POLICY_CHOICES,
	buildPattern,
	policyChoice,
	policyFromChoice,
} from '../utils/bench';
import type { BenchState, PolicyChoice } from '../utils/bench';
import {
	RUNGS,
	ladderPrimitives,
	simulatePolicy,
	strengthCaveat,
	strengthRequest,
	sweepTiers,
	thresholdSentence,
	tierLadder,
} from '../utils/compare';
import { tierName } from '../utils/tiers';

const SWEEP_GAP_MS = 500;

function LadderCard() {
	const { caps, run, masterScale, onStop } = useLab();
	const [bench] = usePersistentState<BenchState>('bench', DEFAULT_BENCH);
	const [sweeping, setSweeping] = useState<Tier | null>(null);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const pattern = useMemo(() => buildPattern(bench), [bench]);
	const rows = useMemo(
		() => (caps ? tierLadder(pattern, caps, masterScale) : []),
		[pattern, caps, masterScale],
	);

	const clear = () => {
		timers.current.forEach(clearTimeout);
		timers.current = [];
		setSweeping(null);
	};
	useEffect(() => onStop(clear), [onStop]);
	useEffect(() => clear, []);

	const play = (tier: Tier) => {
		const id = pattern.id ?? 'bench';
		const report = rows.find((r) => r.tier === tier)?.report ?? null;
		return run(
			`${id} at tier ${tier}`,
			async () => {
				await haptics.register(id, pattern);
				return haptics.trigger(id, { tier });
			},
			report?.segments,
		);
	};

	const sweep = () => {
		if (!caps) return;
		clear();
		let at = 0;
		for (const tier of sweepTiers(caps)) {
			const est = rows.find((r) => r.tier === tier)?.report?.estimatedMs ?? 0;
			timers.current.push(
				setTimeout(() => {
					setSweeping(tier);
					void play(tier);
				}, at),
			);
			at += Math.max(est, 60) + SWEEP_GAP_MS;
		}
		timers.current.push(setTimeout(() => setSweeping(null), at));
	};

	return (
		<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
			<Stack spacing={1.5}>
				<Typography variant="h3">Tier ladder</Typography>
				<Typography variant="body2" color="text.secondary">
					“{pattern.id}” compiled at every tier. Tiers this device can't reach are greyed with the
					reason.
				</Typography>
				{rows.map((row) => (
					<Stack
						key={row.tier}
						direction="row"
						spacing={1.5}
						alignItems="center"
						sx={{
							opacity: row.reachable ? 1 : 0.55,
							p: 1,
							borderRadius: '12px',
							bgcolor: sweeping === row.tier ? 'container.highest' : 'transparent',
						}}
					>
						<TierBadge tier={row.tier} mixed={row.report?.mixed} />
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant="body2" sx={{ fontWeight: 500 }}>
								{tierName(row.tier)}
								{row.report ? ` · ${row.report.estimatedMs} ms` : ''}
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
								{row.reason ?? row.report?.notes[0] ?? ''}
							</Typography>
						</Box>
						<Button
							size="small"
							variant="tonal"
							disabled={!row.reachable}
							onClick={() => void play(row.tier)}
							aria-label={`Play at tier ${row.tier}`}
						>
							<PlayArrowRounded fontSize="small" />
						</Button>
					</Stack>
				))}
				<Button variant="contained" onClick={sweep} disabled={!caps}>
					Down the ladder
				</Button>
			</Stack>
		</Paper>
	);
}

function StrengthCard() {
	const { caps, run, effectiveTier } = useLab();
	const options = caps ? ladderPrimitives(caps) : [];
	const [chosen, setChosen] = usePersistentState('compare-primitive', 'click');
	const [felt, setFelt] = usePersistentState<Record<string, boolean>>('compare-felt', {});
	const primitive = options.find((o) => o === chosen) ?? options[0];
	const colour = useTierColour(effectiveTier);
	const caveat = strengthCaveat(effectiveTier);

	if (!caps) return null;

	return (
		<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
			<Stack spacing={1.5}>
				<Typography variant="h3">Strength ladder</Typography>
				{options.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						This device reports no primitives, so there is nothing to climb. The ladder uses a
						one-shot instead.
					</Typography>
				) : (
					<Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
						{options.map((id) => (
							<Chip
								key={id}
								label={id}
								color={primitive === id ? 'primary' : 'default'}
								variant={primitive === id ? 'filled' : 'outlined'}
								onClick={() => setChosen(id)}
							/>
						))}
					</Stack>
				)}
				{caveat ? (
					<Alert severity="info" variant="outlined" sx={{ py: 0 }}>
						{caveat}
					</Alert>
				) : null}
				<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 1 }}>
					{RUNGS.map((v) => {
						const key = String(v);
						return (
							<Stack key={key} alignItems="center" spacing={0.25}>
								<Button
									size="small"
									variant={felt[key] ? 'contained' : 'tonal'}
									sx={{ minWidth: 0, width: '100%', bgcolor: felt[key] ? colour : undefined }}
									disabled={effectiveTier === 0}
									onClick={() => {
										const req = strengthRequest(caps, primitive ?? 'click', v, effectiveTier);
										if (req)
											void run(`${primitive ?? 'click'} × ${v.toFixed(1)}`, () =>
												haptics.play(req),
											);
									}}
								>
									{v.toFixed(1)}
								</Button>
								<Checkbox
									size="small"
									checked={felt[key] === true}
									onChange={(_, c) => setFelt({ ...felt, [key]: c })}
									slotProps={{ input: { 'aria-label': `Felt ${v.toFixed(1)}` } }}
								/>
							</Stack>
						);
					})}
				</Box>
				<Typography variant="body2">{thresholdSentence(felt)}</Typography>
				<Button size="small" variant="text" onClick={() => setFelt({})}>
					Clear marks
				</Button>
			</Stack>
		</Paper>
	);
}

function PolicyCard() {
	const { run, caps, masterScale, maxTier } = useLab();
	const [bench] = usePersistentState<BenchState>('bench', DEFAULT_BENCH);
	const [choice, setChoice] = useState<PolicyChoice>(policyChoice(bench.policy));
	const [count, setCount] = useState(5);
	const [gap, setGap] = useState(25);
	const pattern = useMemo(() => buildPattern(bench), [bench]);
	const policy = policyFromChoice(choice, 60);
	const estimatedMs = useMemo(
		() => (caps ? compilePattern(pattern, caps, { maxTier, scale: masterScale }).estimatedMs : 0),
		[pattern, caps, maxTier, masterScale],
	);
	const sim = useMemo(
		() => simulatePolicy(policy, count, gap, estimatedMs),
		[policy, count, gap, estimatedMs],
	);
	const span =
		Math.max(...sim.outputs.map((o) => o.at + o.dur), sim.triggers[sim.triggers.length - 1] ?? 0) *
			1.06 +
		10;
	const played = useTierColour(4);
	const queued = useTierColour(2);
	const merged = useTierColour(3);

	const fire = async () => {
		const id = `${pattern.id ?? 'bench'}-${choice}`;
		await haptics.register(id, { ...pattern, id, policy });
		for (let i = 0; i < count; i++) {
			void run(`${id} #${i + 1}`, () => haptics.trigger(id));
			if (i < count - 1) await new Promise((r) => setTimeout(r, gap));
		}
	};

	const colourFor = (kind: string) =>
		kind === 'played'
			? played
			: kind === 'queued'
				? queued
				: kind === 'merged'
					? merged
					: undefined;

	return (
		<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
			<Stack spacing={1.5}>
				<Typography variant="h3">Policy bench</Typography>
				<Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
					{POLICY_CHOICES.map((p) => (
						<Chip
							key={p.id}
							label={p.label}
							color={choice === p.id ? 'primary' : 'default'}
							variant={choice === p.id ? 'filled' : 'outlined'}
							onClick={() => setChoice(p.id)}
						/>
					))}
				</Stack>
				<SliderField label="Triggers" value={count} min={2} max={8} step={1} onChange={setCount} />
				<SliderField
					label="Interval"
					value={gap}
					min={5}
					max={200}
					step={5}
					display={`${gap} ms`}
					onChange={setGap}
				/>
				<Box aria-label="Triggers and output" role="img" sx={{ display: 'grid', gap: 0.75 }}>
					<Box
						sx={{
							position: 'relative',
							height: 18,
							bgcolor: 'container.lowest',
							borderRadius: '6px',
						}}
					>
						{sim.triggers.map((t, i) => (
							<Box
								key={i}
								sx={{
									position: 'absolute',
									left: `${(t / span) * 100}%`,
									top: 2,
									bottom: 2,
									width: 2,
									bgcolor: 'text.secondary',
								}}
							/>
						))}
					</Box>
					<Box
						sx={{
							position: 'relative',
							height: 28,
							bgcolor: 'container.lowest',
							borderRadius: '6px',
						}}
					>
						{sim.outputs.map((o, i) => (
							<Box
								key={i}
								sx={{
									position: 'absolute',
									left: `${(o.at / span) * 100}%`,
									width: o.dur ? `${Math.max(0.8, (o.dur / span) * 100)}%` : 2,
									top: o.kind === 'dropped' || o.kind === 'merged' ? 12 : 3,
									height: o.kind === 'dropped' || o.kind === 'merged' ? 4 : 22,
									bgcolor: colourFor(o.kind) ?? 'outline.main',
									borderRadius: '3px',
								}}
							/>
						))}
					</Box>
				</Box>
				<Typography variant="body2">{sim.summary}</Typography>
				<Button variant="contained" onClick={() => void fire()}>
					Fire
				</Button>
			</Stack>
		</Paper>
	);
}

export default function CompareScreen() {
	return (
		<Stack spacing={2} sx={{ p: 2 }}>
			<Box>
				<Typography variant="h1">Compare</Typography>
				<Typography variant="body2" color="text.secondary">
					Run the bench pattern across tiers, strengths and policies.
				</Typography>
			</Box>
			<LadderCard />
			<StrengthCard />
			<PolicyCard />
		</Stack>
	);
}
