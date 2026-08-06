from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

import requests


ACTIVE_SUBSCRIPTION_STATUSES = {
  "active",
  "grace_period",
  "billing_retry",
}


def _text(value: Any) -> str:
  return str(value or "").strip()


def _int(value: Any, default: int = 0) -> int:
  try:
    return int(value)
  except (TypeError, ValueError):
    return default


def _float_env(name: str) -> float:
  try:
    return max(
      0.0,
      float(
        _text(os.getenv(name))
        or "0"
      ),
    )
  except (TypeError, ValueError):
    return 0.0


def _parse_time(value: Any) -> datetime | None:
  raw = _text(value)

  if not raw:
    return None

  try:
    parsed = datetime.fromisoformat(
      raw.replace("Z", "+00:00")
    )
  except ValueError:
    return None

  if parsed.tzinfo is None:
    parsed = parsed.replace(
      tzinfo=timezone.utc
    )

  return parsed.astimezone(
    timezone.utc
  )


def _iso(value: datetime) -> str:
  return value.astimezone(
    timezone.utc
  ).isoformat()


def _calendar_month_period(
  now: datetime,
) -> tuple[datetime, datetime]:
  start = datetime(
    now.year,
    now.month,
    1,
    tzinfo=timezone.utc,
  )

  if now.month == 12:
    end = datetime(
      now.year + 1,
      1,
      1,
      tzinfo=timezone.utc,
    )
  else:
    end = datetime(
      now.year,
      now.month + 1,
      1,
      tzinfo=timezone.utc,
    )

  return start, end


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


def _get_rows(
  supabase_url: str,
  service_role_key: str,
  table: str,
  params: dict[str, str],
) -> list[dict[str, Any]]:
  response = requests.get(
    f"{supabase_url}/rest/v1/{table}",
    headers=_headers(
      service_role_key
    ),
    params=params,
    timeout=12,
  )

  if response.status_code != 200:
    raise RuntimeError(
      f"{table} lookup failed: "
      f"{response.status_code} "
      f"{response.text[:600]}"
    )

  data = response.json()

  return (
    data
    if isinstance(data, list)
    else []
  )


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


def _fetch_plan(
  supabase_url: str,
  service_role_key: str,
  plan_id: str,
) -> dict[str, Any]:
  rows = _get_rows(
    supabase_url,
    service_role_key,
    "ai_plans",
    {
      "id": f"eq.{plan_id}",
      "select": (
        "id,"
        "monthly_question_limit,"
        "memory_message_limit,"
        "active"
      ),
      "limit": "1",
    },
  )

  if not rows:
    raise RuntimeError(
      f"AI plan {plan_id!r} "
      "was not found."
    )

  row = rows[0]

  if not bool(
    row.get("active", True)
  ):
    raise RuntimeError(
      f"AI plan {plan_id!r} "
      "is inactive."
    )

  return row


def resolve_ai_entitlement(
  *,
  supabase_url: str,
  service_role_key: str,
  user_id: str,
) -> dict[str, Any]:
  now = datetime.now(
    timezone.utc
  )

  period_start, period_end = (
    _calendar_month_period(now)
  )

  plan_id = "free"
  subscription_status = "free"

  rows = _get_rows(
    supabase_url,
    service_role_key,
    "ai_subscriptions",
    {
      "user_id": f"eq.{user_id}",
      "select": (
        "plan_id,"
        "status,"
        "period_start,"
        "period_end"
      ),
      "limit": "1",
    },
  )

  if rows:
    subscription = rows[0]

    candidate_plan = (
      _text(
        subscription.get(
          "plan_id"
        )
      )
      or "free"
    )

    candidate_status = (
      _text(
        subscription.get(
          "status"
        )
      )
      or "free"
    )

    candidate_start = _parse_time(
      subscription.get(
        "period_start"
      )
    )

    candidate_end = _parse_time(
      subscription.get(
        "period_end"
      )
    )

    paid_is_current = (
      candidate_plan
      in {
        "basic",
        "plus",
        "pro",
        "ultimate",
      }
      and candidate_status
      in ACTIVE_SUBSCRIPTION_STATUSES
      and candidate_start is not None
      and candidate_end is not None
      and candidate_end > now
    )

    if paid_is_current:
      plan_id = candidate_plan
      subscription_status = (
        candidate_status
      )
      period_start = (
        candidate_start
      )
      period_end = (
        candidate_end
      )

  plan = _fetch_plan(
    supabase_url,
    service_role_key,
    plan_id,
  )

  question_limit = max(
    1,
    _int(
      plan.get(
        "monthly_question_limit"
      ),
      5,
    ),
  )

  memory_limit = max(
    0,
    _int(
      plan.get(
        "memory_message_limit"
      ),
      5,
    ),
  )

  return {
    "plan_id":
      plan_id,
    "subscription_status":
      subscription_status,
    "question_limit":
      question_limit,
    "memory_message_limit":
      memory_limit,
    "period_start":
      _iso(period_start),
    "period_end":
      _iso(period_end),
  }


