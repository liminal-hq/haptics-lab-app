/// <reference types="vite/client" />

declare module "@liminal-hq/plugin-haptics" {
  export * from "../../../packages/tauri-plugin-haptics/guest-js/src/types";

  export function capabilities(): Promise<import("../../../packages/tauri-plugin-haptics/guest-js/src/types").Capabilities>;
  export function play(req: import("../../../packages/tauri-plugin-haptics/guest-js/src/types").EffectRequest): Promise<import("../../../packages/tauri-plugin-haptics/guest-js/src/types").PlayResult>;
  export function stop(): Promise<void>;
}
