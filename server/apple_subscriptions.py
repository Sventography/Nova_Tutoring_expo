from __future__ import annotations

import base64
import hashlib
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import requests
from flask import Flask, jsonify, request

try:
  from appstoreserverlibrary.api_client import (
    APIException,
    AppStoreServerAPIClient,
  )
  from appstoreserverlibrary.models.Environment import Environment
  from appstoreserverlibrary.signed_data_verifier import (
    SignedDataVerifier,
    VerificationException,
  )
except Exception as import_error:
  APIException = None
  AppStoreServerAPIClient = None
  Environment = None
  SignedDataVerifier = None
  VerificationException = None
  APPLE_LIBRARY_IMPORT_ERROR = import_error
else:
  APPLE_LIBRARY_IMPORT_ERROR = None


APPLE_PLAN_BY_PRODUCT_ID: dict[str, str] = {
  "nova_ai_basic_monthly": "basic",
  "nova_ai_plus_monthly": "plus",
  "nova_ai_pro_monthly": "pro",
  "nova_ai_ultimate_monthly": "ultimate",
}

APPLE_LIMITS_BY_PLAN: dict[str, tuple[int, int]] = {
  "basic": (25, 25),
  "plus": (75, 75),
  "pro": (200, 200),
  "ultimate": (500, 500),
}

TRANSACTION_NOT_FOUND_ERROR = 4040010


def _text(value: Any) -> str:
  return str(value or "").strip()


def _utc_iso_from_ms(value: Any) -> str | None:
  try:
    milliseconds = int(value)
  except (TypeError, ValueError):
    return None

  if milliseconds <= 0:
    return None

  return datetime.fromtimestamp(
    milliseconds / 1000,
    tz=timezone.utc,
  ).isoformat()


def _utc_now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def _uuid_text(value: Any) -> str | None:
  try:
    return str(uuid.UUID(_text(value)))
  except (ValueError, AttributeError, TypeError):
    return None


def _load_private_key() -> bytes | None:
  encoded = _text(
    os.getenv("APPLE_IAP_PRIVATE_KEY_BASE64")
  )

  if encoded:
    try:
      return base64.b64decode(
        encoded,
        validate=True,
      )
    except Exception as error:
      print(
        "[apple-subscriptions] invalid private-key base64:",
        repr(error),
      )
      return None

  inline = os.getenv("APPLE_IAP_PRIVATE_KEY") or ""

  if inline.strip():
    return (
      inline
      .replace("\\n", "\n")
      .strip()
      .encode("utf-8")
    )

  configured_path = _text(
    os.getenv("APPLE_IAP_PRIVATE_KEY_PATH")
  )

  if configured_path:
    path = Path(configured_path).expanduser()

    if path.is_file():
      return path.read_bytes()

  return None


def _load_root_certificates() -> list[bytes]:
  default_directory = (
    Path(__file__).resolve().parent
    / "certs"
    / "apple"
  )

  directory = Path(
    _text(
      os.getenv(
        "APPLE_ROOT_CERTIFICATES_DIR"
      )
    )
    or default_directory
  ).expanduser()

  certificates: list[bytes] = []

  for filename in (
    "AppleIncRootCertificate.cer",
    "AppleRootCA-G2.cer",
    "AppleRootCA-G3.cer",
  ):
    path = directory / filename

    if path.is_file():
      certificates.append(
        path.read_bytes()
      )

  return certificates


def _online_checks_enabled() -> bool:
  raw = _text(
    os.getenv(
      "APPLE_ENABLE_ONLINE_CHECKS"
    )
    or "true"
  ).lower()

  return raw not in {
    "0",
    "false",
    "no",
    "off",
  }


def _apple_configuration() -> dict[str, Any]:
  app_id_raw = _text(
    os.getenv("APPLE_APP_ID")
  )

  try:
    app_apple_id = (
      int(app_id_raw)
      if app_id_raw
      else None
    )
  except ValueError:
    app_apple_id = None

  return {
    "key_id": _text(
      os.getenv("APPLE_IAP_KEY_ID")
    ),
    "issuer_id": _text(
      os.getenv("APPLE_IAP_ISSUER_ID")
    ),
    "private_key": _load_private_key(),
    "bundle_id": (
      _text(
        os.getenv("APPLE_BUNDLE_ID")
      )
      or
      "com.sventography.novatutoring.ios"
    ),
    "app_apple_id": app_apple_id,
    "root_certificates":
      _load_root_certificates(),
    "enable_online_checks":
      _online_checks_enabled(),
  }


def apple_subscription_configuration_status():
  config = _apple_configuration()

  library_ready = (
    APPLE_LIBRARY_IMPORT_ERROR is None
  )

  sandbox_ready = bool(
    library_ready
    and config["key_id"]
    and config["issuer_id"]
    and config["private_key"]
    and config["bundle_id"]
    and config["root_certificates"]
  )

  production_ready = bool(
    sandbox_ready
    and config["app_apple_id"]
  )

  return {
    "library": library_ready,
    "key_id": bool(config["key_id"]),
    "issuer_id": bool(
      config["issuer_id"]
    ),
    "private_key": bool(
      config["private_key"]
    ),
    "bundle_id": bool(
      config["bundle_id"]
    ),
    "app_apple_id": bool(
      config["app_apple_id"]
    ),
    "root_certificates": len(
      config["root_certificates"]
    ),
    "sandbox_ready": sandbox_ready,
    "production_ready":
      production_ready,
  }


def _build_apple_clients(
  config: dict[str, Any],
):
  if APPLE_LIBRARY_IMPORT_ERROR is not None:
    raise RuntimeError(
      "Apple's App Store Server Library "
      "is not installed."
    ) from APPLE_LIBRARY_IMPORT_ERROR

  shared = {
    "signing_key":
      config["private_key"],
    "key_id":
      config["key_id"],
    "issuer_id":
      config["issuer_id"],
    "bundle_id":
      config["bundle_id"],
  }

  clients: dict[str, Any] = {}

  if config["app_apple_id"]:
    clients["production"] = (
      AppStoreServerAPIClient(
        environment=
          Environment.PRODUCTION,
        **shared,
      ),
      SignedDataVerifier(
        config["root_certificates"],
        config[
          "enable_online_checks"
        ],
        Environment.PRODUCTION,
        config["bundle_id"],
        config["app_apple_id"],
      ),
    )

  clients["sandbox"] = (
    AppStoreServerAPIClient(
      environment=
        Environment.SANDBOX,
      **shared,
    ),
    SignedDataVerifier(
      config["root_certificates"],
      config[
        "enable_online_checks"
      ],
      Environment.SANDBOX,
      config["bundle_id"],
      None,
    ),
  )

  return clients


