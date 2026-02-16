import { invoke } from '@tauri-apps/api/core';
import type { Capabilities, EffectRequest, PlayResult } from './types';

export * from './types';

export function capabilities(): Promise<Capabilities> {
	return invoke('plugin:haptics|capabilities');
}

export function play(req: EffectRequest): Promise<PlayResult> {
	return invoke('plugin:haptics|play', { req });
}

export function stop(): Promise<void> {
	return invoke('plugin:haptics|stop');
}