def reserve_ai_question(
  *,
  supabase_url: str,
  service_role_key: str,
  user_id: str,
  entitlement: dict[str, Any],
  model: str,
) -> dict[str, Any]:
  request_id = str(
    uuid.uuid4()
  )

  row = _rpc(
    supabase_url,
    service_role_key,
    "reserve_ai_question",
    {
      "p_user_id":
        user_id,
      "p_plan_id":
        entitlement["plan_id"],
      "p_period_start":
        entitlement["period_start"],
      "p_period_end":
        entitlement["period_end"],
      "p_question_limit":
        entitlement["question_limit"],
      "p_request_id":
        request_id,
      "p_model":
        model,
    },
  )

  row["request_id"] = (
    request_id
  )

  row["plan_id"] = (
    entitlement["plan_id"]
  )

  row["period_start"] = (
    entitlement["period_start"]
  )

  row["period_end"] = (
    entitlement["period_end"]
  )

  row["question_limit"] = (
    entitlement["question_limit"]
  )

  return row


def finalize_ai_question(
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
    "finalize_ai_question",
    {
      "p_request_id":
        request_id,
      "p_model":
        model,
      "p_prompt_tokens":
        max(
          0,
          int(prompt_tokens),
        ),
      "p_cached_input_tokens":
        max(
          0,
          int(cached_input_tokens),
        ),
      "p_completion_tokens":
        max(
          0,
          int(completion_tokens),
        ),
      "p_cost_usd_snapshot":
        max(
          0.0,
          float(cost_usd_snapshot),
        ),
    },
  )


def release_ai_question(
  *,
  supabase_url: str,
  service_role_key: str,
  request_id: str,
  error_code: str | None = None,
) -> dict[str, Any]:
  return _rpc(
    supabase_url,
    service_role_key,
    "release_ai_question",
    {
      "p_request_id":
        request_id,
      "p_error_code":
        _text(error_code)
        or None,
    },
  )


def extract_completion_usage(
  completion: Any,
) -> dict[str, int]:
  usage = getattr(
    completion,
    "usage",
    None,
  )

  if usage is None:
    return {
      "prompt_tokens": 0,
      "cached_input_tokens": 0,
      "completion_tokens": 0,
    }

  prompt_tokens = max(
    0,
    _int(
      getattr(
        usage,
        "prompt_tokens",
        0,
      )
    ),
  )

  completion_tokens = max(
    0,
    _int(
      getattr(
        usage,
        "completion_tokens",
        0,
      )
    ),
  )

  cached_input_tokens = 0

  details = getattr(
    usage,
    "prompt_tokens_details",
    None,
  )

  if details is not None:
    cached_input_tokens = max(
      0,
      _int(
        getattr(
          details,
          "cached_tokens",
          0,
        )
      ),
    )

  cached_input_tokens = min(
    cached_input_tokens,
    prompt_tokens,
  )

  return {
    "prompt_tokens":
      prompt_tokens,
    "cached_input_tokens":
      cached_input_tokens,
    "completion_tokens":
      completion_tokens,
  }


def estimate_openai_cost_usd(
  usage: dict[str, int],
) -> float:
  # Configure these in Render later from the
  # current OpenAI pricing for OPENAI_MODEL.
  #
  # Until configured, token counts are still
  # recorded accurately and cost remains 0.
  input_per_million = (
    _float_env(
      "OPENAI_INPUT_COST_PER_1M"
    )
  )

  cached_per_million = (
    _float_env(
      "OPENAI_CACHED_INPUT_COST_PER_1M"
    )
  )

  output_per_million = (
    _float_env(
      "OPENAI_OUTPUT_COST_PER_1M"
    )
  )

  prompt_tokens = max(
    0,
    _int(
      usage.get(
        "prompt_tokens"
      )
    ),
  )

  cached_tokens = min(
    prompt_tokens,
    max(
      0,
      _int(
        usage.get(
          "cached_input_tokens"
        )
      ),
    ),
  )

  output_tokens = max(
    0,
    _int(
      usage.get(
        "completion_tokens"
      )
    ),
  )

  uncached_tokens = max(
    prompt_tokens
    - cached_tokens,
    0,
  )

  cost = (
    (
      uncached_tokens
      * input_per_million
    )
    + (
      cached_tokens
      * cached_per_million
    )
    + (
      output_tokens
      * output_per_million
    )
  ) / 1_000_000

  return round(
    cost,
    8,
  )
