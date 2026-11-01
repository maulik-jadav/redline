import type { ConnectionState } from "./shared";

export interface RoomConnection { close(): void; renew(): Promise<void> }
export interface RoomEvents {
  status(state: ConnectionState): void;
  presence(online: Set<string>): void;
  invalidate(): void;
}
export interface LobbySyncOptions<T> {
  fetchSnapshot(signal: AbortSignal): Promise<T>;
  connect(events: RoomEvents, signal: AbortSignal): Promise<RoomConnection>;
  snapshot(value: T): void;
  status(value: ConnectionState): void;
  presence(value: Set<string>): void;
  error(error: unknown): void;
  visible(): boolean;
}

/** Transport/lifecycle only. Mutations and membership rules stay on the server. */
export function createLobbySync<T>(options: LobbySyncOptions<T>) {
  let stopped = false;
  let state: ConnectionState = "connecting";
  let sequence = 0;
  let request: AbortController | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  let renew: ReturnType<typeof setInterval> | undefined;
  let connection: RoomConnection | undefined;
  let attempt: AbortController | undefined;

  function schedulePoll() {
    clearInterval(poll);
    // The slow safety refresh also recovers a notification lost while otherwise LIVE.
    poll = setInterval(() => { if (options.visible()) refresh(); }, state === "live" ? 30000 : 2500);
  }
  function setStatus(next: ConnectionState) {
    if (stopped) return;
    const recovered = next === "live" && state !== "live";
    state = next; options.status(next); schedulePoll();
    if (next !== "live") options.presence(new Set());
    if (next === "live") { clearTimeout(retry); retry = undefined; }
    else if (!retry) retry = setTimeout(() => { retry = undefined; void open(); }, 10000);
    if (recovered) refresh();
  }
  async function load() {
    if (stopped) return;
    request?.abort();
    const current = ++sequence;
    const controller = new AbortController(); request = controller;
    try {
      const value = await options.fetchSnapshot(controller.signal);
      if (!stopped && current === sequence) options.snapshot(value);
    } catch (error) {
      if (!stopped && current === sequence && !controller.signal.aborted) options.error(error);
    }
  }
  function refresh() {
    if (stopped) return;
    // Invalidate an in-flight result immediately, before the debounce elapses.
    ++sequence; request?.abort(); clearTimeout(debounce);
    debounce = setTimeout(() => { debounce = undefined; void load(); }, 75);
  }
  async function open() {
    if (stopped) return;
    attempt?.abort(); connection?.close(); connection = undefined; clearInterval(renew);
    const controller = new AbortController(); attempt = controller;
    const valid = () => !stopped && !controller.signal.aborted;
    setStatus(state === "connecting" ? "connecting" : "reconnecting");
    try {
      const result = await options.connect({
        status: next => { if (valid()) setStatus(next); },
        presence: online => { if (valid() && state === "live") options.presence(online); },
        invalidate: () => { if (valid()) refresh(); },
      }, controller.signal);
      if (!valid()) { result.close(); return; }
      connection = result;
      renew = setInterval(() => {
        void result.renew().catch(() => { if (valid()) setStatus("offline"); });
      }, 240000);
    } catch { if (valid()) setStatus("offline"); }
  }
  function stop() {
    if (stopped) return;
    stopped = true; ++sequence; request?.abort(); attempt?.abort();
    clearTimeout(debounce); clearTimeout(retry); clearInterval(poll); clearInterval(renew);
    connection?.close(); connection = undefined;
  }
  options.status(state); schedulePoll(); refresh(); void open();
  return { refresh, stop, network(online: boolean) {
    if (stopped) return;
    if (online) { refresh(); void open(); }
    else { attempt?.abort(); connection?.close(); connection=undefined; setStatus("offline"); }
  } };
}
