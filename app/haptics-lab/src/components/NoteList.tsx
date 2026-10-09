// Capability banners shown before the user plays
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Alert, Stack } from '@mui/material';
import type { Note } from '../utils/rawRequests';

export default function NoteList({ notes }: { notes: Note[] }) {
	if (notes.length === 0) return null;
	return (
		<Stack spacing={1}>
			{notes.map((n) => (
				<Alert key={n.text} severity={n.severity} variant="outlined" sx={{ py: 0 }}>
					{n.text}
				</Alert>
			))}
		</Stack>
	);
}
