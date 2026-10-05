import type { BoardState } from './core';

export interface BotStatus {
  phase: 'loading' | 'thinking';
  progress?: number;
}
export interface BotDecision {
  index: number;
  candidates: number;
  backend: 'webgpu' | 'wasm';
  elapsedMs: number;
}
export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError;
  errors?: SerializedError[];
}
export type BotRequest = { type: 'choose'; id: number; state: BoardState };
export type BotResponse =
  | { type: 'status'; id: number; status: BotStatus }
  | { type: 'decision'; id: number; decision: BotDecision }
  | { type: 'error'; id: number; error: SerializedError };

export function serializeError(value: unknown, seen = new Set<unknown>()): SerializedError {
  if (seen.has(value)) return { name: 'Error', message: '[Circular error cause]' };
  seen.add(value);
  if (value instanceof Error || value instanceof DOMException) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...('cause' in value && value.cause !== undefined ? { cause: serializeError(value.cause, seen) } : {}),
      ...(value instanceof AggregateError ? { errors: Array.from(value.errors as unknown[], item => serializeError(item, seen)) } : {}),
    };
  }
  return { name: 'Error', message: String(value) };
}

export function deserializeError(value: SerializedError): Error {
  const error = value.errors
    ? new AggregateError(value.errors.map(deserializeError), value.message)
    : new Error(value.message);
  error.name = value.name;
  if (value.stack) error.stack = value.stack;
  if (value.cause) error.cause = deserializeError(value.cause);
  return error;
}