def _lookup_transaction(
  transaction_id: str,
  environment_hint: str | None,
):
  config = _apple_configuration()
  status = (
    apple_subscription_configuration_status()
  )

  if not status["sandbox_ready"]:
    raise RuntimeError(
      "Apple subscription verification "
      "is not fully configured."
    )

  clients = _build_apple_clients(
    config
  )

  hint = _text(
    environment_hint
  ).lower()

  order = [
    "production",
    "sandbox",
  ]

  if hint in {
    "sandbox",
    "xcode",
    "testflight",
  }:
    order = [
      "sandbox",
      "production",
    ]

  last_not_found: Exception | None = None

  for name in order:
    pair = clients.get(name)

    if not pair:
      continue

    client, verifier = pair

    try:
      response = (
        client.get_transaction_info(
          transaction_id
        )
      )

      signed_transaction = _text(
        getattr(
          response,
          "signedTransactionInfo",
          None,
        )
      )

      if not signed_transaction:
        raise RuntimeError(
          "Apple returned no signed "
          "transaction information."
        )

      decoded = (
        verifier
        .verify_and_decode_signed_transaction(
          signed_transaction
        )
      )

      return name, decoded

    except Exception as error:
      if (
        APIException is not None
        and isinstance(
          error,
          APIException,
        )
      ):
        raw_error = getattr(
          error,
          "raw_api_error",
          None,
        )

        if (
          raw_error
          == TRANSACTION_NOT_FOUND_ERROR
        ):
          last_not_found = error
          continue

      raise

  if last_not_found:
    raise LookupError(
      "Apple could not find that "
      "transaction in production "
      "or sandbox."
    ) from last_not_found

  raise LookupError(
    "Apple could not find that transaction."
  )


def _supabase_headers(
  service_role_key: str,
  *,
  representation: bool = False,
):
  prefer = (
    "resolution=merge-duplicates,"
    "return=representation"
    if representation
    else
    "return=minimal"
  )

  return {
    "apikey": service_role_key,
    "Authorization":
      f"Bearer {service_role_key}",
    "Content-Type":
      "application/json",
    "Prefer": prefer,
  }


def _get_rows(
  supabase_url: str,
  service_role_key: str,
  table: str,
  params: dict[str, str],
) -> list[dict[str, Any]]:
  response = requests.get(
    f"{supabase_url}/rest/v1/{table}",
    headers=_supabase_headers(
      service_role_key
    ),
    params=params,
    timeout=15,
  )

  if response.status_code != 200:
    raise RuntimeError(
      f"Supabase {table} lookup failed: "
      f"{response.status_code} "
      f"{response.text[:500]}"
    )

  payload = response.json()

  return (
    payload
    if isinstance(payload, list)
    else []
  )



def _persist_subscription(
  *,
  supabase_url: str,
  service_role_key: str,
  user_id: str,
  plan_id: str,
  product_id: str,
  original_transaction_id: str,
  latest_transaction_id: str,
  purchase_ms: int,
  expires_ms: int,
  status: str,
) -> dict[str, Any]:
  claimed = _get_rows(
    supabase_url,
    service_role_key,
    "ai_subscriptions",
    {
      "original_transaction_id":
        f"eq.{original_transaction_id}",
      "select": "user_id",
      "limit": "1",
    },
  )

  if (
    claimed
    and _text(
      claimed[0].get("user_id")
    ) != user_id
  ):
    raise PermissionError(
      "That Apple subscription is "
      "already linked to another "
      "Nova account."
    )

  now_iso = _utc_now_iso()

  payload = {
    "user_id":
      user_id,
    "plan_id":
      plan_id,
    "status":
      status,
    "apple_product_id":
      product_id,
    "original_transaction_id":
      original_transaction_id,
    "latest_transaction_id":
      latest_transaction_id,
    "period_start":
      _utc_iso_from_ms(
        purchase_ms
      ),
    "period_end":
      _utc_iso_from_ms(
        expires_ms
      ),
    "verified_at":
      now_iso,
    "updated_at":
      now_iso,
  }

  response = requests.post(
    (
      f"{supabase_url}"
      "/rest/v1/ai_subscriptions"
    ),
    headers=_supabase_headers(
      service_role_key,
      representation=True,
    ),
    params={
      "on_conflict": "user_id",
    },
    json=payload,
    timeout=15,
  )

  if response.status_code not in (
    200,
    201,
  ):
    raise RuntimeError(
      "Supabase subscription update "
      f"failed: {response.status_code} "
      f"{response.text[:800]}"
    )

  rows = response.json()

  if (
    isinstance(rows, list)
    and rows
  ):
    return rows[0]

  return payload




APPLE_NOTIFICATION_STATUS_BY_RAW = {
  1: "active",
  2: "expired",
  3: "billing_retry",
  4: "grace_period",
  5: "revoked",
}


def _safe_int(value: Any) -> int | None:
  try:
    return int(value)
  except (TypeError, ValueError):
    return None


def _enum_text(value: Any) -> str:
  if value is None:
    return ""

  return _text(
    getattr(value, "value", value)
  )


def _iso_datetime(
  value: Any,
) -> datetime | None:
  raw = _text(value)

  if not raw:
    return None

  try:
    dt = datetime.fromisoformat(
      raw.replace("Z", "+00:00")
    )
  except ValueError:
    return None

  if dt.tzinfo is None:
    dt = dt.replace(
      tzinfo=timezone.utc
    )

  return dt.astimezone(
    timezone.utc
  )


