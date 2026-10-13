export type OrbitalController = {
  setTheme(theme: 'light' | 'dark'): void;
  setPaused(paused: boolean): void;
  setReveal(reveal: number): void;
  setActive(active: boolean): void;
  replay(): void;
  dispose(): void;
};

export type OrbitalMessage =
  | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; pixelRatio: number; viewportWidth: number; hidden: boolean }
  | { type: 'resize'; width: number; height: number }
  | { type: 'visibility'; hidden: boolean }
  | { type: 'theme'; value: 'light' | 'dark' }
  | { type: 'paused' | 'active'; value: boolean }
  | { type: 'reveal'; value: number }
  | { type: 'replay' | 'dispose' };

export type OrbitalReply =
  | { type: 'supported'; value: boolean }
  | { type: 'ready' }
  | { type: 'error'; message: string };
