// Read-only JSON preview of the request an editor will send
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, Typography } from '@mui/material';
import type { EffectRequest } from '@liminal-hq/plugin-haptics';
import { monoFont } from '../theme/buildTheme';
import { previewJson } from '../utils/rawRequests';

export default function RequestPreview({ request }: { request: EffectRequest }) {
	return (
		<Box>
			<Typography variant="caption" color="text.secondary">
				Request
			</Typography>
			<Box
				component="pre"
				sx={{
					m: 0,
					mt: 0.5,
					p: 1.5,
					overflowX: 'auto',
					overflowY: 'hidden',
					touchAction: 'pan-x pan-y',
					borderRadius: '8px',
					bgcolor: 'container.lowest',
					fontFamily: monoFont,
					fontSize: 11,
					lineHeight: '16px',
				}}
			>
				{previewJson(request)}
			</Box>
		</Box>
	);
}