def _verify_notification_payload(
  signed_payload: str,
):
  config = _apple_configuration()

  if not (
    apple_subscription_configuration_status()
    ["sandbox_ready"]
  ):
    raise RuntimeError(
      "Apple notification verification "
      "is not configured."
    )

  clients = _build_apple_clients(
    config
  )

  last_error: Exception | None = None
  retryable_error: Exception | None = None

  for name in (
    "production",
    "sandbox",
  ):
    pair = clients.get(name)

    if not pair:
      continue

    _, verifier = pair

    try:
      decoded = (
        verifier
        .verify_and_decode_notification(
          signed_payload
        )
      )

      return (
        name,
        verifier,
        decoded,
      )

    except Exception as error:
      last_error = error

      status_name = _text(
        getattr(
          getattr(
            error,
            "status",
            None,
          ),
          "name",
          "",
        )
      )

      if (
        status_name
        == "RETRYABLE_VERIFICATION_FAILURE"
      ):
        retryable_error = error

  if retryable_error is not None:
    raise RuntimeError(
      "Apple notification verification "
      "is temporarily unavailable."
    ) from retryable_error

  raise PermissionError(
    "Apple notification signature "
    "could not be verified."
  ) from last_error


def _notification_rows(
  supabase_url: str,
  service_role_key: str,
  notification_uuid: str,
):
  return _get_rows(
    supabase_url,
    service_role_key,
    "apple_subscription_notifications",
    {
      "notification_uuid":
        f"eq.{notification_uuid}",
      "select": (
        "notification_uuid,"
        "processed_at,"
        "processing_error"
      ),
      "limit": "1",
    },
  )


def _insert_notification(
  supabase_url: str,
  service_role_key: str,
  payload: dict[str, Any],
) -> None:
  response = requests.post(
    (
      f"{supabase_url}"
      "/rest/v1/"
      "apple_subscription_notifications"
    ),
    headers=_supabase_headers(
      service_role_key
    ),
    json=payload,
    timeout=15,
  )

  # 409 means Apple retried a UUID we have already inserted.
  if response.status_code not in (
    200,
    201,
    204,
    409,
  ):
    raise RuntimeError(
      "Supabase notification insert "
      f"failed: {response.status_code} "
      f"{response.text[:800]}"
    )


def _patch_notification(
  supabase_url: str,
  service_role_key: str,
  notification_uuid: str,
  payload: dict[str, Any],
) -> None:
  response = requests.patch(
    (
      f"{supabase_url}"
      "/rest/v1/"
      "apple_subscription_notifications"
    ),
    headers=_supabase_headers(
      service_role_key
    ),
    params={
      "notification_uuid":
        f"eq.{notification_uuid}",
    },
    json=payload,
    timeout=15,
  )

  if response.status_code not in (
    200,
    204,
  ):
    raise RuntimeError(
      "Supabase notification update "
      f"failed: {response.status_code} "
      f"{response.text[:800]}"
    )


def _subscription_owner_rows(
  supabase_url: str,
  service_role_key: str,
  original_transaction_id: str,
):
  return _get_rows(
    supabase_url,
    service_role_key,
    "ai_subscriptions",
    {
      "original_transaction_id":
        f"eq.{original_transaction_id}",
      "select": (
        "user_id,"
        "last_notification_signed_at"
      ),
      "limit": "1",
    },
  )


def _patch_subscription_notification_metadata(
  supabase_url: str,
  service_role_key: str,
  user_id: str,
  *,
  environment_name: str,
  renewal: Any,
  notification_uuid: str,
  notification_type: str,
  notification_subtype: str | None,
  notification_signed_ms: int | None,
) -> None:
  payload: dict[str, Any] = {
    "environment":
      environment_name,
    "last_notification_uuid":
      notification_uuid,
    "last_notification_type":
      notification_type,
    "last_notification_subtype":
      notification_subtype,
    "last_notification_signed_at":
      _utc_iso_from_ms(
        notification_signed_ms
      ),
    "updated_at":
      _utc_now_iso(),
  }

  if renewal is not None:
    raw_auto_renew = _safe_int(
      getattr(
        renewal,
        "rawAutoRenewStatus",
        None,
      )
    )

    payload.update({
      "auto_renew_product_id":
        _text(
          getattr(
            renewal,
            "autoRenewProductId",
            None,
          )
        )
        or None,

      "auto_renew_status":
        (
          None
          if raw_auto_renew is None
          else raw_auto_renew == 1
        ),

      "renewal_date":
        _utc_iso_from_ms(
          getattr(
            renewal,
            "renewalDate",
            None,
          )
        ),

      "grace_period_end":
        _utc_iso_from_ms(
          getattr(
            renewal,
            "gracePeriodExpiresDate",
            None,
          )
        ),

      "expiration_intent":
        _safe_int(
          getattr(
            renewal,
            "rawExpirationIntent",
            None,
          )
        ),
    })

  response = requests.patch(
    (
      f"{supabase_url}"
      "/rest/v1/ai_subscriptions"
    ),
    headers=_supabase_headers(
      service_role_key
    ),
    params={
      "user_id":
        f"eq.{user_id}",
    },
    json=payload,
    timeout=15,
  )

  if response.status_code not in (
    200,
    204,
  ):
    raise RuntimeError(
      "Supabase subscription metadata "
      f"update failed: "
      f"{response.status_code} "
      f"{response.text[:800]}"
    )


def _notification_entitlement_status(
  notification_type: str,
  subtype: str | None,
  raw_status: Any,
  transaction: Any,
  renewal: Any,
) -> str:
  if notification_type in {
    "REFUND",
    "REVOKE",
  }:
    return "revoked"

  if notification_type == "EXPIRED":
    return "expired"

  if (
    notification_type
    == "DID_FAIL_TO_RENEW"
  ):
    if subtype == "GRACE_PERIOD":
      return "grace_period"

    return "billing_retry"

  if (
    notification_type
    == "GRACE_PERIOD_EXPIRED"
  ):
    return "billing_retry"

  raw = _safe_int(
    raw_status
  )

  if (
    raw
    in APPLE_NOTIFICATION_STATUS_BY_RAW
  ):
    return (
      APPLE_NOTIFICATION_STATUS_BY_RAW[
        raw
      ]
    )

  now_ms = int(
    datetime.now(
      timezone.utc
    ).timestamp()
    * 1000
  )

  expires_ms = _safe_int(
    getattr(
      transaction,
      "expiresDate",
      None,
    )
  )

  if (
    notification_type
    == "REFUND_REVERSED"
  ):
    if (
      expires_ms
      and expires_ms <= now_ms
    ):
      return "expired"

    return "active"

  if _safe_int(
    getattr(
      transaction,
      "revocationDate",
      None,
    )
  ):
    return "revoked"

  grace_ms = (
    _safe_int(
      getattr(
        renewal,
        "gracePeriodExpiresDate",
        None,
      )
    )
    if renewal is not None
    else None
  )

  if (
    grace_ms
    and grace_ms > now_ms
  ):
    return "grace_period"

  if (
    renewal is not None
    and getattr(
      renewal,
      "isInBillingRetryPeriod",
      None,
    )
    is True
  ):
    return "billing_retry"

  if (
    expires_ms
    and expires_ms <= now_ms
  ):
    return "expired"

  return "active"



