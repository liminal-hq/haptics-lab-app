// Raw tab: predefined platform effects
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import * as haptics from '@liminal-hq/plugin-haptics';
import type { PredefinedEffectId } from '@liminal-hq/plugin-haptics';
import { useLab } from '../../context/LabContext';
import { PREDEFINED_IDS, predefinedLabel, predefinedTag } from '../../utils/rawRequests';

export default function PredefinedEditor() {
	const { caps, run } = useLab();

	const play = (id: PredefinedEffectId) =>
		void run(`Predefined ${predefinedLabel(id)}`, () =>
			haptics.play({ usage: 'touch', effect: { type: 'predefined', effectId: id } }),
		);

	return (
		<Stack spacing={1.5}>
			<Typography variant="body2" color="text.secondary">
				Platform effects the OS tunes for the motor. Support comes from areEffectsSupported on
				Android 11 and later.
			</Typography>
			<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
				{PREDEFINED_IDS.map((id) => (
					<ButtonBase
						key={id}
						onClick={() => play(id)}
						sx={{
							p: 1.5,
							borderRadius: '12px',
							bgcolor: 'container.high',
							textAlign: 'left',
							display: 'block',
						}}
					>
						<Typography variant="body2" sx={{ fontWeight: 600 }}>
							{predefinedLabel(id)}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{predefinedTag(caps, id)}
						</Typography>
					</ButtonBase>
				))}
			</Box>
		</Stack>
	);
}
