// Placeholder body for a tab whose screen is built in a later change
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { Box, Typography } from '@mui/material';

export default function ComingSoon({ title, children }: { title: string; children: string }) {
	return (
		<Box sx={{ p: 2 }}>
			<Typography variant="h1" gutterBottom>
				{title}
			</Typography>
			<Typography color="text.secondary">{children}</Typography>
		</Box>
	);
}
