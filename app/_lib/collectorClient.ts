/** Production collector API. Ownership comes only from the authenticated server. */
import { URL, URLSearchParams } from "react-native-url-polyfill";

export const COLLECTOR_REWARD_ID = "noras_last_lantern_017" as const;
export const COLLECTOR_CLAIMS_ENABLED =
  process.env.EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED === "true";

const PRODUCTION_BACKEND = "https://nove-tutoring-backend.onrender.com";
const API_BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || PRODUCTION_BACKEND)
  .trim().replace(/\/+$/, "");

export type CollectorEntitlement = {
  reward_id: typeof COLLECTOR_REWARD_ID;
  granted_at: string;
};
export type CollectorVerification = {
  authentic: true;
  edition: "noras_last_lantern";
  serial_number: number;
  edition_size: 100;
  claim_state: "available" | "yours" | "claimed";
  reward_id: typeof COLLECTOR_REWARD_ID | null;
};

export class CollectorApiError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
    this.name = "CollectorApiError";
  }
}

export function validCollectorCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(code);
}

/** Web certificates use fragments; only native nova:// links may use a query. */
export function collectorCodeFromUrl(
  url: string | null,
  platform: "web" | "native" = "web"
): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // Some sharing apps append ?utm_source=... after the fragment.
    const fragment = parsed.hash.slice(1).split("?", 1)[0];
    const fragmentCode = new URLSearchParams(fragment).get("code");
    if (validCollectorCode(fragmentCode)) return fragmentCode;
    if (platform === "native" && parsed.protocol === "nova:" &&
      parsed.hostname === "collector" && ["", "/"].includes(parsed.pathname)) {
      const queryCode = parsed.searchParams.get("code");
      if (validCollectorCode(queryCode)) return queryCode;
    }
  } catch {
    // Malformed links cannot authorize a claim.
  }
  return null;
}

function objectPayload(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function requestCollector(
  path: "entitlements" | "verify" | "redeem",
  accessToken: string,
  code?: string
): Promise<Record<string, unknown>> {
  if (typeof accessToken !== "string" || !accessToken.trim()) {
    throw new CollectorApiError("unauthorized", 401);
  }
  // This build must never send a production login token to staging or to an
  // arbitrary EXPO_PUBLIC_BACKEND_URL. A backend migration needs a code review.
  if (API_BASE !== PRODUCTION_BACKEND) {
    throw new CollectorApiError("collector_not_configured", 503);
  }
  const options = {
    method: code === undefined ? "GET" : "POST",
    redirect: "error" as const,
    cache: "no-store" as const,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(code === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(code === undefined ? {} : { body: JSON.stringify({ code }) }),
  };
  const response = await fetch(`${API_BASE}/api/collector/${path}`, options);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CollectorApiError("invalid_server_response", response.status);
  }
  if (!objectPayload(payload)) {
    throw new CollectorApiError("invalid_server_response", response.status);
  }
  if (!response.ok || payload.ok !== true) {
    throw new CollectorApiError(
      typeof payload.error === "string" ? payload.error : "server_error",
      response.status
    );
  }
  return payload;
}

export async function fetchCollectorEntitlements(
  accessToken: string
): Promise<CollectorEntitlement[]> {
  // Ownership stays available while new verification/redemption is disabled.
  const payload = await requestCollector("entitlements", accessToken);
  if (!Array.isArray(payload.entitlements)) {
    throw new CollectorApiError("invalid_server_response", 200);
  }
  return payload.entitlements.filter(
    (item: unknown): item is CollectorEntitlement =>
      objectPayload(item) && item.reward_id === COLLECTOR_REWARD_ID &&
      typeof item.granted_at === "string" &&
      Number.isFinite(Date.parse(item.granted_at))
  ).map(({ reward_id, granted_at }) => ({ reward_id, granted_at }));
}

export async function verifyCollectorCode(
  accessToken: string,
  code: string
): Promise<CollectorVerification> {
  if (!COLLECTOR_CLAIMS_ENABLED) {
    throw new CollectorApiError("redemption_not_enabled", 503);
  }
  if (!validCollectorCode(code)) throw new CollectorApiError("invalid_code", 400);
  const data = await requestCollector("verify", accessToken, code);
  if (data.authentic !== true || data.edition !== "noras_last_lantern" ||
    !Number.isInteger(data.serial_number) || Number(data.serial_number) < 1 ||
    Number(data.serial_number) > 100 || data.edition_size !== 100 ||
    typeof data.claim_state !== "string" ||
    !["available", "yours", "claimed"].includes(data.claim_state) ||
    data.reward_id !== (data.serial_number === 17 ? COLLECTOR_REWARD_ID : null)) {
    throw new CollectorApiError("invalid_server_response", 200);
  }
  return {
    authentic: true,
    edition: "noras_last_lantern",
    serial_number: data.serial_number as number,
    edition_size: 100,
    claim_state: data.claim_state as CollectorVerification["claim_state"],
    reward_id: data.reward_id as CollectorVerification["reward_id"],
  };
}

export async function redeemCollectorCode(
  accessToken: string,
  code: string
): Promise<"claimed" | "already_yours"> {
  if (!COLLECTOR_CLAIMS_ENABLED) {
    throw new CollectorApiError("redemption_not_enabled", 503);
  }
  if (!validCollectorCode(code)) throw new CollectorApiError("invalid_code", 400);
  const result = await requestCollector("redeem", accessToken, code);
  if (result.reward_id !== COLLECTOR_REWARD_ID || typeof result.status !== "string" ||
    !["claimed", "already_yours"].includes(result.status)) {
    throw new CollectorApiError("invalid_server_response", 200);
  }
  return result.status as "claimed" | "already_yours";
}
