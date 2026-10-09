// Raw tab: the UI lane, system-style feedback that follows the touch-feedback setting
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import * as haptics from '@liminal-hq/plugin-haptics';
import NoteList from '../../components/NoteList';
import { useLab } from '../../context/LabContext';
import { monoFont } from '../../theme/buildTheme';
import { uiNotes, uiTiles } from '../../utils/rawRequests';

export default function UiLaneEditor() {
	const { caps, run } = useLab();

	return (
		<Stack spacing={1.5}>
			<Typography variant="body2" color="text.secondary">
				System-style feedback through performHapticFeedback. It follows the touch-feedback setting
				and ignores the master scale and the tier cap.
			</Typography>
			<NoteList notes={uiNotes(caps)} />
			<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
				{uiTiles(caps).map((t) => (
					<ButtonBase
						key={t.kind}
						onClick={() => void run(`ui('${t.kind}')`, () => haptics.ui(t.kind))}
						sx={{
							p: 1.5,
							borderRadius: '12px',
							bgcolor: 'container.high',
							textAlign: 'left',
							display: 'block',
							opacity: t.silent ? 0.7 : 1,
						}}
					>
						<Typography variant="body2" sx={{ fontWeight: 600 }}>
							ui('{t.kind}')
						</Typography>
						<Typography
							variant="caption"
							sx={{
								display: 'block',
								fontFamily: monoFont,
								fontSize: 10,
								overflowWrap: 'anywhere',
							}}
							color="text.secondary"
						>
							{t.code}
						</Typography>
						<Typography
							variant="caption"
							sx={{ color: t.silent ? 'attention.main' : 'primary.main' }}
						>
							{t.tag}
						</Typography>
					</ButtonBase>
				))}
			</Box>
		</Stack>
	);
}
