// A 0..1 playhead that runs once over a duration, for the Bench timeline
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from 'react';

/** Returns the playhead position (0..1, or null when idle), a `start(ms)` and a `cancel()`. */
export function usePlayhead(): {
	position: number | null;
	start: (durationMs: number) => void;
	cancel: () => void;
} {
	const [position, setPosition] = useState<number | null>(null);
	const frame = useRef<number | null>(null);

	const cancel = useCallback(() => {
		if (frame.current !== null) cancelAnimationFrame(frame.current);
		frame.current = null;
		setPosition(null);
	}, []);

	const start = useCallback(
		(durationMs: number) => {
			cancel();
			if (durationMs <= 0) return;
			const t0 = performance.now();
			const tick = (now: number) => {
				const p = (now - t0) / durationMs;
				if (p >= 1) {
					frame.current = null;
					setPosition(null);
					return;
				}
				setPosition(p);
				frame.current = requestAnimationFrame(tick);
			};
			frame.current = requestAnimationFrame(tick);
		},
		[cancel],
	);

	useEffect(() => cancel, [cancel]);
	return { position, start, cancel };
}
