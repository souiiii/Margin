import { AppError } from "./errors";

type Listener = (event: Record<string, unknown>) => void;
type Flight = {
  promise: Promise<unknown>;
  controller: AbortController;
  listeners: Set<Listener>;
};
const runtime = globalThis as unknown as {
  marginFlights?: Map<string, Flight>;
  marginPlanPause?: { epoch: number; error: AppError };
  marginInferenceCount?: number;
  marginInferenceQueue?: (() => void)[];
};
const flights: Map<string, Flight> = (runtime.marginFlights ??= new Map<
  string,
  Flight
>());

// Join identical work, but let each caller cancel independently. Only the last
// departing consumer cancels the provider request.
export function sharedGeneration<T>(
  key: string,
  signal: AbortSignal,
  listener: Listener,
  work: (signal: AbortSignal, progress: Listener) => Promise<T>,
): Promise<T> {
  signal.throwIfAborted();
  let flight = flights.get(key);
  if (!flight) {
    const controller = new AbortController();
    const listeners = new Set<Listener>();
    flight = {
      controller,
      listeners,
      promise: Promise.resolve()
        .then(() =>
          work(controller.signal, (event) => {
            for (const receive of listeners) receive(event);
          }),
        )
        .finally(() => {
          if (flights.get(key) === flight) flights.delete(key);
        }),
    };
    flights.set(key, flight);
  } else
    listener({
      type: "status",
      message: "Joining the request already in progress",
    });
  const current = flight;
  const receive: Listener = (event) => listener(event);
  return new Promise<T>((resolve, reject) => {
    let finished = false;
    const finish = (error: unknown, value?: unknown) => {
      if (finished) return;
      finished = true;
      current.listeners.delete(receive);
      signal.removeEventListener("abort", cancel);
      if (!current.listeners.size && flights.get(key) === current) {
        flights.delete(key);
        current.controller.abort();
      }
      if (error) reject(error);
      else resolve(value as T);
    };
    const cancel = () =>
      finish(signal.reason || new DOMException("Cancelled", "AbortError"));
    current.listeners.add(receive);
    signal.addEventListener("abort", cancel, { once: true });
    current.promise.then(
      (value) => finish(null, value),
      (error) => finish(error),
    );
    if (signal.aborted) cancel();
  });
}

export function requirePlanAvailable(epoch: number) {
  if (runtime.marginPlanPause?.epoch === epoch)
    throw runtime.marginPlanPause.error;
}
export function pausePlan(epoch: number, error: unknown) {
  if (
    error instanceof AppError &&
    error.code === "subscription_sharing_usage_limit_exceeded"
  )
    runtime.marginPlanPause = { epoch, error };
}
export function resumePlan() {
  delete runtime.marginPlanPause;
}

// Cache hits and callers joining existing work never occupy an inference slot.
export async function inferenceSlot(signal: AbortSignal, queued: () => void) {
  signal.throwIfAborted();
  const queue = (runtime.marginInferenceQueue ??= []);
  if ((runtime.marginInferenceCount || 0) >= 2) {
    queued();
    await new Promise<void>((resolve, reject) => {
      const grant = () => {
        signal.removeEventListener("abort", cancel);
        runtime.marginInferenceCount = (runtime.marginInferenceCount || 0) + 1;
        resolve();
      };
      const cancel = () => {
        const index = queue.indexOf(grant);
        if (index >= 0) queue.splice(index, 1);
        reject(signal.reason);
      };
      signal.addEventListener("abort", cancel, { once: true });
      queue.push(grant);
      if (signal.aborted) cancel();
    });
  } else runtime.marginInferenceCount = (runtime.marginInferenceCount || 0) + 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    runtime.marginInferenceCount = Math.max(
      0,
      (runtime.marginInferenceCount || 1) - 1,
    );
    queue.shift()?.();
  };
}