def _subscription_row_for_user(
  supabase_url: str,
  service_role_key: str,
  user_id: str,
) -> dict[str, Any] | None:
  rows = _get_rows(
    supabase_url,
    service_role_key,
    "ai_subscriptions",
    {
      "user_id":
        f"eq.{user_id}",
      "select": (
        "user_id,plan_id,status,"
        "apple_product_id,"
        "original_transaction_id,"
        "latest_transaction_id,"
        "period_start,period_end,"
        "verified_at"
      ),
      "limit": "1",
    },
  )

  return rows[0] if rows else None


def _api_exception_is_not_found(
  error: Exception,
) -> bool:
  if (
    APIException is None
    or not isinstance(
      error,
      APIException,
    )
  ):
    return False

  raw_error = getattr(
    error,
    "raw_api_error",
    None,
  )

  http_status = getattr(
    error,
    "http_status_code",
    None,
  )

  return (
    raw_error
      == TRANSACTION_NOT_FOUND_ERROR
    or http_status == 404
  )


def _lookup_current_subscription(
  any_transaction_id: str,
):
  """
  Ask Apple for the CURRENT auto-renewable subscription status.

  Get Transaction Info only describes one transaction. Auto-renewals create
  newer transactions, so it cannot by itself keep a long-lived entitlement
  current. Apple's Get All Subscription Statuses endpoint is designed for
  this reconciliation.
  """
  config = _apple_configuration()

  status = (
    apple_subscription_configuration_status()
  )

  if not status["sandbox_ready"]:
    raise RuntimeError(
      "Apple subscription verification "
      "is not fully configured."
    )

  clients = _build_apple_clients(
    config
  )

  last_not_found: Exception | None = None

  for environment_name in (
    "production",
    "sandbox",
  ):
    pair = clients.get(
      environment_name
    )

    if not pair:
      continue

    client, verifier = pair

    try:
      response = (
        client.get_all_subscription_statuses(
          any_transaction_id
        )
      )
    except Exception as error:
      if _api_exception_is_not_found(
        error
      ):
        last_not_found = error
        continue

      raise

    candidates: list[
      tuple[
        int,
        int,
        int,
        Any,
        Any,
        str,
      ]
    ] = []

    for group in (
      getattr(
        response,
        "data",
        None,
      )
      or []
    ):
      for item in (
        getattr(
          group,
          "lastTransactions",
          None,
        )
        or []
      ):
        signed_transaction = _text(
          getattr(
            item,
            "signedTransactionInfo",
            None,
          )
        )

        if not signed_transaction:
          continue

        transaction = (
          verifier
          .verify_and_decode_signed_transaction(
            signed_transaction
          )
        )

        product_id = _text(
          getattr(
            transaction,
            "productId",
            None,
          )
        )

        if (
          product_id
          not in APPLE_PLAN_BY_PRODUCT_ID
        ):
          continue

        raw_status = _safe_int(
          getattr(
            item,
            "rawStatus",
            None,
          )
        )

        entitlement_status = (
          APPLE_NOTIFICATION_STATUS_BY_RAW.get(
            raw_status or 0,
            "expired",
          )
        )

        signed_renewal = _text(
          getattr(
            item,
            "signedRenewalInfo",
            None,
          )
        )

        renewal = (
          verifier
          .verify_and_decode_renewal_info(
            signed_renewal
          )
          if signed_renewal
          else None
        )

        purchase_ms = (
          _safe_int(
            getattr(
              transaction,
              "purchaseDate",
              None,
            )
          )
          or 0
        )

        expires_ms = (
          _safe_int(
            getattr(
              transaction,
              "expiresDate",
              None,
            )
          )
          or 0
        )

        status_priority = {
          "active": 50,
          "grace_period": 40,
          "billing_retry": 30,
          "expired": 20,
          "revoked": 10,
        }.get(
          entitlement_status,
          0,
        )

        candidates.append(
          (
            status_priority,
            expires_ms,
            purchase_ms,
            transaction,
            renewal,
            entitlement_status,
          )
        )

    if candidates:
      candidates.sort(
        key=lambda value: (
          value[0],
          value[1],
          value[2],
        ),
        reverse=True,
      )

      (
        _priority,
        _expires_ms,
        _purchase_ms,
        transaction,
        renewal,
        entitlement_status,
      ) = candidates[0]

      return (
        environment_name,
        transaction,
        renewal,
        entitlement_status,
      )

    raise LookupError(
      "Apple returned no Nova AI "
      "subscription status for this customer."
    )

  if last_not_found:
    raise LookupError(
      "Apple could not find the saved "
      "subscription in production or sandbox."
    ) from last_not_found

  raise LookupError(
    "Apple could not find the saved subscription."
  )


