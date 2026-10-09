// A labelled slider with its value shown on the right
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, Slider, Typography } from '@mui/material';

type Props = {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	display?: string;
	disabled?: boolean;
	onChange: (value: number) => void;
};

export default function SliderField({
	label,
	value,
	min,
	max,
	step,
	display,
	disabled,
	onChange,
}: Props) {
	return (
		<Box>
			<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
				<Typography variant="caption" color="text.secondary">
					{label}
				</Typography>
				<Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
					{display ?? value}
				</Typography>
			</Box>
			<Slider
				aria-label={label}
				value={value}
				min={min}
				max={max}
				step={step}
				disabled={disabled}
				onChange={(_, v) => onChange(v as number)}
				sx={{ display: 'block' }}
			/>
		</Box>
	);
}
