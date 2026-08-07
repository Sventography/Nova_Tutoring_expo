from __future__ import annotations

import base64
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