def _refresh_saved_subscription_from_apple(
  *,
  supabase_url: str,
  service_role_key: str,
  user_id: str,
) -> dict[str, Any]:
  existing = _subscription_row_for_user(
    supabase_url,
    service_role_key,
    user_id,
  )

  if not existing:
    return {
      "ok": True,
      "verified": False,
      "entitlement_active": False,
      "plan_id": "free",
      "purchased_plan_id": "free",
      "status": "free",
      "reason": "no_subscription",
    }

  original_transaction_id = _text(
    existing.get(
      "original_transaction_id"
    )
  )

  latest_transaction_id = _text(
    existing.get(
      "latest_transaction_id"
    )
  )

  lookup_id = (
    original_transaction_id
    or latest_transaction_id
  )

  if not lookup_id:
    return {
      "ok": True,
      "verified": False,
      "entitlement_active": False,
      "plan_id": "free",
      "purchased_plan_id":
        _text(
          existing.get("plan_id")
        )
        or "free",
      "status":
        _text(
          existing.get("status")
        )
        or "expired",
      "reason":
        "missing_transaction_identifier",
    }

  (
    environment_name,
    transaction,
    _renewal,
    entitlement_status,
  ) = _lookup_current_subscription(
    lookup_id
  )

  product_id = _text(
    getattr(
      transaction,
      "productId",
      None,
    )
  )

  plan_id = (
    APPLE_PLAN_BY_PRODUCT_ID.get(
      product_id
    )
  )

  if not plan_id:
    raise RuntimeError(
      "Apple returned a subscription "
      "that is not a Nova AI plan."
    )

  verified_original_transaction_id = _text(
    getattr(
      transaction,
      "originalTransactionId",
      None,
    )
  )

  verified_transaction_id = _text(
    getattr(
      transaction,
      "transactionId",
      None,
    )
  )

  if not (
    verified_original_transaction_id
    and verified_transaction_id
  ):
    raise RuntimeError(
      "Apple returned incomplete "
      "subscription identifiers."
    )

  if (
    original_transaction_id
    and verified_original_transaction_id
      != original_transaction_id
  ):
    raise PermissionError(
      "Apple returned a different "
      "subscription ownership chain."
    )

  app_account_token = _uuid_text(
    getattr(
      transaction,
      "appAccountToken",
      None,
    )
  )

  if (
    app_account_token
    and app_account_token != user_id
  ):
    raise PermissionError(
      "Apple subscription ownership "
      "does not match this Nova account."
    )

  purchase_ms = _safe_int(
    getattr(
      transaction,
      "purchaseDate",
      None,
    )
  )

  expires_ms = _safe_int(
    getattr(
      transaction,
      "expiresDate",
      None,
    )
  )

  if not (
    purchase_ms
    and expires_ms
  ):
    raise RuntimeError(
      "Apple returned incomplete "
      "subscription dates."
    )

  saved = _persist_subscription(
    supabase_url=
      supabase_url,
    service_role_key=
      service_role_key,
    user_id=
      user_id,
    plan_id=
      plan_id,
    product_id=
      product_id,
    original_transaction_id=
      verified_original_transaction_id,
    latest_transaction_id=
      verified_transaction_id,
    purchase_ms=
      purchase_ms,
    expires_ms=
      expires_ms,
    status=
      entitlement_status,
  )

  active = (
    entitlement_status in {
      "active",
      "grace_period",
      "billing_retry",
    }
  )

  (
    monthly_limit,
    memory_limit,
  ) = APPLE_LIMITS_BY_PLAN[
    plan_id
  ]

  return {
    "ok": True,
    "verified": True,
    "entitlement_active":
      active,
    "plan_id":
      plan_id
      if active
      else "free",
    "purchased_plan_id":
      plan_id,
    "product_id":
      product_id,
    "status":
      entitlement_status,
    "environment":
      environment_name,
    "original_transaction_id":
      verified_original_transaction_id,
    "latest_transaction_id":
      verified_transaction_id,
    "period_start":
      saved.get("period_start"),
    "period_end":
      saved.get("period_end"),
    "monthly_question_limit": (
      monthly_limit
      if active
      else 5
    ),
    "memory_message_limit": (
      memory_limit
      if active
      else 5
    ),
  }

