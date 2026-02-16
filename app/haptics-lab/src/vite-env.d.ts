/// <reference types="vite/client" />

declare module '@liminal-hq/plugin-haptics' {
	export * from '../../../plugin/tauri-plugin-haptics/guest-js/src/types';

	export function capabilities(): Promise<
		import('../../../plugin/tauri-plugin-haptics/guest-js/src/types').Capabilities
	>;
	export function play(
		req: import('../../../plugin/tauri-plugin-haptics/guest-js/src/types').EffectRequest,
	): Promise<import('../../../plugin/tauri-plugin-haptics/guest-js/src/types').PlayResult>;
	export function stop(): Promise<void>;
}
