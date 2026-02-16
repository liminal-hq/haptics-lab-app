import { debug, error, info, trace, warn } from '@tauri-apps/plugin-log';

type ConsoleFn = 'log' | 'debug' | 'info' | 'warn' | 'error';
type PluginLogger = (message: string) => Promise<void>;

function toMessage(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}
	if (value instanceof Error) {
		return `${value.name}: ${value.message}`;
	}
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function forwardConsole(fnName: ConsoleFn, logger: PluginLogger) {
	const original = console[fnName];
	console[fnName] = (...args: unknown[]) => {
		original(...args);
		void logger(args.map(toMessage).join(' '));
	};
}

export function setupLogger() {
	forwardConsole('log', trace);
	forwardConsole('debug', debug);
	forwardConsole('info', info);
	forwardConsole('warn', warn);
	forwardConsole('error', error);
}

export { trace, debug, info, warn, error };
