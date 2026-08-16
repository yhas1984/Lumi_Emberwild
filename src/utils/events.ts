import Phaser from "phaser";
import type { GameEvents } from "../types";

// Global typed event bus shared by managers, systems and scenes.
export const bus = new Phaser.Events.EventEmitter();

export function emitEvent<K extends keyof GameEvents>(
  event: K,
  payload: GameEvents[K]
): void {
  bus.emit(event, payload);
}

export function onEvent<K extends keyof GameEvents>(
  event: K,
  fn: (payload: GameEvents[K]) => void
): void {
  bus.on(event, fn as (...args: unknown[]) => void);
}

export function offEvent<K extends keyof GameEvents>(
  event: K,
  fn: (payload: GameEvents[K]) => void
): void {
  bus.off(event, fn as (...args: unknown[]) => void);
}
