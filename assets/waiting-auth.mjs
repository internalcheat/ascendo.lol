const endpoint = "https://fstdttaxflayhtwhnbih.supabase.co/functions/v1/waiting-accounts";
const sessionKey = "ascendo.waiting.session.v1";
const tokenFormat = /^[0-9a-f]{64}$/;

export class AccountError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export async function accountRequest(action, fields = {}, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      headers,
      body: JSON.stringify({ action, ...fields }),
      signal: AbortSignal.timeout(12000),
    });
    if ([502, 503, 504].includes(response.status)) throw new AccountError("unavailable");
    const result = await response.json();
    if (!response.ok || result?.ok !== true) {
      throw new AccountError(response.status === 429 ? "rate_limited" : result?.code || "unavailable");
    }
    if (["signin", "signup"].includes(action) && !tokenFormat.test(result.token)) {
      throw new AccountError("unavailable");
    }
    return result;
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError("unavailable");
  }
}

export function readSession() {
  for (const storageName of ["sessionStorage", "localStorage"]) {
    try {
      const value = window[storageName].getItem(sessionKey);
      if (value && tokenFormat.test(value)) return value;
    } catch {
      // The other storage scope may still work when browser settings block this one.
    }
  }
  return null;
}

export function saveSession(token, remember) {
  clearSession();
  try {
    window[remember ? "localStorage" : "sessionStorage"].setItem(sessionKey, token);
  } catch {
    throw new AccountError("storage_blocked");
  }
}

export function clearSession() {
  for (const storageName of ["sessionStorage", "localStorage"]) {
    try {
      window[storageName].removeItem(sessionKey);
    } catch {
      // This storage scope is inaccessible.
    }
  }
}
