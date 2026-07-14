// Tattoo motifs the ink "needle-draws" as each scroll chapter unfolds.
// Fine-line pieces authored as bezier/arc chains in a [0,1]^2 box (y up),
// pre-sampled at module load into ordered point runs with unit tangents —
// the engine walks the run in order, like a machine drawing the line.
//
// Design notes: single-stroke fine-line style to match the studio's work;
// each motif reads at low dye density and survives partial dissolution
// (no fills, no crossings tighter than ~0.02 uv).

export type MotifPoint = { x: number; y: number; tx: number; ty: number };
export type Motif = { id: string; points: MotifPoint[] };

type P = [number, number];

function withTangents(pts: P[]): MotifPoint[] {
  return pts.map(([x, y], i) => {
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[Math.min(i + 1, pts.length - 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return { x, y, tx: dx / len, ty: dy / len };
  });
}

function cubic(p0: P, c1: P, c2: P, p1: P, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
    ]);
  }
  return out;
}

function line(p0: P, p1: P, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]);
  }
  return out;
}

/** Arc around (cx, cy); angles in radians, y-up (0 = +x, PI/2 = up). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Archimedean spiral (rose heart): r grows linearly with angle. */
function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, n: number): P[] {
  const out: P[] = [];
  const total = turns * Math.PI * 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI / 2 + total * t;
    const r = r0 + (r1 - r0) * t;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

// -- drop: the studio's namesake. Teardrop outline, tip up, one ripple below.
const drop: P[] = [
  ...cubic([0.5, 0.88], [0.46, 0.76], [0.375, 0.64], [0.36, 0.5], 22),
  ...cubic([0.36, 0.5], [0.345, 0.38], [0.41, 0.29], [0.5, 0.29], 16),
  ...cubic([0.5, 0.29], [0.59, 0.29], [0.655, 0.38], [0.64, 0.5], 16),
  ...cubic([0.64, 0.5], [0.625, 0.64], [0.54, 0.76], [0.5, 0.88], 22),
  ...arc(0.5, 0.2, 0.14, Math.PI * 1.15, Math.PI * 1.85, 14),
];

// -- dagger: "we leave marks". Narrow blade down, cross guard, hilt, ring pommel.
const dagger: P[] = [
  ...line([0.468, 0.62], [0.5, 0.22], 18),
  ...line([0.5, 0.22], [0.532, 0.62], 18),
  ...line([0.4, 0.63], [0.6, 0.63], 12),
  ...line([0.5, 0.64], [0.5, 0.8], 10),
  ...arc(0.5, 0.84, 0.035, -Math.PI / 2, Math.PI * 1.5, 12),
];

// -- serpent: the line that flows from idea to skin. S-body, head hook, tongue.
const serpent: P[] = [
  ...cubic([0.3, 0.22], [0.52, 0.2], [0.62, 0.34], [0.52, 0.46], 26),
  ...cubic([0.52, 0.46], [0.42, 0.58], [0.44, 0.7], [0.6, 0.74], 26),
  ...cubic([0.6, 0.74], [0.68, 0.76], [0.7, 0.7], [0.66, 0.66], 12),
  ...line([0.665, 0.65], [0.71, 0.6], 5),
];

// -- rose: voices/skin speaks. Spiral heart, two petal arcs, stem with one leaf.
const rose: P[] = [
  ...spiral(0.5, 0.58, 0.015, 0.105, 1.7, 44),
  ...arc(0.5, 0.58, 0.16, Math.PI * 0.12, Math.PI * 0.88, 14),
  ...arc(0.5, 0.58, 0.17, Math.PI * 1.12, Math.PI * 1.78, 12),
  ...cubic([0.5, 0.42], [0.52, 0.34], [0.48, 0.28], [0.5, 0.16], 12),
  ...cubic([0.495, 0.28], [0.42, 0.26], [0.385, 0.21], [0.36, 0.16], 8),
  ...cubic([0.36, 0.16], [0.42, 0.17], [0.465, 0.22], [0.495, 0.275], 8),
];

export const MOTIFS: Record<string, Motif> = {
  drop: { id: "drop", points: withTangents(drop) },
  dagger: { id: "dagger", points: withTangents(dagger) },
  serpent: { id: "serpent", points: withTangents(serpent) },
  rose: { id: "rose", points: withTangents(rose) },
};

/** Motif per scroll chapter (7 chapters, index = floor(progress * 7)).
 * Hero and the closing chapters stay clean — the wordmark owns the finale. */
export const CHAPTER_MOTIFS: (Motif | null)[] = [
  null, // 0 hero
  MOTIFS.drop, // 1 work
  MOTIFS.dagger, // 2 craft
  MOTIFS.serpent, // 3 process
  MOTIFS.rose, // 4 voices
  null, // 5 paths/booking
  null, // 6 finale (wordmark mask)
];

/** Composition anchor + scale for a chapter's motif (uv, y up). Alternates
 * sides so the piece never sits under the section headline for long. */
export function motifPlacement(chapter: number): { x: number; y: number; scale: number } {
  return {
    x: chapter % 2 === 0 ? 0.3 : 0.7,
    y: 0.52,
    scale: 0.52,
  };
}
