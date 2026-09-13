// Studio split between the owner and an artist, per fully paid session.
// Rules are defined in EUR (studio policy) while prices are stored in RSD,
// so the price is converted at the configured EUR rate first:
//   price < 200 €        -> 50 / 50
//   200 € <= price < 250 -> owner gets a flat 80 €
//   price >= 250 €       -> owner gets a flat 100 €
// Sessions done by the owner himself are 100% his.
// Shared by server routes and client pages (no server-only import).

export const DEFAULT_EUR_RATE = 117.2;

export function ownerShareEur(priceEur: number): number {
  if (!(priceEur > 0)) return 0;
  if (priceEur < 200) return priceEur / 2;
  if (priceEur < 250) return 80;
  return 100;
}

export type Split = { owner: number; artist: number };

export function splitSession(priceRsd: number | null, eurRate: number, byOwner: boolean): Split {
  const price = priceRsd != null && priceRsd > 0 ? priceRsd : 0;
  if (price === 0) return { owner: 0, artist: 0 };
  if (byOwner) return { owner: price, artist: 0 };
  const rate = eurRate > 0 ? eurRate : DEFAULT_EUR_RATE;
  const owner = Math.round(Math.min(price, ownerShareEur(price / rate) * rate));
  return { owner, artist: price - owner };
}
