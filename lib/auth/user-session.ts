import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

// Client (customer) sessions — separate cookie from the admin session so the
// two auth worlds never overlap. Payload carries kind:"user" and is checked on
// read, so an admin token pasted into this cookie will not validate.
export const USER_SESSION_COOKIE = "dropz_user_session";
export const OAUTH_TXN_COOKIE = "dropz_oauth_txn";

const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_TXN_TTL_SECONDS = 60 * 10;

export type SessionUser = {
  uid: number;
  email: string;
  name: string | null;
  avatar: string | null;
};

function getSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is missing.");
  }
  return new TextEncoder().encode(secret);
}

async function sign(payload: JWTPayload, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(getSecret());
}

async function verify(token: string | undefined): Promise<JWTPayload | null> {
  if (!token || !process.env.AUTH_JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function signUserSessionToken(user: SessionUser) {
  return sign({ kind: "user", ...user }, USER_SESSION_TTL_SECONDS);
}

// OAuth transaction: state + PKCE verifier + post-login path, packed into one
// signed short-lived cookie set when redirecting to Google.
export type OAuthTxn = { state: string; verifier: string; next: string };

export async function signOAuthTxnToken(txn: OAuthTxn) {
  return sign({ kind: "oauth-txn", ...txn }, OAUTH_TXN_TTL_SECONDS);
}

export async function verifyOAuthTxnToken(token: string | undefined): Promise<OAuthTxn | null> {
  const payload = await verify(token);
  if (
    !payload ||
    payload.kind !== "oauth-txn" ||
    typeof payload.state !== "string" ||
    typeof payload.verifier !== "string" ||
    typeof payload.next !== "string"
  ) {
    return null;
  }
  return { state: payload.state, verifier: payload.verifier, next: payload.next };
}

function toSessionUser(payload: JWTPayload | null): SessionUser | null {
  if (!payload || payload.kind !== "user" || typeof payload.uid !== "number") return null;
  return {
    uid: payload.uid,
    email: typeof payload.email === "string" ? payload.email : "",
    name: typeof payload.name === "string" ? payload.name : null,
    avatar: typeof payload.avatar === "string" ? payload.avatar : null,
  };
}

// Reads the current customer session from request cookies (server components,
// route handlers). Returns null when absent/expired/invalid.
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return toSessionUser(await verify(store.get(USER_SESSION_COOKIE)?.value));
}

export function setUserSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: USER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_TTL_SECONDS,
  });
}

export function clearUserSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: USER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function setOAuthTxnCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: OAUTH_TXN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_TXN_TTL_SECONDS,
  });
}

export function clearOAuthTxnCookie(response: NextResponse) {
  response.cookies.set({
    name: OAUTH_TXN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

// Only allow same-origin relative paths as post-login destinations.
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}
