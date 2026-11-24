"use client";

type Snapshot = { count: number; label: string };
const idle: Snapshot = { count: 0, label: "" };
let snapshot = idle;
const requests = new Map<symbol, string>();
const listeners = new Set<() => void>();
function publish() {
  snapshot = requests.size
    ? { count: requests.size, label: [...requests.values()].at(-1)! }
    : idle;
  listeners.forEach((listener) => listener());
}
export const requestFeedback = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => idle,
};
export function beginRequest(label = "Processing request…") {
  const token = Symbol();
  requests.set(token, label);
  publish();
  return () => {
    if (requests.delete(token)) publish();
  };
}
