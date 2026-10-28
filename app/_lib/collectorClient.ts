/** Server-authenticated collector API. No client-side entitlement grants. */
export const COLLECTOR_REWARD_ID = "noras_last_lantern_017" as const;
export const COLLECTOR_CLAIMS_ENABLED =
  process.env.EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED === "true";

const API_BASE = (
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://nove-tutoring-backend.onrender.com"
).replace(/\/+$/, "");

export type CollectorEntitlement = {
  reward_id: typeof COLLECTOR_REWARD_ID;
  granted_at: string;
};
export type CollectorVerification = {
  authentic: true;
  edition: "noras_last_lantern";
  serial_number: number;
  edition_size: number;
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

async function requestCollector(
  path: string,
  accessToken: string,
  code?: string
): Promise<any> {
  if (!accessToken) throw new CollectorApiError("unauthorized", 401);
  const response = await fetch(`${API_BASE}/api/collector/${path}`, {
    method: code === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(code === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(code === undefined ? {} : { body: JSON.stringify({ code }) }),
  });
  let payload: any;
  try {
    payload = await response.json();
  } catch {
    throw new CollectorApiError("invalid_server_response", response.status);
  }
  if (!response.ok || payload?.ok !== true) {
    throw new CollectorApiError(String(payload?.error || "server_error"), response.status);
  }
  return payload;
}

export async function fetchCollectorEntitlements(
  accessToken: string
): Promise<CollectorEntitlement[]> {
  const payload = await requestCollector("entitlements", accessToken);
  if (!Array.isArray(payload.entitlements)) {
    throw new CollectorApiError("invalid_server_response", 200);
  }
  return payload.entitlements.filter(
    (item: any): item is CollectorEntitlement =>
      item?.reward_id === COLLECTOR_REWARD_ID &&
      typeof item.granted_at === "string" &&
      Number.isFinite(Date.parse(item.granted_at))
  );
}

export async function verifyCollectorCode(
  accessToken: string,
  code: string
): Promise<CollectorVerification> {
  if (!validCollectorCode(code)) throw new CollectorApiError("invalid_code", 400);
  const data = await requestCollector("verify", accessToken, code);
  if (data?.authentic !== true || data?.edition !== "noras_last_lantern" ||
    !Number.isInteger(data?.serial_number) || data.serial_number < 1 ||
    data.serial_number > 100 || data.edition_size !== 100 ||
    !["available", "yours", "claimed"].includes(data.claim_state)) {
    throw new CollectorApiError("invalid_server_response", 200);
  }
  return data as CollectorVerification;
}

export async function redeemCollectorCode(
  accessToken: string,
  code: string
): Promise<"claimed" | "already_yours"> {
  if (!validCollectorCode(code)) throw new CollectorApiError("invalid_code", 400);
  const result = await requestCollector("redeem", accessToken, code);
  if (result.reward_id !== COLLECTOR_REWARD_ID ||
    !["claimed", "already_yours"].includes(result.status)) {
    throw new CollectorApiError("invalid_server_response", 200);
  }
  return result.status;
}
