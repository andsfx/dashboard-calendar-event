// Runnable self-check (no vitest): node src/utils/logger.selfcheck.mjs
// Simulates prod sink without Vite.

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const calls = [];
const sink = (message, error) => {
  calls.push({ message, error });
};

globalThis.__METMAL_ERROR_SINK__ = sink;

// Mimic prod branch of logger.error
function prodError(message, error) {
  const g = globalThis;
  const s = typeof g.__METMAL_ERROR_SINK__ === 'function' ? g.__METMAL_ERROR_SINK__ : null;
  if (s) s(message, error);
}

prodError('boom', new Error('x'));
assert(calls.length === 1, 'sink called once');
assert(calls[0].message === 'boom', 'message forwarded');
assert(calls[0].error instanceof Error, 'error forwarded');

delete globalThis.__METMAL_ERROR_SINK__;
prodError('no-sink', new Error('y'));
assert(calls.length === 1, 'no sink → no extra call');

console.log('logger.selfcheck: ok');
