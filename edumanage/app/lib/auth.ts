import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const secret = () => {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  return value && value.length >= 32 && !value.startsWith("change-me") ? value : null;
};
const scrypt = (password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number }) => new Promise<Buffer>((resolve, reject) =>
  scryptCallback(password, salt, length, { ...options, maxmem: 128 * 1024 * 1024 }, (error, result) => error ? reject(error) : resolve(result)));

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts[0] !== "scrypt") return false;
  try {
    const legacy = parts.length === 6;
    if (!legacy && parts.length !== 3) return false;
    const n = legacy ? Number(parts[1]) : 16384;
    const r = legacy ? Number(parts[2]) : 8;
    const p = legacy ? Number(parts[3]) : 1;
    const salt = Buffer.from(legacy ? parts[4] : parts[1], "hex");
    const expected = Buffer.from(legacy ? parts[5] : parts[2], "hex");
    const actual = await scrypt(password, salt, expected.length, { N: n, r, p });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
export function authConfigured() { return secret() !== null; }
export const SESSION_COOKIE = "edumanage-session";
export type SessionPayload = { uid: string; role: string; exp: number };
export function signSession(uid: string, role: string) {
  const key = secret(); if (!key) return null;
  const body = Buffer.from(JSON.stringify({ uid, role, exp: Math.floor(Date.now() / 1000) + 43200 })).toString("base64url");
  return `${body}.${createHmac("sha256", key).update(body).digest("hex")}`;
}
export function readSession(token?: string | null): SessionPayload | null {
  const key = secret(); if (!key || !token) return null;
  const dot = token.indexOf("."); if (dot < 1) return null;
  const body = token.slice(0, dot), signature = token.slice(dot + 1);
  const expected = createHmac("sha256", key).update(body).digest("hex");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload; return payload.exp > Date.now() / 1000 ? payload : null; } catch { return null; }
}
export function sessionFromRequest(request: Request) {
  const match = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return readSession(match?.[1] ? decodeURIComponent(match[1]) : null);
}
const secureCookie = () => process.env.NODE_ENV === "production" ? "; Secure" : "";
export function sessionCookieHeader(token: string) { return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${secureCookie()}`; }
export function clearSessionCookieHeader() { return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie()}`; }
export function unauthorized() { return Response.json({ error: "Sign in to continue." }, { status: 401 }); }
export function requireSession(request: Request) { return sessionFromRequest(request) ?? unauthorized(); }
