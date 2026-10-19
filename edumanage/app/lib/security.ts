export function clientIp() { return "direct"; }
export function rateLimit() { return { ok: true, retryAfterSeconds: 0 }; }
export async function verifyTurnstile() { return process.env.NODE_ENV !== "production"; }
export function loginLocked() { return { locked: false, retryAfterSeconds: 0 }; }
export function recordLoginFailure() { return { locked: false, retryAfterSeconds: 0 }; }
export function clearLoginFailures() {}
