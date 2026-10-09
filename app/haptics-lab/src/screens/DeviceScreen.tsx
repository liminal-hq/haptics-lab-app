// Device tab: what the phone can do, the tier ladder and a way to preview a weaker phone
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import {
	Box,
	Button,
	FormControlLabel,
	Paper,
	Stack,
	Switch,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import InfoRounded from '@mui/icons-material/InfoRounded';
import AltRouteRounded from '@mui/icons-material/AltRouteRounded';
import MobileOffRounded from '@mui/icons-material/MobileOffRounded';
import type { Tier } from '@liminal-hq/plugin-haptics';
import { useLab } from '../context/LabContext';
import { useTierColour } from '../components/TierBadge';
import { monoFont } from '../theme/buildTheme';
import { capabilityRows, meanings, primitiveBars, primitiveFootnote } from '../utils/deviceMeaning';
import type { MeaningTone, RowTone } from '../utils/deviceMeaning';
import { TIER_INFO, TIERS } from '../utils/tiers';

function TierTile({
	tier,
	reachable,
	active,
}: {
	tier: Tier;
	reachable: boolean;
	active: boolean;
}) {
	const colour = useTierColour(tier);
	const theme = useTheme();
	return (
		<Box
			sx={{
				flex: '1 1 0',
				minWidth: 56,
				p: 1,
				borderRadius: '12px',
				textAlign: 'center',
				border: '1px solid',
				borderColor: active ? colour : 'transparent',
				bgcolor: active ? alpha(colour, 0.2) : 'container.lowest',
				opacity: reachable ? 1 : 0.6,
			}}
		>
			<Typography
				sx={{
					fontWeight: 700,
					fontSize: 18,
					color: reachable ? colour : theme.palette.outline.variant,
				}}
			>
				{tier}
			</Typography>
			<Typography variant="caption" sx={{ color: reachable ? 'text.primary' : 'outline.main' }}>
				{TIER_INFO[tier].name}
			</Typography>
		</Box>
	);
}

const meaningIcon: Record<MeaningTone, typeof InfoRounded> = {
	ok: CheckCircleRounded,
	info: InfoRounded,
	warn: AltRouteRounded,
	off: MobileOffRounded,
};

function MeaningIcon({ tone }: { tone: MeaningTone }) {
	const theme = useTheme();
	const colours: Record<MeaningTone, string> = {
		ok: theme.palette.primary.main,
		info: theme.palette.attention.main,
		warn: theme.palette.attention.main,
		off: theme.palette.outline.main,
	};
	const Icon = meaningIcon[tone];
	return <Icon sx={{ color: colours[tone], fontSize: 20, mt: '2px' }} />;
}

function rowColour(tone: RowTone, theme: Theme): string {
	switch (tone) {
		case 'yes':
			return theme.palette.primary.main;
		case 'warn':
			return theme.palette.attention.main;
		case 'no':
			return theme.palette.outline.main;
		default:
			return theme.palette.text.primary;
	}
}

export default function DeviceScreen() {
	const { caps, maxTier, setMaxTier, effectiveTier, refreshCaps } = useLab();
	const theme = useTheme();
	const [showJson, setShowJson] = useState(false);
	const tertiary = useTierColour(3);

	if (!caps) {
		return (
			<Box sx={{ p: 2 }}>
				<Typography color="text.secondary">Reading the device…</Typography>
			</Box>
		);
	}

	const name =
		[caps.device.manufacturer, caps.device.model].filter(Boolean).join(' ') || caps.platform;
	const os =
		caps.platform === 'android'
			? `Android ${caps.device.release}${caps.sdkInt ? ` · API ${caps.sdkInt}` : ''}`
			: caps.platform;

	return (
		<Stack spacing={2} sx={{ p: 2 }}>
			<Box>
				<Typography variant="h1">Device</Typography>
				<Typography color="text.secondary" variant="body2">
					{name} · {os} · top tier {caps.topTier}
				</Typography>
			</Box>

			<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
				<Typography variant="h3" gutterBottom>
					Tier ladder
				</Typography>
				<Stack direction="row" spacing={1}>
					{TIERS.map((t) => (
						<TierTile key={t} tier={t} reachable={t <= caps.topTier} active={t === effectiveTier} />
					))}
				</Stack>
				<Stack spacing={1.5} sx={{ mt: 2 }}>
					{meanings(caps).map((m) => (
						<Stack key={m.text} direction="row" spacing={1.5} alignItems="flex-start">
							<MeaningIcon tone={m.tone} />
							<Typography variant="body2">{m.text}</Typography>
						</Stack>
					))}
				</Stack>
			</Paper>

			<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
				<Typography variant="h3">Preview a weaker phone</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
					Caps the tier for the whole app. The Bench and every play use it.
				</Typography>
				<ToggleButtonGroup
					exclusive
					fullWidth
					size="small"
					value={maxTier === null ? 'auto' : maxTier}
					onChange={(_, v: 'auto' | Tier | null) => {
						if (v === null) return;
						setMaxTier(v === 'auto' ? null : v);
					}}
					aria-label="Maximum tier"
				>
					<ToggleButton value="auto">Auto</ToggleButton>
					{([4, 3, 2, 1, 0] as Tier[]).map((t) => (
						<ToggleButton key={t} value={t} disabled={t > caps.topTier}>
							{t === 0 ? 'Off' : t}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
				{caps.topTier < 4 ? (
					<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
						{caps.topTier === 0
							? 'This device has no vibrator, so there is nothing to cap.'
							: `Tiers above ${caps.topTier} are greyed out: this device lacks the hardware for them.`}
					</Typography>
				) : null}
			</Paper>

			<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
					<Typography variant="h3">Capabilities</Typography>
					<Button size="small" variant="tonal" onClick={() => void refreshCaps()}>
						Read again
					</Button>
				</Stack>
				<Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
					{capabilityRows(caps).map((row) => (
						<Stack
							key={row.label}
							direction="row"
							justifyContent="space-between"
							alignItems="flex-start"
							spacing={2}
							sx={{ py: 1 }}
						>
							<Box sx={{ minWidth: 0 }}>
								<Typography variant="body2" sx={{ fontWeight: 500 }}>
									{row.label}
								</Typography>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ fontFamily: monoFont, fontSize: 11, overflowWrap: 'anywhere' }}
								>
									{row.api}
								</Typography>
							</Box>
							<Typography
								variant="body2"
								sx={{ color: rowColour(row.tone, theme), textAlign: 'right', fontWeight: 500 }}
							>
								{row.value}
							</Typography>
						</Stack>
					))}
				</Stack>
			</Paper>

			<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
				<Typography variant="h3" gutterBottom>
					Primitives
				</Typography>
				<Stack spacing={1}>
					{primitiveBars(caps).map((bar) => (
						<Stack key={bar.id} direction="row" alignItems="center" spacing={1.5}>
							<Typography
								sx={{ width: 92, fontFamily: monoFont, fontSize: 12 }}
								color={bar.supported ? 'text.primary' : 'text.secondary'}
							>
								{bar.id}
							</Typography>
							<Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'container.lowest' }}>
								<Box
									sx={{
										width: `${bar.width}%`,
										height: '100%',
										borderRadius: 4,
										bgcolor: bar.supported ? tertiary : 'outline.main',
									}}
								/>
							</Box>
							<Typography
								variant="caption"
								sx={{ width: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
							>
								{bar.value}
							</Typography>
						</Stack>
					))}
				</Stack>
				<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
					{primitiveFootnote(caps)}
				</Typography>
			</Paper>

			<Paper sx={{ p: 2, bgcolor: 'container.low' }}>
				<FormControlLabel
					control={<Switch checked={showJson} onChange={(_, v) => setShowJson(v)} />}
					label="Show capabilities() JSON"
				/>
				{showJson ? (
					<Box
						component="pre"
						sx={{
							m: 0,
							mt: 1,
							p: 1.5,
							overflowX: 'auto',
							borderRadius: '8px',
							bgcolor: 'container.lowest',
							fontFamily: monoFont,
							fontSize: 11,
							lineHeight: '16px',
						}}
					>
						{JSON.stringify(caps, null, 2)}
					</Box>
				) : null}
			</Paper>
		</Stack>
	);
}
