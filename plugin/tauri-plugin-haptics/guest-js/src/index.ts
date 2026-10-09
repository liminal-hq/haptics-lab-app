import { invoke } from '@tauri-apps/api/core';
import type { Capabilities, CompiledStep, EffectRequest, PlayResult, UiKind } from './types';

export * from './types';

export function capabilities(): Promise<Capabilities> {
	return invoke('plugin:haptics|capabilities');
}

export function play(req: EffectRequest): Promise<PlayResult> {
	return invoke('plugin:haptics|play', { req });
}

export function playSteps(steps: CompiledStep[]): Promise<PlayResult> {
	return invoke('plugin:haptics|play_steps', { steps });
}

export function ui(kind: UiKind): Promise<PlayResult> {
	return invoke('plugin:haptics|ui', { kind });
}

export function stop(): Promise<void> {
	return invoke('plugin:haptics|stop');
}
