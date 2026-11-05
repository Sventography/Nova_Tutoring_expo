/** Email callback parameters can arrive in a query string or an implicit-flow hash. */
export type CallbackParams = Record<string, string>;

export function readAuthParams(url: string): CallbackParams {
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");
  const query = queryStart >= 0 && (hashStart < 0 || queryStart < hashStart)
    ? url.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined)
    : "";
  const hash = hashStart >= 0 ? url.slice(hashStart + 1) : "";
  const params: CallbackParams = {};
  new URLSearchParams([query, hash].filter(Boolean).join("&")).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/** A bare recovery flag must never reuse an unrelated, already signed-in account. */
export function hasCallbackProof(params: CallbackParams): boolean {
  return !!((params.access_token && params.refresh_token) || params.code ||
    (params.token_hash && params.type));
}

/** Keep credentials out of browser history and subsequent referrers. */
export function callbackPathWithoutCredentials(url: string): string {
  const parsed = new URL(url);
  return parsed.pathname;
}