def register_apple_subscription_routes(
  app: Flask,
  *,
  supabase_url: str,
  service_role_key: str,
  extract_bearer_token:
    Callable[[], str | None],
  verify_access_token:
    Callable[
      [str],
      dict[str, Any] | None,
    ],
) -> None:
  @app.get(
    "/api/apple-subscriptions/config"
  )
  def apple_subscription_config():
    return jsonify(
      ok=True,
      configured=(
        apple_subscription_configuration_status()
      ),
      products=list(
        APPLE_PLAN_BY_PRODUCT_ID.keys()
      ),
    )



  @app.post(
    "/api/apple-subscriptions/refresh"
  )
  def refresh_apple_subscription():
    """
    Reconcile the signed-in Nova account with Apple's current subscription
    status. The app never supplies an arbitrary transaction identifier here.
    """
    if not (
      supabase_url
      and service_role_key
    ):
      return jsonify(
        ok=False,
        error=(
          "Subscription storage "
          "is not configured."
        ),
      ), 503

    access_token = (
      extract_bearer_token()
    )

    if not access_token:
      return jsonify(
        ok=False,
        error=(
          "A signed-in Nova account "
          "is required."
        ),
      ), 401

    try:
      verified_user = (
        verify_access_token(
          access_token
        )
      )
    except Exception as error:
      print(
        "[apple-subscriptions] "
        "refresh auth exception:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=(
          "Nova could not verify "
          "the signed-in account."
        ),
      ), 503

    user_id = _uuid_text(
      (verified_user or {}).get("id")
    )

    if not user_id:
      return jsonify(
        ok=False,
        error=(
          "The signed-in Nova account "
          "could not be verified."
        ),
      ), 401

    try:
      result = (
        _refresh_saved_subscription_from_apple(
          supabase_url=
            supabase_url,
          service_role_key=
            service_role_key,
          user_id=
            user_id,
        )
      )

      print(
        "[apple-subscriptions] "
        "current status refreshed:",
        {
          "user_id":
            user_id,
          "plan_id":
            result.get(
              "purchased_plan_id"
            ),
          "status":
            result.get("status"),
          "period_end":
            result.get(
              "period_end"
            ),
          "environment":
            result.get(
              "environment"
            ),
        },
      )

      return jsonify(
        **result
      ), 200

    except LookupError as error:
      print(
        "[apple-subscriptions] "
        "refresh lookup failed:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=str(error),
      ), 404

    except PermissionError as error:
      print(
        "[apple-subscriptions] "
        "refresh ownership conflict:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=str(error),
      ), 409

    except RuntimeError as error:
      print(
        "[apple-subscriptions] "
        "refresh configuration/error:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=str(error),
      ), 503

    except Exception as error:
      print(
        "[apple-subscriptions] "
        "refresh failed:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=(
          "Nova could not refresh "
          "the Apple subscription."
        ),
      ), 502


  @app.post(
    "/api/apple-subscriptions/notifications/v2"
  )
  def apple_subscription_notifications_v2():
    """
    App Store Server Notifications V2.

    Apple authenticates this route using
    signedPayload rather than a Nova bearer token.
    """
    if not (
      supabase_url
      and service_role_key
    ):
      return jsonify(
        ok=False,
        error=(
          "Subscription storage "
          "is not configured."
        ),
      ), 503

    signed_payload = _text(
      (
        request.get_json(
          silent=True
        )
        or {}
      ).get(
        "signedPayload"
      )
    )

    if not signed_payload:
      return jsonify(
        ok=False,
        error=(
          "Apple signedPayload "
          "is required."
        ),
      ), 400

    payload_hash = (
      hashlib.sha256(
        signed_payload.encode(
          "utf-8"
        )
      ).hexdigest()
    )

    try:
      (
        environment_name,
        verifier,
        decoded,
      ) = _verify_notification_payload(
        signed_payload
      )

    except PermissionError as error:
      print(
        "[apple-notifications] "
        "signature rejected:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=(
          "Apple notification "
          "verification failed."
        ),
      ), 400

    except Exception as error:
      print(
        "[apple-notifications] "
        "verification unavailable:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=(
          "Apple notification "
          "verification is temporarily "
          "unavailable."
        ),
      ), 503

    notification_type = (
      _text(
        getattr(
          decoded,
          "rawNotificationType",
          None,
        )
      )
      or _enum_text(
        getattr(
          decoded,
          "notificationType",
          None,
        )
      )
      or "UNKNOWN"
    )

    subtype = (
      _text(
        getattr(
          decoded,
          "rawSubtype",
          None,
        )
      )
      or _enum_text(
        getattr(
          decoded,
          "subtype",
          None,
        )
      )
      or None
    )

    signed_ms = _safe_int(
      getattr(
        decoded,
        "signedDate",
        None,
      )
    )

    notification_uuid = (
      _text(
        getattr(
          decoded,
          "notificationUUID",
          None,
        )
      )
      or f"sha256:{payload_hash}"
    )

    try:
      rows = _notification_rows(
        supabase_url,
        service_role_key,
        notification_uuid,
      )

      if (
        rows
        and rows[0].get(
          "processed_at"
        )
      ):
        return jsonify(
          ok=True,
          duplicate=True,
        ), 200

      if not rows:
        _insert_notification(
          supabase_url,
          service_role_key,
          {
            "notification_uuid":
              notification_uuid,
            "notification_type":
              notification_type,
            "subtype":
              subtype,
            "environment":
              environment_name,
            "signed_at":
              _utc_iso_from_ms(
                signed_ms
              ),
            "payload_sha256":
              payload_hash,
            "processing_error":
              None,
          },
        )

    except Exception as error:
      print(
        "[apple-notifications] "
        "log insert failed:",
        repr(error),
      )

      return jsonify(
        ok=False,
      ), 503

    # Apple TEST notification
    if notification_type == "TEST":
      try:
        _patch_notification(
          supabase_url,
          service_role_key,
          notification_uuid,
          {
            "processed_at":
              _utc_now_iso(),
            "ignored":
              False,
            "processing_error":
              None,
          },
        )
      except Exception:
        return jsonify(
          ok=False,
        ), 503

      print(
        "[apple-notifications] "
        "verified TEST:",
        notification_uuid,
        environment_name,
      )

      return jsonify(
        ok=True,
        test=True,
      ), 200

    data = getattr(
      decoded,
      "data",
      None,
    )

    signed_transaction = (
      _text(
        getattr(
          data,
          "signedTransactionInfo",
          None,
        )
      )
      if data is not None
      else ""
    )

    signed_renewal = (
      _text(
        getattr(
          data,
          "signedRenewalInfo",
          None,
        )
      )
      if data is not None
      else ""
    )

    # Valid Apple events without a transaction
    # are recorded but need no Nova entitlement change.
    if not signed_transaction:
      try:
        _patch_notification(
          supabase_url,
          service_role_key,
          notification_uuid,
          {
            "processed_at":
              _utc_now_iso(),
            "ignored":
              True,
            "processing_error":
              None,
          },
        )
      except Exception:
        return jsonify(
          ok=False,
        ), 503

      return jsonify(
        ok=True,
        ignored=True,
      ), 200

    try:
      transaction = (
        verifier
        .verify_and_decode_signed_transaction(
          signed_transaction
        )
      )

      renewal = (
        verifier
        .verify_and_decode_renewal_info(
          signed_renewal
        )
        if signed_renewal
        else None
      )

    except Exception as error:
      print(
        "[apple-notifications] "
        "nested JWS verification failed:",
        repr(error),
      )

      try:
        _patch_notification(
          supabase_url,
          service_role_key,
          notification_uuid,
          {
            "processing_error": (
              "Nested Apple JWS "
              "verification failed."
            ),
          },
        )
      except Exception:
        pass

      return jsonify(
        ok=False,
      ), 503

    product_id = _text(
      getattr(
        transaction,
        "productId",
        None,
      )
    )

    plan_id = (
      APPLE_PLAN_BY_PRODUCT_ID.get(
        product_id
      )
    )

    original_transaction_id = _text(
      getattr(
        transaction,
        "originalTransactionId",
        None,
      )
    )

    transaction_id = _text(
      getattr(
        transaction,
        "transactionId",
        None,
      )
    )

    auto_renew_product_id = (
      _text(
        getattr(
          renewal,
          "autoRenewProductId",
          None,
        )
      )
      if renewal is not None
      else ""
    )

    try:
      _patch_notification(
        supabase_url,
        service_role_key,
        notification_uuid,
        {
          "original_transaction_id":
            original_transaction_id
            or None,
          "transaction_id":
            transaction_id
            or None,
          "product_id":
            product_id
            or None,
          "auto_renew_product_id":
            auto_renew_product_id
            or None,
        },
      )
    except Exception:
      return jsonify(
        ok=False,
      ), 503

    # Apple also sends notifications for Nova's
    # normal one-time IAPs. Ignore those here.
    if not plan_id:
      try:
        _patch_notification(
          supabase_url,
          service_role_key,
          notification_uuid,
          {
            "processed_at":
              _utc_now_iso(),
            "ignored":
              True,
            "processing_error":
              None,
          },
        )
      except Exception:
        return jsonify(
          ok=False,
        ), 503

      return jsonify(
        ok=True,
        ignored=True,
      ), 200

    if not (
      original_transaction_id
      and transaction_id
    ):
      return jsonify(
        ok=False,
        error=(
          "Apple returned incomplete "
          "subscription identifiers."
        ),
      ), 503

    try:
      owner_rows = (
        _subscription_owner_rows(
          supabase_url,
          service_role_key,
          original_transaction_id,
        )
      )

    except Exception as error:
      print(
        "[apple-notifications] "
        "owner lookup failed:",
        repr(error),
      )

      return jsonify(
        ok=False,
      ), 503

    existing_owner = (
      _uuid_text(
        owner_rows[0].get(
          "user_id"
        )
      )
      if owner_rows
      else None
    )

    account_token = _uuid_text(
      getattr(
        transaction,
        "appAccountToken",
        None,
      )
    )

    if (
      not account_token
      and renewal is not None
    ):
      account_token = _uuid_text(
        getattr(
          renewal,
          "appAccountToken",
          None,
        )
      )

    user_id = (
      existing_owner
      or account_token
    )

    if (
      existing_owner
      and account_token
      and existing_owner
      != account_token
    ):
      try:
        _patch_notification(
          supabase_url,
          service_role_key,
          notification_uuid,
          {
            "processed_at":
              _utc_now_iso(),
            "ignored":
              True,
            "processing_error": (
              "Apple appAccountToken "
              "does not match the linked "
              "Nova account."
            ),
          },
        )
      except Exception:
        return jsonify(
          ok=False,
        ), 503

      return jsonify(
        ok=True,
        ignored=True,
        ownership_conflict=True,
      ), 200

    if not user_id:
      try:
        _patch_notification(
          supabase_url,
          service_role_key,
          notification_uuid,
          {
            "processed_at":
              _utc_now_iso(),
            "ignored":
              True,
            "processing_error": (
              "No Nova account mapping "
              "was available for this "
              "verified Apple subscription."
            ),
          },
        )
      except Exception:
        return jsonify(
          ok=False,
        ), 503

      return jsonify(
        ok=True,
        ignored=True,
      ), 200

    # Prevent a delayed older Apple event from
    # overwriting a newer entitlement.
    if (
      owner_rows
      and signed_ms
    ):
      previous = _iso_datetime(
        owner_rows[0].get(
          "last_notification_signed_at"
        )
      )

      incoming = datetime.fromtimestamp(
        signed_ms / 1000,
        tz=timezone.utc,
      )

      if (
        previous is not None
        and incoming < previous
      ):
        try:
          _patch_notification(
            supabase_url,
            service_role_key,
            notification_uuid,
            {
              "user_id":
                user_id,
              "processed_at":
                _utc_now_iso(),
              "ignored":
                True,
              "processing_error":
                None,
            },
          )
        except Exception:
          return jsonify(
            ok=False,
          ), 503

        return jsonify(
          ok=True,
          stale=True,
        ), 200

    purchase_ms = _safe_int(
      getattr(
        transaction,
        "purchaseDate",
        None,
      )
    )

    expires_ms = _safe_int(
      getattr(
        transaction,
        "expiresDate",
        None,
      )
    )

    if not (
      purchase_ms
      and expires_ms
    ):
      return jsonify(
        ok=False,
        error=(
          "Apple returned incomplete "
          "subscription dates."
        ),
      ), 503

    entitlement_status = (
      _notification_entitlement_status(
        notification_type,
        subtype,
        getattr(
          data,
          "rawStatus",
          None,
        ),
        transaction,
        renewal,
      )
    )

    try:
      # Existing trusted persistence path.
      _persist_subscription(
        supabase_url=
          supabase_url,
        service_role_key=
          service_role_key,
        user_id=
          user_id,
        plan_id=
          plan_id,
        product_id=
          product_id,
        original_transaction_id=
          original_transaction_id,
        latest_transaction_id=
          transaction_id,
        purchase_ms=
          purchase_ms,
        expires_ms=
          expires_ms,
        status=
          entitlement_status,
      )

      _patch_subscription_notification_metadata(
        supabase_url,
        service_role_key,
        user_id,
        environment_name=
          environment_name,
        renewal=
          renewal,
        notification_uuid=
          notification_uuid,
        notification_type=
          notification_type,
        notification_subtype=
          subtype,
        notification_signed_ms=
          signed_ms,
      )

      _patch_notification(
        supabase_url,
        service_role_key,
        notification_uuid,
        {
          "user_id":
            user_id,
          "status":
            entitlement_status,
          "processed_at":
            _utc_now_iso(),
          "ignored":
            False,
          "processing_error":
            None,
        },
      )

    except PermissionError as error:
      print(
        "[apple-notifications] "
        "ownership conflict:",
        repr(error),
      )

      try:
        _patch_notification(
          supabase_url,
          service_role_key,
          notification_uuid,
          {
            "processed_at":
              _utc_now_iso(),
            "ignored":
              True,
            "processing_error":
              str(error),
          },
        )
      except Exception:
        return jsonify(
          ok=False,
        ), 503

      return jsonify(
        ok=True,
        ignored=True,
        ownership_conflict=True,
      ), 200

    except Exception as error:
      print(
        "[apple-notifications] "
        "processing failed:",
        repr(error),
      )

      try:
        _patch_notification(
          supabase_url,
          service_role_key,
          notification_uuid,
          {
            "processing_error": (
              "Subscription notification "
              "processing failed."
            ),
          },
        )
      except Exception:
        pass

      return jsonify(
        ok=False,
        error=(
          "Nova could not apply "
          "the Apple subscription event."
        ),
      ), 503

    print(
      "[apple-notifications] processed:",
      {
        "notification_uuid":
          notification_uuid,
        "type":
          notification_type,
        "subtype":
          subtype,
        "environment":
          environment_name,
        "user_id":
          user_id,
        "plan_id":
          plan_id,
        "status":
          entitlement_status,
        "auto_renew_product_id":
          auto_renew_product_id
          or None,
      },
    )

    return jsonify(
      ok=True,
      processed=True,
      plan_id=
        plan_id,
      status=
        entitlement_status,
    ), 200


  @app.post(
    "/api/apple-subscriptions/verify"
  )
  def verify_apple_subscription():
    if not (
      supabase_url
      and service_role_key
    ):
      return jsonify(
        ok=False,
        error=(
          "Subscription storage "
          "is not configured."
        ),
      ), 503

    access_token = (
      extract_bearer_token()
    )

    if not access_token:
      return jsonify(
        ok=False,
        error=(
          "A signed-in Nova account "
          "is required."
        ),
      ), 401

    try:
      verified_user = (
        verify_access_token(
          access_token
        )
      )
    except Exception as error:
      print(
        "[apple-subscriptions] "
        "Supabase auth exception:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=(
          "Nova could not verify "
          "the signed-in account."
        ),
      ), 503

    user_id = _uuid_text(
      (verified_user or {}).get("id")
    )

    if not user_id:
      return jsonify(
        ok=False,
        error=(
          "The signed-in Nova account "
          "could not be verified."
        ),
      ), 401

    body = (
      request.get_json(
        silent=True
      )
      or {}
    )

    transaction_id = _text(
      body.get("transaction_id")
      or body.get("transactionId")
      or body.get("id")
    )

    expected_product_id = _text(
      body.get("product_id")
      or body.get("productId")
    )

    environment_hint = _text(
      body.get("environment")
      or body.get(
        "store_environment"
      )
    )

    if not transaction_id:
      return jsonify(
        ok=False,
        error=(
          "An Apple transaction "
          "identifier is required."
        ),
      ), 400

    try:
      (
        environment_name,
        decoded,
      ) = _lookup_transaction(
        transaction_id,
        environment_hint,
      )

    except LookupError as error:
      print(
        "[apple-subscriptions] "
        "transaction not found:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=str(error),
      ), 404

    except RuntimeError as error:
      print(
        "[apple-subscriptions] "
        "configuration error:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=str(error),
      ), 503

    except Exception as error:
      print(
        "[apple-subscriptions] "
        "Apple verification failed:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=(
          "Apple could not verify "
          "this subscription purchase."
        ),
      ), 502

    product_id = _text(
      getattr(
        decoded,
        "productId",
        None,
      )
    )

    plan_id = (
      APPLE_PLAN_BY_PRODUCT_ID.get(
        product_id
      )
    )

    if not plan_id:
      return jsonify(
        ok=False,
        error=(
          "This Apple product is not "
          "a Nova AI subscription."
        ),
      ), 400

    if (
      expected_product_id
      and expected_product_id
      != product_id
    ):
      return jsonify(
        ok=False,
        error=(
          "The purchased product does "
          "not match the selected plan."
        ),
      ), 409

    app_account_token = _uuid_text(
      getattr(
        decoded,
        "appAccountToken",
        None,
      )
    )

    if app_account_token != user_id:
      print(
        "[apple-subscriptions] "
        "appAccountToken mismatch:",
        {
          "verified_user":
            user_id,
          "apple_token":
            app_account_token,
          "transaction_id":
            transaction_id,
        },
      )

      return jsonify(
        ok=False,
        error=(
          "This subscription could not "
          "be linked to the signed-in "
          "Nova account."
        ),
      ), 409

    original_transaction_id = _text(
      getattr(
        decoded,
        "originalTransactionId",
        None,
      )
    )

    latest_transaction_id = _text(
      getattr(
        decoded,
        "transactionId",
        None,
      )
    )

    purchase_ms = getattr(
      decoded,
      "purchaseDate",
      None,
    )

    expires_ms = getattr(
      decoded,
      "expiresDate",
      None,
    )

    revocation_ms = getattr(
      decoded,
      "revocationDate",
      None,
    )

    try:
      purchase_ms = int(
        purchase_ms
      )
      expires_ms = int(
        expires_ms
      )
    except (
      TypeError,
      ValueError,
    ):
      return jsonify(
        ok=False,
        error=(
          "Apple returned incomplete "
          "subscription dates."
        ),
      ), 502

    if not (
      original_transaction_id
      and latest_transaction_id
    ):
      return jsonify(
        ok=False,
        error=(
          "Apple returned incomplete "
          "transaction identifiers."
        ),
      ), 502

    now_ms = int(
      datetime.now(
        timezone.utc
      ).timestamp()
      * 1000
    )

    if revocation_ms:
      entitlement_status = "revoked"
    elif expires_ms <= now_ms:
      entitlement_status = "expired"
    else:
      entitlement_status = "active"

    try:
      saved = _persist_subscription(
        supabase_url=
          supabase_url,
        service_role_key=
          service_role_key,
        user_id=
          user_id,
        plan_id=
          plan_id,
        product_id=
          product_id,
        original_transaction_id=
          original_transaction_id,
        latest_transaction_id=
          latest_transaction_id,
        purchase_ms=
          purchase_ms,
        expires_ms=
          expires_ms,
        status=
          entitlement_status,
      )

    except PermissionError as error:
      print(
        "[apple-subscriptions] "
        "ownership conflict:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=str(error),
      ), 409

    except Exception as error:
      print(
        "[apple-subscriptions] "
        "Supabase update failed:",
        repr(error),
      )

      return jsonify(
        ok=False,
        error=(
          "Nova verified the purchase "
          "but could not save the "
          "subscription."
        ),
      ), 503

    (
      monthly_limit,
      memory_limit,
    ) = APPLE_LIMITS_BY_PLAN[
      plan_id
    ]

    active = (
      entitlement_status
      == "active"
    )

    print(
      "[apple-subscriptions] verified:",
      {
        "user_id":
          user_id,
        "plan_id":
          plan_id,
        "product_id":
          product_id,
        "environment":
          environment_name,
        "status":
          entitlement_status,
        "transaction_id":
          latest_transaction_id,
      },
    )

    return jsonify(
      ok=True,
      verified=True,
      entitlement_active=
        active,
      plan_id=(
        plan_id
        if active
        else "free"
      ),
      purchased_plan_id=
        plan_id,
      product_id=
        product_id,
      status=
        entitlement_status,
      environment=
        environment_name,
      original_transaction_id=
        original_transaction_id,
      latest_transaction_id=
        latest_transaction_id,
      period_start=
        saved.get("period_start"),
      period_end=
        saved.get("period_end"),
      monthly_question_limit=(
        monthly_limit
        if active
        else 5
      ),
      memory_message_limit=(
        memory_limit
        if active
        else 5
      ),
    ), 200
