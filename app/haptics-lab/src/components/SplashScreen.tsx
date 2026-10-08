// Short splash screen that plays the animated app icon with a matching vibration
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import * as haptics from '@liminal-hq/plugin-haptics';
import iconAnimated from '../../../../assets/icon/icon-animated.svg';
import iconStatic from '../../../../assets/icon/icon.svg';
import { SPLASH_LOOP_MS, splashEffect } from '../utils/splashHaptics';

const FADE_MS = 250;

type Props = {
	onDone: () => void;
};

const prefersReducedMotion = () =>
	typeof window !== 'undefined' &&
	typeof window.matchMedia === 'function' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function SplashScreen({ onDone }: Props) {
	const finished = useRef(false);

	const finish = () => {
		if (finished.current) return;
		finished.current = true;
		void haptics.stop().catch(() => undefined);
		onDone();
	};

	useEffect(() => {
		let cancelled = false;

		// The icon animation starts as soon as it mounts; the vibration joins it once the
		// device's capabilities are known, which takes a few milliseconds.
		haptics
			.capabilities()
			.catch(() => null)
			.then((caps) => {
				if (cancelled) return;
				return haptics.play({
					usage: 'touch',
					respectSystemSettings: true,
					effect: splashEffect(caps),
				});
			})
			.catch((e: unknown) => console.warn('Splash haptics unavailable:', e));

		const timer = window.setTimeout(finish, SPLASH_LOOP_MS + FADE_MS);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, []);

	return (
		<Box
			role="presentation"
			onClick={finish}
			sx={{
				position: 'fixed',
				inset: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 3,
				bgcolor: '#050507',
				color: '#e6e9ee',
				cursor: 'pointer',
				animation: `splash-out ${FADE_MS}ms ease-in ${SPLASH_LOOP_MS}ms forwards`,
				'@keyframes splash-out': { to: { opacity: 0 } },
				'@media (prefers-reduced-motion: reduce)': { animation: 'none' },
			}}
		>
			<Box
				component="img"
				src={prefersReducedMotion() ? iconStatic : iconAnimated}
				alt="Haptics Lab"
				sx={{ width: 'min(60vw, 240px)', height: 'auto', borderRadius: '22%' }}
			/>
			<Typography variant="h5" component="h1" sx={{ letterSpacing: '-0.01em' }}>
				Haptics Lab
			</Typography>
		</Box>
	);
}
