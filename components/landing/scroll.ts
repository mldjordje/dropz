export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function normalizeScroll(scrollY: number, scrollHeight: number, viewportHeight: number) {
  const distance = scrollHeight - viewportHeight;
  if (distance <= 0) return 0;
  return clamp01(scrollY / distance);
}

export function chapterProgress(progress: number, start: number, end: number) {
  if (end <= start) return progress >= end ? 1 : 0;
  return clamp01((progress - start) / (end - start));
}
