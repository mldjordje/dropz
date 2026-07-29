import "server-only";
import { getSql } from "@/lib/db";

export type Gender = "male" | "female";

export type ProfileCompletion = {
  phone: string | null;
  birthday: string | null;
  gender: Gender | null;
  complete: boolean;
};

export async function getProfileCompletion(userId: number): Promise<ProfileCompletion | null> {
  const rows = (await getSql()`
    SELECT phone, birthday::text AS birthday, gender
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `) as { phone: string | null; birthday: string | null; gender: string | null }[];
  const row = rows[0];
  if (!row) return null;
  const gender = row.gender === "male" || row.gender === "female" ? row.gender : null;
  return {
    phone: row.phone,
    birthday: row.birthday,
    gender,
    complete: Boolean(row.phone && row.birthday && gender),
  };
}

export async function hasCompleteProfile(userId: number): Promise<boolean> {
  return (await getProfileCompletion(userId))?.complete === true;
}
