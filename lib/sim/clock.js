// Jam simulasi: hanya maju saat ronde benar-benar berjalan. Semua deadline
// gameplay (efek, makanan, ranjau, respawn, Time Attack) memakai jam ini,
// jadi pause otomatis membekukan semuanya. `realNow` bisa diinjeksi untuk test.
export function createSimClock(realNow) {
  let acc = 0, last = 0, running = false;
  return {
    now() { return running ? acc + (realNow() - last) : acc; },
    start() { if (!running) { last = realNow(); running = true; } },
    stop() { if (running) { acc += realNow() - last; running = false; } },
    reset() { acc = 0; running = false; },
    isRunning() { return running; },
  };
}
