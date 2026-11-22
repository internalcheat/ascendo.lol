const siteOrigin = "https://ascendo.lol";
const bodyLimit = 8 * 1024;
const tokenPattern = /^[a-f0-9]{64}$/;
const usernamePattern = /^[A-Za-z0-9_]{3,24}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const encoder = new TextEncoder();

type Fields = Record<string, unknown>;
type Scope = "signup" | "login" | "session" | "logout";
type Command = {
  scope: Scope;
  input: Fields;
  identity?: string;
};

const statusForCode: Readonly<Record<string, number>> = Object.freeze({
  invalid_input: 400,
  invalid_credentials: 401,
  invalid_session: 401,
  account_unavailable: 409,
});

const rpcNames: Readonly<Record<Scope, string>> = Object.freeze({
  signup: "waiting_account_signup",
  login: "waiting_account_login",
  session: "waiting_account_session",
  logout: "waiting_account_logout",
});

class BadRequest extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

function response(
  allowedOrigin: boolean,
  status: number,
  body: Fields | null,
  extra?: HeadersInit,
): Response {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
  if (allowedOrigin) headers.set("Access-Control-Allow-Origin", siteOrigin);
  if (body !== null) headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

function failure(allowedOrigin: boolean, status: number, code: string, headers?: HeadersInit): Response {
  return response(allowedOrigin, status, { ok: false, code }, headers);
}

function isObject(value: unknown): value is Fields {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateUsername(value: unknown): string {
  const username = typeof value === "string" ? value.trim() : "";
  if (!usernamePattern.test(username)) throw new BadRequest(400, "invalid_input");
  return username;
}

function validateEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[\x21-\x7e]+$/.test(email) || !emailPattern.test(email)) {
    throw new BadRequest(400, "invalid_input");
  }
  return email;
}

function validatePassword(value: unknown, creatingAccount: boolean): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\0") ||
    encoder.encode(value).length > 72 ||
    (creatingAccount && [...value].length < 8)
  ) {
    throw new BadRequest(400, "invalid_input");
  }
  return value;
}

function commandFrom(body: Fields, headers: Headers): Command {
  switch (body.action) {
    case "signup":
      return {
        scope: "signup",
        input: {
          p_email: validateEmail(body.email),
          p_username: validateUsername(body.username),
          p_password: validatePassword(body.password, true),
        },
      };
    case "signin": {
      if (body.remember !== undefined && typeof body.remember !== "boolean") {
        throw new BadRequest(400, "invalid_input");
      }
      const login = typeof body.identifier === "string" && body.identifier.includes("@")
        ? validateEmail(body.identifier)
        : validateUsername(body.identifier).toLowerCase();
      return {
        scope: "login",
        identity: login,
        input: {
          p_login: login,
          p_password: validatePassword(body.password, false),
          p_remember: body.remember === true,
        },
      };
    }
    case "session":
    case "signout": {
      const authorization = headers.get("Authorization") ?? "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (!tokenPattern.test(token)) throw new BadRequest(401, "invalid_session");
      return {
        scope: body.action === "session" ? "session" : "logout",
        input: { p_token: token },
      };
    }
    default:
      throw new BadRequest(400, "invalid_input");
  }
}

async function readJSON(request: Request): Promise<Fields> {
  const mediaType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  const encoding = request.headers.get("Content-Encoding");
  if (mediaType !== "application/json" || (encoding !== null && encoding !== "identity")) {
    throw new BadRequest(415, "invalid_input");
  }
  const length = request.headers.get("Content-Length");
  if (length !== null && Number(length) > bodyLimit) throw new BadRequest(413, "invalid_input");
  if (request.body === null) throw new BadRequest(400, "invalid_input");

  const reader = request.body.getReader();
  const buffer = new Uint8Array(bodyLimit);
  let offset = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > bodyLimit - offset) {
        void reader.cancel().catch(() => {});
        throw new BadRequest(413, "invalid_input");
      }
      buffer.set(value, offset);
      offset += value.byteLength;
    }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, offset)));
    if (!isObject(body)) throw new BadRequest(400, "invalid_input");
    return body;
  } catch (error) {
    if (error instanceof BadRequest) throw error;
    throw new BadRequest(400, "invalid_input");
  } finally {
    reader.releaseLock();
  }
}

