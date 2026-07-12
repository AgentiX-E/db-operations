import type { ConfigChangeHandler } from './types.js';

export type { ConfigChangeHandler };

export interface IConfigWatcher {
  watch(key: string, handler: ConfigChangeHandler): void;
  unwatch(key: string, handler?: ConfigChangeHandler): void;
  set(key: string, value: unknown): Promise<void>;
  get<T>(key: string): T | undefined;
  snapshot(): Record<string, unknown>;
}
