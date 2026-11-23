var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../worker/src/production-policy.js
var ProductionError = class extends Error {
  static {
    __name(this, "ProductionError");
  }
  constructor(code, message, status = 503) {
    super(message);
    this.code = code;
    this.status = status;
  }
};

// ../access.js
async function assertProductionAdmin(request, env, { fetcher = fetch, now = Date.now() } = {}) {
  const deny = /* @__PURE__ */ __name(() => {
    throw new ProductionError("PRODUCTION_ADMIN_DENIED", "\u7BA1\u7406\u8005\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002", 401);
  }, "deny");
  try {
    const host = env.PRODUCTION_ADMIN_ORIGIN, team = env.PRODUCTION_ACCESS_TEAM_DOMAIN, aud = env.PRODUCTION_ACCESS_AUDIENCE, email = env.PRODUCTION_ADMIN_EMAIL;
    if (!/^https:\/\/[a-z0-9-]+\.awaiaune\.com$/.test(host || "") || ["https://validation.awaiaune.com", "https://yasoyahonten.awaiaune.com"].includes(host) || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team || "") || !/^[a-f0-9]{64}$/.test(aud || "") || !email) deny();
    const origin = request.headers.get("Origin");
    if (origin && origin !== host) deny();
    if (!["GET", "HEAD"].includes(request.method) && origin !== host) deny();
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token || token.length > 16384) deny();
    const parts = token.split(".");
    if (parts.length !== 3) deny();
    const decode = /* @__PURE__ */ __name((s) => {
      if (!/^[A-Za-z0-9_-]+$/.test(s)) deny();
      return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), (c) => c.charCodeAt(0));
    }, "decode");
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0]))), claims = JSON.parse(new TextDecoder().decode(decode(parts[1]))), seconds = Math.floor(now / 1e3), issuer = "https://" + team;
    if (header.alg !== "RS256" || typeof header.kid !== "string" || header.kid.length > 256 || claims.iss !== issuer || claims.email !== email || !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(aud) || !Number.isFinite(claims.exp) || claims.exp <= seconds || !Number.isFinite(claims.iat) || claims.iat > seconds + 60 || claims.nbf !== void 0 && (!Number.isFinite(claims.nbf) || claims.nbf > seconds)) deny();
    const response = await fetcher(issuer + "/cdn-cgi/access/certs", { redirect: "manual", signal: AbortSignal.timeout(5e3) });
    if (response.status !== 200) deny();
    const raw = await response.text();
    if (raw.length > 65536) deny();
    const keys = JSON.parse(raw).keys;
    if (!Array.isArray(keys) || keys.length > 10) deny();
    const match = keys.filter((k) => k.kid === header.kid && k.kty === "RSA" && (!k.alg || k.alg === "RS256") && (!k.use || k.use === "sig"));
    if (match.length !== 1) deny();
    const key = await crypto.subtle.importKey("jwk", match[0], { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]))) deny();
  } catch {
    deny();
  }
}
__name(assertProductionAdmin, "assertProductionAdmin");

// ../admin-worker.js
var admin_worker_default = { async fetch(request, env) {
  try {
    await assertProductionAdmin(request, env);
    const url = new URL(request.url);
    if (url.origin !== env.PRODUCTION_ADMIN_ORIGIN) return new Response("Unavailable", { status: 403 });
    if (url.pathname === "/js/store-config.js") return new Response("window.YASOYA_STORE_CONFIG=Object.freeze(" + JSON.stringify({ environment: "production", workerBaseUrl: env.PRODUCTION_ADMIN_ORIGIN, currency: "JPY" }) + ");", { headers: { "Content-Type": "application/javascript", "Cache-Control": "no-store" } });
    let response;
    if (/^\/api\/admin\//.test(url.pathname)) {
      if (!env.PAYMENTS_SERVICE) return new Response("Unavailable", { status: 503 });
      response = await env.PAYMENTS_SERVICE.fetch(request);
    } else {
      if (!["GET", "HEAD"].includes(request.method) || !/^\/(admin\/(?:index.html)?|(?:js|css)\/[a-z0-9-]+\.(?:js|css))$/.test(url.pathname) || !env.ASSETS) return new Response("Not found", { status: 404 });
      response = await env.ASSETS.fetch(request);
    }
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return new Response("Management access unavailable", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
} };
export {
  admin_worker_default as default
};
//# sourceMappingURL=admin-worker.js.map
