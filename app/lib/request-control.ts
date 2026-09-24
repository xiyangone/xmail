export interface RequestTicket {
  signal: AbortSignal;
  isCurrent: () => boolean;
  finish: () => boolean;
}

/** Own one component's requests; superseded work cannot publish state or timers. */
export function createRequestController() {
  let generation = 0;
  let active: AbortController | null = null;

  return {
    get pending() {
      return active !== null;
    },
    start(): RequestTicket {
      active?.abort();
      const controller = new AbortController();
      const currentGeneration = ++generation;
      active = controller;
      const isCurrent = () => generation === currentGeneration && !controller.signal.aborted;

      return {
        signal: controller.signal,
        isCurrent,
        finish() {
          if (!isCurrent() || active !== controller) return false;
          active = null;
          return true;
        },
      };
    },
    cancel() {
      generation += 1;
      active?.abort();
      active = null;
    },
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
