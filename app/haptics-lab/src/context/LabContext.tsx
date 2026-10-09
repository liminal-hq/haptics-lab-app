// Shared lab state: capabilities, the app-wide tier cap and master scale, and the results log
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as haptics from '@liminal-hq/plugin-haptics';
import type { Capabilities, CompiledSegment, PlayResult, Tier } from '@liminal-hq/plugin-haptics';
import { usePersistentState } from '../hooks/usePersistentState';

export type LogEntry = {
	id: number;
	label: string;
	result: PlayResult;
	at: number;
	/** Bars for the transport scope, when the caller knows them. */
	segments?: CompiledSegment[];
};

type Lab = {
	caps: Capabilities | null;
	refreshCaps: () => Promise<void>;
	/** The tier everything plays at: the device top tier, lowered by the app-wide cap. */
	effectiveTier: Tier;
	maxTier: Tier | null;
	setMaxTier: (t: Tier | null) => void;
	masterScale: number;
	setMasterScale: (v: number) => void;
	last: LogEntry | null;
	log: LogEntry[];
	record: (label: string, result: PlayResult, segments?: CompiledSegment[]) => void;
	/** Runs a play call, records its result and shows any rejection. */
	run: (
		label: string,
		fn: () => Promise<PlayResult>,
		segments?: CompiledSegment[],
	) => Promise<PlayResult | null>;
	/** Cancels the motor and every queue and timer. */
	stopAll: () => Promise<void>;
	/** Called by stop so sweeps and timers owned by screens can end too. */
	onStop: (fn: () => void) => () => void;
	error: string | null;
	setError: (message: string | null) => void;
};

const LabContext = createContext<Lab | null>(null);

const LOG_LENGTH = 6;
let nextId = 1;

export function LabProvider({ children }: { children: React.ReactNode }) {
	const [caps, setCaps] = useState<Capabilities | null>(null);
	const [maxTier, setMaxTierState] = usePersistentState<Tier | null>('max-tier', null);
	const [masterScale, setMasterScaleState] = usePersistentState<number>('master-scale', 1);
	const [log, setLog] = useState<LogEntry[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [stopListeners] = useState(() => new Set<() => void>());

	const refreshCaps = useCallback(async () => {
		try {
			setCaps(await haptics.capabilities({ refresh: true }));
		} catch (e: unknown) {
			setError(String(e));
		}
	}, []);

	useEffect(() => {
		haptics
			.capabilities()
			.then(setCaps)
			.catch((e: unknown) => setError(String(e)));
	}, []);

	useEffect(() => {
		haptics.setMaxTier(maxTier);
	}, [maxTier]);

	useEffect(() => {
		haptics.setMasterScale(masterScale);
	}, [masterScale]);

	const record = useCallback((label: string, result: PlayResult, segments?: CompiledSegment[]) => {
		setLog((prev) =>
			[{ id: nextId++, label, result, at: Date.now(), segments }, ...prev].slice(0, LOG_LENGTH),
		);
	}, []);

	const run = useCallback(
		async (label: string, fn: () => Promise<PlayResult>, segments?: CompiledSegment[]) => {
			try {
				const result = await fn();
				record(label, result, segments);
				return result;
			} catch (e: unknown) {
				setError(e instanceof Error ? e.message : String(e));
				return null;
			}
		},
		[record],
	);

	const stopAll = useCallback(async () => {
		stopListeners.forEach((fn) => fn());
		try {
			await haptics.stop();
		} catch (e: unknown) {
			setError(String(e));
		}
	}, [stopListeners]);

	const onStop = useCallback(
		(fn: () => void) => {
			stopListeners.add(fn);
			return () => {
				stopListeners.delete(fn);
			};
		},
		[stopListeners],
	);

	const value = useMemo<Lab>(() => {
		const top = caps?.topTier ?? 0;
		return {
			caps,
			refreshCaps,
			effectiveTier: (maxTier === null ? top : Math.min(top, maxTier)) as Tier,
			maxTier,
			setMaxTier: setMaxTierState,
			masterScale,
			setMasterScale: setMasterScaleState,
			last: log[0] ?? null,
			log,
			record,
			run,
			stopAll,
			onStop,
			error,
			setError,
		};
	}, [
		caps,
		refreshCaps,
		maxTier,
		setMaxTierState,
		masterScale,
		setMasterScaleState,
		log,
		record,
		run,
		stopAll,
		onStop,
		error,
	]);

	return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab(): Lab {
	const lab = useContext(LabContext);
	if (!lab) throw new Error('useLab must be used inside <LabProvider>');
	return lab;
}
