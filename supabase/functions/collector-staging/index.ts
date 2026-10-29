/**
 * NOVA//ARCHIVE -- staging-only Supabase Edge collector redemption.
 * Deployed ONLY to the isolated nova-collector-staging project. Never to live.
 * Uses the SAME private PostgreSQL tables/functions as production Flask.
 * No physical QR codes or API secrets are embedded in this source.
 *
 * GET  /functions/v1/collector-staging/entitlements
 * POST /functions/v1/collector-staging/verify    {"code":"..."}
 * POST /functions/v1/collector-staging/redeem    {"code":"..."}
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.81.0";
import postgres from "npm:postgres@3.4.5";

const STAGING_REF = "gouhhltupxaycuysdtrw";
const STAGING_AUTH_URL = "https://" + STAGING_REF + ".supabase.co";
const REWARD = "noras_last_lantern_017";
const VALID_CODE = /^[A-Za-z0-9_-]{32,128}$/;
const ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
]);

function headers(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, private",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Vary": "Origin",
  };
  if (origin && ORIGINS.has(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Headers"] = "authorization, apikey, content-type";
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}

function reply(status: number, payload: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(payload), { status, headers: headers(origin) });
}

function stagingConfig() {
  const url = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  const database = Deno.env.get("SUPABASE_DB_URL") ?? "";
  if (url !== STAGING_AUTH_URL || !database ||
      !/^postgres(?:ql)?:\/\//.test(database)) {
    throw new Error("Wrong or unavailable staging project configuration");
  }
  // Both the Auth endpoint and DB URL are provisioned by this *same* hosted
  // Supabase project, never read from a client or a custom env variable.
  const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const publicKey = typeof keys.default === "string" ? keys.default
    : (Deno.env.get("SUPABASE_ANON_KEY") ?? "");
  if (!publicKey) throw new Error("Staging Auth key unavailable");
  return { url, database, publicKey };
}

async function sha256(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(value),
  ));
  return Array.from(digest, (x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return origin && ORIGINS.has(origin)
      ? new Response(null, { status: 204, headers: headers(origin) })
      : reply(403, { ok: false, error: "origin_not_allowed" }, origin);
  }
  if (origin && !ORIGINS.has(origin)) {
    return reply(403, { ok: false, error: "origin_not_allowed" }, origin);
  }

  let config: ReturnType<typeof stagingConfig>;
  try { config = stagingConfig(); }
  catch { return reply(503, { ok: false, error: "staging_not_configured" }, origin); }

  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  if (!(route === "entitlements" && req.method === "GET") &&
      !((route === "verify" || route === "redeem") && req.method === "POST")) {
    return reply(404, { ok: false, error: "not_found" }, origin);
  }

  const bearer = /^Bearer ([^\s]+)$/.exec(req.headers.get("Authorization") ?? "");
  if (!bearer) return reply(401, { ok: false, error: "unauthorized" }, origin);
  let userId: string;
  try {
    // Auth.getUser talks to this project's Auth server; never trust an
    // unverified JWT payload or any user_id supplied in request JSON.
    const client = createClient(config.url, config.publicKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.getUser(bearer[1]);
    const id = data?.user?.id;
    if (error || typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return reply(401, { ok: false, error: "unauthorized" }, origin);
    }
    userId = id;
  } catch {
    return reply(503, { ok: false, error: "authentication_unavailable" }, origin);
  }

  let code: string | null = null;
  if (req.method === "POST") {
    if (Number(req.headers.get("Content-Length") ?? "0") > 2048) {
      return reply(400, { ok: false, error: "invalid_code" }, origin);
    }
    try {
      const raw = await req.text();
      if (raw.length > 2048) {
        return reply(400, { ok: false, error: "invalid_code" }, origin);
      }
      const json = JSON.parse(raw);
      code = json && typeof json === "object" && !Array.isArray(json)
        && typeof json.code === "string" && VALID_CODE.test(json.code)
        ? json.code : null;
    } catch { code = null; }
    if (!code) return reply(400, { ok: false, error: "invalid_code" }, origin);
  }

  const db = postgres(config.database, { max: 1, prepare: false, idle_timeout: 3 });
  try {
    if (route === "entitlements") {
      const records = await db.unsafe(
        "select reward_id, granted_at from collector_private.reward_entitlements " +
        "where user_id = $1::uuid and reward_id = $2",
        [userId, REWARD],
      );
      return reply(200, {
        ok: true, entitlements: records.map((record) => ({
          reward_id: record.reward_id,
          granted_at: new Date(record.granted_at).toISOString(),
        })),
      }, origin);
    }

    const hash = await sha256(code!);
    const result = await db.begin(async (tx) => {
      const admitted = await tx.unsafe(
        "select collector_private.allow_redemption_attempt($1::uuid) as allowed",
        [userId],
      );
      if (admitted[0]?.allowed !== true) {
        return { status: 429, payload: { ok: false, error: "too_many_attempts" } };
      }
      if (route === "verify") {
        const found = await tx.unsafe(
          "select serial_number, claimed_by, claimed_at " +
          "from collector_private.plushie_codes where code_hash = $1",
          [hash],
        );
        if (!found.length) return {
          status: 400, payload: { ok: false, error: "invalid_code" },
        };
        const row = found[0];
        const claimState = row.claimed_at == null ? "available"
          : row.claimed_by != null && String(row.claimed_by) === userId
          ? "yours" : "claimed";
        return {
          status: 200,
          payload: {
            ok: true, authentic: true, edition: "noras_last_lantern",
            serial_number: row.serial_number, edition_size: 100,
            claim_state: claimState,
            reward_id: row.serial_number === 17 ? REWARD : null,
          },
        };
      }
      const claim = await tx.unsafe(
        "select collector_private.claim_castle_017($1::uuid, $2::text) as status",
        [userId, hash],
      );
      const result = claim[0]?.status;
      if (result === "claimed" || result === "already_yours") {
        return { status: 200, payload: { ok: true, status: result, reward_id: REWARD } };
      }
      if (result === "already_claimed" || result === "already_owned") {
        return { status: 409, payload: { ok: false, error: result } };
      }
      return { status: 400, payload: { ok: false, error: "invalid_code" } };
    });
    return reply(result.status, result.payload, origin);
  } catch {
    // Do not log access tokens, QR secrets, or SQL values.
    return reply(503, { ok: false, error: "redemption_unavailable" }, origin);
  } finally {
    await db.end({ timeout: 2 }).catch(() => {});
  }
});
