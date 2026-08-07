from __future__ import annotations

import hashlib
import hmac
import re
import uuid
from typing import Any

import requests


GUEST_AI_QUESTION_LIMIT = 2
_GUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{16,160}$")


def _text(value: Any) -> str:
  return str(value or "").strip()


def _int(value: Any, default: int = 0) -> int:
  try:
    return int(value)
  except (TypeError, ValueError):
    return default


def _headers(
  service_role_key: str,
) -> dict[str, str]:
  return {
    "apikey": service_role_key,
    "Authorization":
      f"Bearer {service_role_key}",
    "Content-Type":
      "application/json",
  }


def _rpc(
  supabase_url: str,
  service_role_key: str,
  function_name: str,
  payload: dict[str, Any],
) -> dict[str, Any]:
  response = requests.post(
    (
      f"{supabase_url}"
      f"/rest/v1/rpc/{function_name}"
    ),
    headers=_headers(
      service_role_key
    ),
    json=payload,
    timeout=15,
  )

  if response.status_code not in (
    200,
    201,
    204,
  ):
    raise RuntimeError(
      f"{function_name} failed: "
      f"{response.status_code} "
      f"{response.text[:800]}"
    )

  if not response.text.strip():
    return {}

  data = response.json()

  if (
    isinstance(data, list)
    and data
    and isinstance(data[0], dict)
  ):
    return data[0]

  if isinstance(data, dict):
    return data

  return {}


def hash_guest_installation_id(
  installation_id: str,
  secret: str,
) -> str:
  raw = _text(installation_id)
  key = _text(secret)

  if not key:
    raise RuntimeError(
      "Guest AI hash secret is missing."
    )

  if not _GUEST_ID_PATTERN.fullmatch(raw):
    raise ValueError(
      "The guest installation identifier is invalid."
    )

  return hmac.new(
    key.encode("utf-8"),
    raw.encode("utf-8"),
    hashlib.sha256,
  ).hexdigest()


def get_guest_ai_usage(
  *,
  supabase_url: str,
  service_role_key: str,
  guest_key_hash: str,
) -> dict[str, int]:
  row = _rpc(
    supabase_url,
    service_role_key,
    "get_guest_ai_usage_status",
    {
      "p_guest_key_hash":
        guest_key_hash,
      "p_question_limit":
        GUEST_AI_QUESTION_LIMIT,
    },
  )

  questions_used = max(
    0,
    _int(
      row.get("questions_used"),
      0,
    ),
  )

  questions_reserved = max(
    0,
    _int(
      row.get("questions_reserved"),
      0,
    ),
  )

  questions_remaining = max(
    0,
    _int(
      row.get("questions_remaining"),
      GUEST_AI_QUESTION_LIMIT
      - questions_used
      - questions_reserved,
    ),
  )

  return {
    "questions_used":
      questions_used,
    "questions_reserved":
      questions_reserved,
    "questions_remaining":
      questions_remaining,
  }


def reserve_guest_ai_question(
  *,
  supabase_url: str,
  service_role_key: str,
  guest_key_hash: str,
  model: str,
) -> dict[str, Any]:
  request_id = str(
    uuid.uuid4()
  )

  row = _rpc(
    supabase_url,
    service_role_key,
    "reserve_guest_ai_question",
    {
      "p_guest_key_hash":
        guest_key_hash,
      "p_question_limit":
        GUEST_AI_QUESTION_LIMIT,
      "p_request_id":
        request_id,
      "p_model":
        model,
    },
  )

  row["request_id"] = (
    request_id
  )
  row["question_limit"] = (
    GUEST_AI_QUESTION_LIMIT
  )

  return row


def finalize_guest_ai_question(
  *,
  supabase_url: str,
  service_role_key: str,
  request_id: str,
  model: str,
  prompt_tokens: int,
  cached_input_tokens: int,
  completion_tokens: int,
  cost_usd_snapshot: float,
) -> dict[str, Any]:
  return _rpc(
    supabase_url,
    service_role_key,
    "finalize_guest_ai_question",
    {
      "p_request_id":
        request_id,
      "p_model":
        model,
      "p_prompt_tokens": max(
        0,
        int(prompt_tokens),
      ),
      "p_cached_input_tokens": max(
        0,
        int(cached_input_tokens),
      ),
      "p_completion_tokens": max(
        0,
        int(completion_tokens),
      ),
      "p_cost_usd_snapshot": max(
        0.0,
        float(cost_usd_snapshot),
      ),
    },
  )


def release_guest_ai_question(
  *,
  supabase_url: str,
  service_role_key: str,
  request_id: str,
  error_code: str | None = None,
) -> dict[str, Any]:
  return _rpc(
    supabase_url,
    service_role_key,
    "release_guest_ai_question",
    {
      "p_request_id":
        request_id,
      "p_error_code":
        _text(error_code)
        or None,
    },
  )
