// State that survives restarts through localStorage, tolerant of storage being unavailable
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useState } from 'react';

const PREFIX = 'haptics-lab:';

export function readStored<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(PREFIX + key);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

export function writeStored<T>(key: string, value: T): void {
	try {
		localStorage.setItem(PREFIX + key, JSON.stringify(value));
	} catch {
		// Private windows and blocked storage just forget; the app still works.
	}
}

/** Like `useState`, but remembers the value under `key`. */
export function usePersistentState<T>(
	key: string,
	initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
	const [value, setValue] = useState<T>(() => readStored(key, initial));
	const set = useCallback(
		(next: T | ((prev: T) => T)) => {
			setValue((prev) => {
				const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
				writeStored(key, resolved);
				return resolved;
			});
		},
		[key],
	);
	return [value, set];
}
