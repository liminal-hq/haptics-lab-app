// Bench timeline: intensity line, sharpness dashes, numbered event handles and a playhead
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { PatternEvent } from '@liminal-hq/plugin-haptics';
import { eventEnd, patternLength, sharpnessOf } from '../../utils/bench';

const W = 320;
const H = 150;
const PAD = 14;
const BASE = H - 24;
const TOP = 16;

type Props = {
	events: PatternEvent[];
	selected: number;
	onSelect: (index: number) => void;
	/** Where the playhead is, in ms from the start, while the pattern plays. */
	playheadMs: number | null;
};

function levelAt(ev: Extract<PatternEvent, { type: 'continuous' }>, x: number): number {
	if (typeof ev.intensity === 'number') return ev.intensity;
	const pts = ev.intensity;
	for (let k = 1; k < pts.length; k++) {
		if (x <= pts[k].t) {
			const a = pts[k - 1];
			const b = pts[k];
			return a.v + (b.v - a.v) * ((x - a.t) / (b.t - a.t || 1));
		}
	}
	return pts[pts.length - 1].v;
}

export default function Timeline({ events, selected, onSelect, playheadMs }: Props) {
	const theme = useTheme();
	const span = Math.max(100, patternLength(events)) * 1.06;
	const x = (ms: number) => PAD + (ms / span) * (W - PAD * 2);
	const y = (v: number) => BASE - v * (BASE - TOP);

	return (
		<Box>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				role="img"
				aria-label="Pattern timeline"
				style={{ width: '100%', display: 'block' }}
			>
				<rect x="0" y="0" width={W} height={H} rx="12" fill={theme.palette.container.lowest} />
				<line x1={PAD} x2={W - PAD} y1={BASE} y2={BASE} stroke={theme.palette.outline.variant} />
				{events.map((ev, i) => {
					const active = i === selected;
					const stroke = active ? theme.palette.primary.main : theme.palette.text.secondary;
					const sharp = y(sharpnessOf(ev));
					if (ev.type === 'transient') {
						return (
							<g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
								<line
									x1={x(ev.at)}
									x2={x(ev.at)}
									y1={BASE}
									y2={y(ev.intensity)}
									stroke={stroke}
									strokeWidth={active ? 3 : 2}
									strokeLinecap="round"
								/>
								<line
									x1={x(ev.at) - 6}
									x2={x(ev.at) + 6}
									y1={sharp}
									y2={sharp}
									stroke={theme.palette.tertiary.main}
									strokeWidth="2"
									strokeDasharray="3 2"
								/>
								<circle
									cx={x(ev.at)}
									cy={y(ev.intensity)}
									r={active ? 8 : 6}
									fill={active ? theme.palette.primary.main : theme.palette.container.highest}
									stroke={stroke}
								/>
								<text
									x={x(ev.at)}
									y={y(ev.intensity) + 3.5}
									textAnchor="middle"
									fontSize="9"
									fontWeight="700"
									fill={active ? theme.palette.primary.contrastText : theme.palette.text.primary}
								>
									{i + 1}
								</text>
							</g>
						);
					}
					const steps = 24;
					const points = Array.from({ length: steps + 1 }, (_, k) => {
						const t = k / steps;
						return `${x(ev.at + ev.duration * t)},${y(levelAt(ev, t))}`;
					}).join(' ');
					return (
						<g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
							<polygon
								points={`${x(ev.at)},${BASE} ${points} ${x(eventEnd(ev))},${BASE}`}
								fill={stroke}
								opacity="0.18"
							/>
							<polyline
								points={points}
								fill="none"
								stroke={stroke}
								strokeWidth={active ? 3 : 2}
								strokeLinejoin="round"
							/>
							<line
								x1={x(ev.at)}
								x2={x(eventEnd(ev))}
								y1={sharp}
								y2={sharp}
								stroke={theme.palette.tertiary.main}
								strokeWidth="2"
								strokeDasharray="4 3"
							/>
							<circle
								cx={x(ev.at)}
								cy={y(levelAt(ev, 0))}
								r={active ? 8 : 6}
								fill={active ? theme.palette.primary.main : theme.palette.container.highest}
								stroke={stroke}
							/>
							<text
								x={x(ev.at)}
								y={y(levelAt(ev, 0)) + 3.5}
								textAnchor="middle"
								fontSize="9"
								fontWeight="700"
								fill={active ? theme.palette.primary.contrastText : theme.palette.text.primary}
							>
								{i + 1}
							</text>
						</g>
					);
				})}
				{playheadMs !== null ? (
					<line
						x1={x(Math.min(playheadMs, span))}
						x2={x(Math.min(playheadMs, span))}
						y1={TOP - 6}
						y2={BASE + 4}
						stroke={theme.palette.error.main}
						strokeWidth="2"
					/>
				) : null}
			</svg>
			<Typography variant="caption" color="text.secondary">
				Line is intensity, dashes are sharpness. Tap a handle to edit that event.
			</Typography>
		</Box>
	);
}
