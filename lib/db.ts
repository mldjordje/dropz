import "server-only";
import { neon } from "@neondatabase/serverless";

let sqlClient: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is missing.");
    }
    sqlClient = neon(url);
  }
  return sqlClient;
}

export type BookingStatus = "new" | "confirmed" | "done" | "canceled";

export type Booking = {
  id: number;
  name: string;
  contact: string;
  kind: "consult" | "session";
  note: string | null;
  date: string; // YYYY-MM-DD
  slot: string; // HH:MM
  status: BookingStatus;
  locale: string | null;
  created_at: string;
};
