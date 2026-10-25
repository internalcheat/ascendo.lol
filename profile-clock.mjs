export function createProfileClock(win) {
  const jobs = new Map();
  let frame = 0, serial = 0;
  function flush(time) {
    frame = 0;
    const batch = [...jobs.values()]; jobs.clear();
    for (const callback of batch) callback(time);
  }
  return {
    request(callback) { const id = ++serial; jobs.set(id,callback); if (!frame) frame = win.requestAnimationFrame(flush); return id; },
    cancel(id) { jobs.delete(id); if (!jobs.size && frame) { win.cancelAnimationFrame(frame); frame = 0; } },
    destroy() { jobs.clear(); if (frame) win.cancelAnimationFrame(frame); frame = 0; }
  };
}
