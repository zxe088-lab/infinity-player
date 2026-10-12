// Keep frequent player events separate from encrypted storage writes.
export function createCheckpoint(initial = 0, save, now = Date.now) {
  let position = Number.isFinite(initial) && initial > 0 ? initial : 0;
  let lastSaved = position;
  let lastWrite = now();
  function flush() {
    const seconds = Math.floor(position);
    if (seconds === Math.floor(lastSaved)) return;
    lastSaved = seconds;
    lastWrite = now();
    save(seconds);
  }
  return {
    update(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return;
      position = seconds;
      if (now() - lastWrite >= 15000) flush();
    },
    flush,
    finish() { position = 0; flush(); },
    get position() { return position; }
  };
}
