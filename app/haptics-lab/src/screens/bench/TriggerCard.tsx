// Bench: trigger options (usage, policy, scales, system setting) and the Trigger button
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import {
	Box,
	Button,
	Chip,
	FormControlLabel,
	Paper,
	Stack,
	Switch,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from '@mui/material';
import type { HapticsUsage } from '@liminal-hq/plugin-haptics';
import SliderField from '../../components/SliderField';
import { useLab } from '../../context/LabContext';
import { monoFont } from '../../theme/buildTheme';
import {
	DEFAULT_COALESCE_MS,
	POLICY_CHOICES,
	exportJson,
	policyChoice,
	policyFromChoice,
} from '../../utils/bench';
import type { BenchState } from '../../utils/bench';

const USAGES: { id: HapticsUsage; label: string }[] = [
	{ id: 'touch', label: 'Touch' },
	{ id: 'notification', label: 'Notify' },
	{ id: 'alarm', label: 'Alarm' },
	{ id: 'media', label: 'Media' },
];

type Props = {
	state: BenchState;
	onState: (next: BenchState) => void;
	triggerScale: number;
	onTriggerScale: (v: number) => void;
	respect: boolean;
	onRespect: (v: boolean) => void;
	previewTick: boolean;
	onPreviewTick: (v: boolean) => void;
	onTrigger: () => void;
};

export default function TriggerCard(props: Props) {
	const { state, onState } = props;
	const { masterScale, setMasterScale } = useLab();
	const [showExport, setShowExport] = useState(false);
	const choice = policyChoice(state.policy);
	const coalesceMs = typeof state.policy === 'string' ? DEFAULT_COALESCE_MS : state.policy.coalesce;

	return (
		<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
			<Stack spacing={1.5}>
				<Typography variant="h3">Trigger</Typography>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Usage
					</Typography>
					<ToggleButtonGroup
						exclusive
						fullWidth
						size="small"
						value={state.usage}
						aria-label="Usage"
						onChange={(_, v: HapticsUsage | null) => v && onState({ ...state, usage: v })}
					>
						{USAGES.map((u) => (
							<ToggleButton key={u.id} value={u.id}>
								{u.label}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Policy
					</Typography>
					<Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.5 }}>
						{POLICY_CHOICES.map((p) => (
							<Chip
								key={p.id}
								label={p.label}
								color={choice === p.id ? 'primary' : 'default'}
								variant={choice === p.id ? 'filled' : 'outlined'}
								onClick={() => onState({ ...state, policy: policyFromChoice(p.id, coalesceMs) })}
							/>
						))}
					</Stack>
				</Box>
				{choice === 'coalesce' ? (
					<SliderField
						label="Coalesce window"
						value={coalesceMs}
						min={10}
						max={200}
						step={5}
						display={`${coalesceMs} ms`}
						onChange={(v) => onState({ ...state, policy: policyFromChoice('coalesce', v) })}
					/>
				) : null}
				<SliderField
					label="Trigger scale"
					value={props.triggerScale}
					min={0.1}
					max={1}
					step={0.05}
					display={props.triggerScale.toFixed(2)}
					onChange={props.onTriggerScale}
				/>
				<SliderField
					label="Master scale"
					value={masterScale}
					min={0}
					max={1}
					step={0.05}
					display={masterScale.toFixed(2)}
					onChange={setMasterScale}
				/>
				<FormControlLabel
					control={<Switch checked={props.respect} onChange={(_, v) => props.onRespect(v)} />}
					label="Respect system touch feedback"
				/>
				<FormControlLabel
					control={
						<Switch checked={props.previewTick} onChange={(_, v) => props.onPreviewTick(v)} />
					}
					label="Preview tick while adjusting"
				/>
				<Stack direction="row" spacing={1}>
					<Button fullWidth variant="contained" size="large" onClick={props.onTrigger}>
						Trigger
					</Button>
					<Button variant="outlined" size="large" onClick={() => setShowExport((v) => !v)}>
						{showExport ? 'Hide JSON' : 'Export JSON'}
					</Button>
				</Stack>
				{showExport ? (
					<Box
						component="pre"
						sx={{
							m: 0,
							p: 1.5,
							maxHeight: 220,
							overflow: 'auto',
							borderRadius: '8px',
							bgcolor: 'container.lowest',
							fontFamily: monoFont,
							fontSize: 11,
							lineHeight: '16px',
						}}
					>
						{exportJson(state)}
					</Box>
				) : null}
			</Stack>
		</Paper>
	);
}