// The hosted Supabase gateway sets CF-Connecting-IP. Unknown sources share a
// conservative fallback bucket rather than accepting another forwarding header.
function sourceBucket(headers: Headers): string {
  const address = headers.get("CF-Connecting-IP") ?? "";
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(address)) {
    const octets = address.split(".").map(Number);
    return octets.every((value) => value <= 255) ? octets.join(".") : "unknown";
  }
  if (!address.includes(":") || !/^[a-f0-9:.]{2,45}$/i.test(address)) return "unknown";
  try {
    const host = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    if (host.startsWith("::ffff:")) {
      const [left, right] = host.slice(7).split(":").map((group) => Number.parseInt(group, 16));
      return [left >> 8, left & 255, right >> 8, right & 255].join(".");
    }
    const [left, right] = host.split("::");
    const prefix = left === "" ? [] : left.split(":");
    if (right !== undefined) {
      const suffix = right === "" ? [] : right.split(":");
      prefix.push(...Array(8 - prefix.length - suffix.length).fill("0"), ...suffix);
    }
    return `${prefix.slice(0, 4).join(":")}::/64`;
  } catch {
    return "unknown";
  }
}

async function bucketHash(key: CryptoKey, field: string, value: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`waiting-accounts/v1/${field}/${value}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function callRPC(
  base: string,
  serviceKey: string,
  name: string,
  input: Fields,
  requestSignal: AbortSignal,
): Promise<unknown> {
  const headers = new Headers({
    apikey: serviceKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  });
  if (!serviceKey.startsWith("sb_secret_")) headers.set("Authorization", `Bearer ${serviceKey}`);
  const result = await fetch(new URL(`/rest/v1/rpc/${name}`, base), {
    method: "POST",
    headers,
    body: JSON.stringify(input),
    redirect: "error",
    signal: AbortSignal.any([requestSignal, AbortSignal.timeout(8000)]),
  });
  if (!result.ok) {
    void result.body?.cancel().catch(() => {});
    throw new Error("RPC request failed");
  }
  return result.json();
}

function preflight(request: Request): Response {
  const requestedMethod = request.headers.get("Access-Control-Request-Method");
  const requestedHeaders = (request.headers.get("Access-Control-Request-Headers") ?? "")
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  if (requestedMethod !== "POST" || requestedHeaders.some((header) => header !== "content-type" && header !== "authorization")) {
    return failure(true, 400, "invalid_input");
  }
  return response(true, 204, null, {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
}

Deno.serve(async (request) => {
  if (request.headers.get("Origin") !== siteOrigin) return failure(false, 403, "origin_not_allowed");
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return failure(true, 405, "method_not_allowed", { Allow: "POST, OPTIONS" });

  try {
    const command = commandFrom(await readJSON(request), request.headers);
    const supabaseURL = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseURL || !serviceKey) return failure(true, 503, "unavailable");
    const hmacKey = await crypto.subtle.importKey("raw", encoder.encode(serviceKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const client = await bucketHash(hmacKey, "client", sourceBucket(request.headers));
    const identity = command.identity ? await bucketHash(hmacKey, "identity", command.identity) : null;
    const allowed = await callRPC(supabaseURL, serviceKey, "waiting_account_rate", {
      p_scope: command.scope,
      p_client: client,
      p_identity: identity,
    }, request.signal);
    if (typeof allowed !== "boolean") return failure(true, 503, "unavailable");
    if (!allowed) return failure(true, 429, "rate_limited", { "Retry-After": "60" });

    const result = await callRPC(supabaseURL, serviceKey, rpcNames[command.scope], command.input, request.signal);
    if (!isObject(result) || typeof result.status !== "string") return failure(true, 503, "unavailable");
    if (result.status !== "ok") {
      const status = Object.hasOwn(statusForCode, result.status) ? statusForCode[result.status] : null;
      return status === null ? failure(true, 503, "unavailable") : failure(true, status, result.status);
    }
    if (command.scope === "signup" || command.scope === "login") {
      if (typeof result.token !== "string" || !tokenPattern.test(result.token)) return failure(true, 503, "unavailable");
      return response(true, 200, { ok: true, token: result.token });
    }
    return response(true, 200, { ok: true });
  } catch (error) {
    if (error instanceof BadRequest) return failure(true, error.status, error.code);
    return failure(true, 503, "unavailable");
  }
});
