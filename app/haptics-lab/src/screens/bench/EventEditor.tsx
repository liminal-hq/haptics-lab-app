// Bench: the selected event's sliders and its "maps to" hint
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Stack, Typography } from '@mui/material';
import type { PatternEvent } from '@liminal-hq/plugin-haptics';
import SliderField from '../../components/SliderField';
import { useLab } from '../../context/LabContext';
import { curvePoints, mapsTo, sharpnessOf } from '../../utils/bench';

type Props = {
	event: PatternEvent;
	index: number;
	onChange: (
		patch: Partial<{ at: number; intensity: number; sharpness: number; duration: number }>,
	) => void;
	onCurve: (point: 0 | 1 | 2, v: number) => void;
	/** Called as an intensity slider moves, for the preview tick. */
	onIntensityDrag: (v: number) => void;
};

export default function EventEditor({ event, index, onChange, onCurve, onIntensityDrag }: Props) {
	const { caps } = useLab();
	const points = curvePoints(event);
	const hint = mapsTo(caps, event);

	return (
		<Stack spacing={0.5}>
			<Typography variant="h3">
				Event {index + 1} · {event.type === 'transient' ? 'Transient' : 'Hum'}
			</Typography>
			<SliderField
				label="At"
				value={event.at}
				min={0}
				max={1000}
				step={5}
				display={`${event.at} ms`}
				onChange={(v) => onChange({ at: v })}
			/>
			{event.type === 'continuous' ? (
				<SliderField
					label="Duration"
					value={event.duration}
					min={20}
					max={1000}
					step={5}
					display={`${event.duration} ms`}
					onChange={(v) => onChange({ duration: v })}
				/>
			) : (
				<SliderField
					label="Intensity"
					value={event.intensity}
					min={0}
					max={1}
					step={0.05}
					display={event.intensity.toFixed(2)}
					onChange={(v) => {
						onChange({ intensity: v });
						onIntensityDrag(v);
					}}
				/>
			)}
			{points
				? (['Start', 'Middle', 'End'] as const).map((label, k) => (
						<SliderField
							key={label}
							label={`Intensity · ${label.toLowerCase()}`}
							value={points[k]}
							min={0}
							max={1}
							step={0.05}
							display={points[k].toFixed(2)}
							onChange={(v) => {
								onCurve(k as 0 | 1 | 2, v);
								onIntensityDrag(v);
							}}
						/>
					))
				: null}
			<SliderField
				label="Sharpness"
				value={sharpnessOf(event)}
				min={0}
				max={1}
				step={0.05}
				display={sharpnessOf(event).toFixed(2)}
				onChange={(v) => onChange({ sharpness: v })}
			/>
			<Typography variant="caption" color="text.secondary">
				{hint.text}
			</Typography>
		</Stack>
	);
}
