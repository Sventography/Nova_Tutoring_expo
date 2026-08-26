from __future__ import annotations

import hashlib
import hmac
import html
import json
import secrets
import time
from typing import Any, Callable
from urllib.parse import quote

import requests
from flask import Response, jsonify, request


_CONFIG = {
    "registered": False,
    "stripe": False,
    "webhook_secret": False,
    "supabase": False,
    "checkout_enabled": False,
}


def merch_checkout_configuration_status() -> dict:
    return dict(_CONFIG)


def register_merch_checkout_routes(
    app,
    *,
    supabase_url: str,
    service_role_key: str,
    stripe_module,
    stripe_secret_key: str,
    webhook_secret: str,
    checkout_enabled: bool = False,
    extract_bearer_token: Callable[[], str | None],
    verify_access_token: Callable[[str], dict | None],
):
    """
    Register Nova's hardened physical-merch checkout routes.

    Security boundary:
      * client never sends a dollar amount;
      * client never selects another user id;
      * server asks Supabase RPC for the authoritative order total;
      * Stripe amount must exactly match the stored server total at finalize;
      * Nova Rewards are captured only after verified payment.
    """

    base = (supabase_url or "").rstrip("/")
    service_key = (service_role_key or "").strip()
    stripe_key = (stripe_secret_key or "").strip()
    webhook_key = (webhook_secret or "").strip()

    _CONFIG.update(
        registered=True,
        stripe=bool(stripe_module and stripe_key),
        webhook_secret=bool(webhook_key),
        supabase=bool(base and service_key),
        checkout_enabled=bool(checkout_enabled),
    )

    if stripe_module and stripe_key:
        stripe_module.api_key = stripe_key

    def _rpc(name: str, payload: dict | None = None):
        if not (base and service_key):
            raise RuntimeError("Supabase server configuration is incomplete.")

        response = requests.post(
            f"{base}/rest/v1/rpc/{name}",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
            },
            json=payload or {},
            timeout=15,
        )

        if response.status_code >= 400:
            raise RuntimeError(
                f"Supabase RPC {name} failed: "
                f"{response.status_code} {response.text[:1000]}"
            )

        if not response.text.strip():
            return None

        try:
            return response.json()
        except Exception as error:
            raise RuntimeError(
                f"Supabase RPC {name} returned invalid JSON."
            ) from error

    def _rest_get(table: str, params: dict):
        response = requests.get(
            f"{base}/rest/v1/{table}",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
            },
            params=params,
            timeout=15,
        )

        if response.status_code >= 400:
            raise RuntimeError(
                f"Supabase read {table} failed: "
                f"{response.status_code} {response.text[:1000]}"
            )

        data = response.json()
        return data if isinstance(data, list) else []

    def _rest_patch(table: str, params: dict, payload: dict):
        response = requests.patch(
            f"{base}/rest/v1/{table}",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            params=params,
            json=payload,
            timeout=15,
        )

        if response.status_code not in (200, 204):
            raise RuntimeError(
                f"Supabase update {table} failed: "
                f"{response.status_code} {response.text[:1000]}"
            )

    def _one_rpc_row(data: Any) -> dict:
        if isinstance(data, list) and data and isinstance(data[0], dict):
            return data[0]
        if isinstance(data, dict):
            return data
        raise RuntimeError("Expected one row from merchandise RPC.")

    def _get_order(order_id: str) -> dict | None:
        rows = _rest_get(
            "merch_orders",
            {
                "id": f"eq.{order_id}",
                "select": (
                    "id,user_id,sku,title_snapshot,category_snapshot,"
                    "unit_price_cents,merchandise_subtotal_cents,"
                    "reward_points_reserved,reward_discount_cents,"
                    "merchandise_cash_due_cents,currency,size,shipping,"
                    "status,payment_provider,payment_reference,metadata,"
                    "created_at,paid_at"
                ),
                "limit": 1,
            },
        )
        return rows[0] if rows else None

    def _authenticated_user():
        token = extract_bearer_token()

        if not token:
            return None, (
                jsonify(
                    ok=False,
                    code="AUTH_REQUIRED",
                    error="A signed-in Nova account is required for physical checkout.",
                ),
                401,
            )

        try:
            user = verify_access_token(token)
        except Exception as error:
            print("[merch] auth verification error:", repr(error))
            return None, (
                jsonify(
                    ok=False,
                    code="AUTH_UNAVAILABLE",
                    error="Nova could not verify the signed-in account.",
                ),
                503,
            )

        user_id = str((user or {}).get("id") or "").strip()
        if not user_id:
            return None, (
                jsonify(
                    ok=False,
                    code="AUTH_REQUIRED",
                    error="The signed-in Nova account could not be verified.",
                ),
                401,
            )

        return user, None

    def _normalize_shipping(value: Any) -> dict:
        raw = value if isinstance(value, dict) else {}

        def pick(*keys):
            for key in keys:
                value = raw.get(key)
                if value is not None and str(value).strip():
                    return str(value).strip()
            return ""

        shipping = {
            "name": pick("name", "fullName", "recipient"),
            "phone": pick("phone", "contactPhone", "phoneNumber"),
            "address1": pick("address1", "line1", "addressLine1"),
            "address2": pick("address2", "line2", "addressLine2"),
            "city": pick("city"),
            "state": pick("state", "region"),
            "postalCode": pick("postalCode", "zip", "zipCode"),
            "country": pick("country") or "US",
            "notes": pick("notes", "instructions"),
        }

        required = ("name", "address1", "city", "state", "postalCode", "country")
        missing = [key for key in required if not shipping.get(key)]
        if missing:
            raise ValueError(
                "Missing shipping fields: " + ", ".join(missing)
            )

        return shipping

    def _cancel_token_hash(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def _cancel_order(order_id: str, reason: str) -> bool:
        data = _rpc(
            "nova_cancel_merch_checkout_order",
            {
                "p_order_id": order_id,
                "p_reason": reason,
            },
        )

        if isinstance(data, bool):
            return data
        if isinstance(data, list) and data:
            return bool(data[0])
        return bool(data)

    def _stripe_value(obj: Any, key: str, default: Any = None) -> Any:
        if isinstance(obj, dict):
            return obj.get(key, default)
        try:
            return getattr(obj, key)
        except (AttributeError, KeyError):
            return default

    def _finalize_session(session: Any):
        metadata = _stripe_value(session, "metadata", {}) or {}
        if not isinstance(metadata, dict):
            try:
                metadata = dict(metadata)
            except Exception:
                metadata = {}

        order_id = str(metadata.get("nova_merch_order_id") or "").strip()
        if not order_id:
            raise RuntimeError("Stripe session is missing Nova merch order metadata.")

        session_id = str(_stripe_value(session, "id", "") or "").strip()
        amount_total = _stripe_value(session, "amount_total", None)
        currency = str(
            _stripe_value(session, "currency", "") or ""
        ).lower().strip()
        payment_status = str(
            _stripe_value(session, "payment_status", "") or ""
        ).lower().strip()

        if payment_status != "paid":
            return {
                "finalized": False,
                "order_id": order_id,
                "payment_status": payment_status,
            }

        if not isinstance(amount_total, int) or amount_total < 0:
            raise RuntimeError("Stripe session has no valid paid amount.")

        result = _one_rpc_row(
            _rpc(
                "nova_finalize_merch_payment",
                {
                    "p_order_id": order_id,
                    "p_payment_reference": session_id,
                    "p_paid_amount_cents": amount_total,
                    "p_currency": currency,
                    "p_payment_provider": "stripe",
                },
            )
        )

        return {
            "finalized": bool(result.get("finalized")),
            "order_id": order_id,
            "reward_points_debited": int(
                result.get("reward_points_debited") or 0
            ),
            "wallet_balance": int(result.get("wallet_balance") or 0),
            "order_status": result.get("order_status"),
            "payment_status": payment_status,
        }

    @app.get("/api/merch/config")
    def merch_config():
        return jsonify(
            ok=True,
            configured=merch_checkout_configuration_status(),
            rewards_to_cent=2,
            max_discount_percent=25,
            app_checkout_enabled=bool(checkout_enabled),
        )

    @app.post("/api/merch/checkout/start")
    def merch_checkout_start():
        if not checkout_enabled:
            return jsonify(
                ok=False,
                code="MERCH_CHECKOUT_DISABLED",
                error="Nova merchandise checkout is not enabled yet.",
            ), 503

        user, auth_error = _authenticated_user()
        if auth_error:
            return auth_error

        if not (stripe_module and stripe_key):
            return jsonify(
                ok=False,
                code="STRIPE_NOT_CONFIGURED",
                error="Physical checkout is temporarily unavailable.",
            ), 503

        body = request.get_json(silent=True) or {}

        forbidden_price_keys = {
            "amount",
            "amount_cents",
            "price",
            "priceId",
            "price_id",
            "unit_amount",
            "unitPrice",
        }
        supplied_forbidden = sorted(
            key for key in forbidden_price_keys if key in body
        )
        if supplied_forbidden:
            return jsonify(
                ok=False,
                code="CLIENT_PRICE_REJECTED",
                error="Physical merchandise prices are controlled by Nova's server.",
                rejected_fields=supplied_forbidden,
            ), 400

        sku = str(body.get("sku") or "").strip()
        size = str(body.get("size") or "").strip() or None

        if not sku:
            return jsonify(ok=False, error="Missing merchandise SKU."), 400

        try:
            requested_rewards = int(
                body.get("requestedRewardPoints")
                if body.get("requestedRewardPoints") is not None
                else body.get("requested_reward_points") or 0
            )
        except Exception:
            return jsonify(
                ok=False,
                error="requestedRewardPoints must be an integer.",
            ), 400

        requested_rewards = max(0, requested_rewards)

        try:
            shipping = _normalize_shipping(body.get("shipping"))
        except ValueError as error:
            return jsonify(ok=False, error=str(error)), 400

        user_id = str(user.get("id"))

        # Opportunistic cleanup; failure must not block a valid new checkout.
        try:
            _rpc("nova_expire_stale_merch_orders", {})
        except Exception as error:
            print("[merch] stale-order cleanup warning:", repr(error))

        cancel_token = secrets.token_urlsafe(32)
        cancel_hash = _cancel_token_hash(cancel_token)

        try:
            order_row = _one_rpc_row(
                _rpc(
                    "nova_create_merch_checkout_order",
                    {
                        "p_user_id": user_id,
                        "p_sku": sku,
                        "p_requested_reward_points": requested_rewards,
                        "p_size": size,
                        "p_shipping": shipping,
                        "p_metadata": {
                            "cancelTokenHash": cancel_hash,
                            "createdBy": "api/merch/checkout/start",
                        },
                    },
                )
            )
        except Exception as error:
            print("[merch] create order failed:", repr(error))
            return jsonify(
                ok=False,
                code="MERCH_ORDER_REJECTED",
                error=(
                    "Nova could not create this merchandise order. "
                    "Please check the item, size, and Rewards amount."
                ),
            ), 400

        order_id = str(order_row.get("order_id") or "")
        cash_due = int(order_row.get("merchandise_cash_due_cents") or 0)
        currency = str(order_row.get("currency") or "usd").lower()
        reward_points = int(order_row.get("reward_points_reserved") or 0)
        discount_cents = int(order_row.get("reward_discount_cents") or 0)
        title = str(order_row.get("title") or sku)

        if not order_id or cash_due <= 0:
            if order_id:
                try:
                    _cancel_order(order_id, "invalid_server_quote")
                except Exception:
                    pass
            return jsonify(
                ok=False,
                code="INVALID_SERVER_QUOTE",
                error="Nova could not create a valid merchandise checkout.",
            ), 500

        root = request.url_root.rstrip("/")
        success_url = (
            f"{root}/checkout/merch/success"
            "?session_id={CHECKOUT_SESSION_ID}"
        )
        cancel_url = (
            f"{root}/checkout/merch/cancel"
            f"?order_id={quote(order_id)}"
            f"&token={quote(cancel_token)}"
        )

        try:
            session = stripe_module.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": currency,
                            "unit_amount": cash_due,
                            "product_data": {
                                "name": title,
                                "description": (
                                    "Nova physical merchandise"
                                    + (
                                        f" · {reward_points} earned Nova Rewards applied"
                                        if reward_points > 0
                                        else ""
                                    )
                                ),
                            },
                        },
                        "quantity": 1,
                    }
                ],
                success_url=success_url,
                cancel_url=cancel_url,
                expires_at=int(time.time()) + (35 * 60),
                client_reference_id=order_id,
                metadata={
                    "nova_merch_order_id": order_id,
                    "nova_user_id": user_id,
                    "nova_sku": sku,
                    "nova_reward_points_reserved": str(reward_points),
                    "nova_reward_discount_cents": str(discount_cents),
                    "nova_cash_due_cents": str(cash_due),
                    "nova_policy_version": "3B1",
                },
            )
        except Exception as error:
            print("[merch] Stripe session creation failed:", repr(error))
            try:
                _cancel_order(order_id, "stripe_session_create_failed")
            except Exception as cancel_error:
                print("[merch] failed to release failed session:", repr(cancel_error))

            return jsonify(
                ok=False,
                code="STRIPE_SESSION_FAILED",
                error="Nova could not start the secure payment session.",
            ), 502

        try:
            _rpc(
                "nova_mark_merch_order_payment_pending",
                {
                    "p_order_id": order_id,
                    "p_payment_reference": session.id,
                    "p_payment_provider": "stripe",
                },
            )
        except Exception as error:
            print("[merch] could not bind Stripe session:", repr(error))
            try:
                stripe_module.checkout.Session.expire(session.id)
            except Exception:
                pass
            try:
                _cancel_order(order_id, "stripe_bind_failed")
            except Exception:
                pass
            return jsonify(
                ok=False,
                code="ORDER_BIND_FAILED",
                error="Nova could not secure the merchandise order.",
            ), 500

        return jsonify(
            ok=True,
            orderId=order_id,
            checkoutUrl=session.url,
            stripeSessionId=session.id,
            currency=currency,
            merchandiseSubtotalCents=int(
                order_row.get("merchandise_subtotal_cents") or 0
            ),
            rewardPointsReserved=reward_points,
            rewardDiscountCents=discount_cents,
            merchandiseCashDueCents=cash_due,
            expiresAt=order_row.get("expires_at"),
        )

    @app.get("/api/merch/order/<order_id>")
    def merch_order_status(order_id: str):
        user, auth_error = _authenticated_user()
        if auth_error:
            return auth_error

        order = _get_order(order_id)
        if not order or str(order.get("user_id")) != str(user.get("id")):
            return jsonify(ok=False, error="Order not found."), 404

        return jsonify(ok=True, order=order)

    @app.post("/api/merch/checkout/cancel")
    def merch_checkout_cancel():
        user, auth_error = _authenticated_user()
        if auth_error:
            return auth_error

        body = request.get_json(silent=True) or {}
        order_id = str(body.get("orderId") or body.get("order_id") or "").strip()
        if not order_id:
            return jsonify(ok=False, error="Missing order id."), 400

        order = _get_order(order_id)
        if not order or str(order.get("user_id")) != str(user.get("id")):
            return jsonify(ok=False, error="Order not found."), 404

        changed = _cancel_order(order_id, "cancelled_by_user")
        return jsonify(ok=True, cancelled=bool(changed))

    @app.get("/checkout/merch/cancel")
    def merch_cancel_landing():
        order_id = str(request.args.get("order_id") or "").strip()
        token = str(request.args.get("token") or "").strip()

        valid = False
        if order_id and token:
            try:
                order = _get_order(order_id)
                expected = str(
                    ((order or {}).get("metadata") or {}).get("cancelTokenHash")
                    or ""
                )
                actual = _cancel_token_hash(token)
                valid = bool(expected) and hmac.compare_digest(expected, actual)

                if valid:
                    _cancel_order(order_id, "cancelled_from_stripe")
            except Exception as error:
                print("[merch] cancel landing error:", repr(error))

        title = "Checkout cancelled" if valid else "Checkout closed"
        message = (
            "No merchandise payment was completed. Any held Nova Rewards were released."
            if valid
            else "Return to Nova Tutoring to check your merchandise order."
        )

        return Response(
            _landing_page(title, message),
            status=200,
            mimetype="text/html",
        )

    @app.get("/checkout/merch/success")
    def merch_success_landing():
        session_id = str(request.args.get("session_id") or "").strip()
        finalized = False

        if session_id and stripe_module and stripe_key:
            try:
                session = stripe_module.checkout.Session.retrieve(session_id)
                result = _finalize_session(session)
                finalized = (
                    result.get("order_status") == "paid"
                    or result.get("payment_status") == "paid"
                )
            except Exception as error:
                print("[merch] success landing finalize warning:", repr(error))

        if finalized:
            title = "Payment received"
            message = (
                "Your Nova merchandise order is confirmed. "
                "Open Nova Tutoring to see your updated Rewards balance."
            )
        else:
            title = "Payment processing"
            message = (
                "Stripe is finishing your payment confirmation. "
                "Your Nova order will update automatically."
            )

        return Response(
            _landing_page(title, message),
            status=200,
            mimetype="text/html",
        )

    @app.post("/api/merch/stripe/webhook")
    def merch_stripe_webhook():
        if not webhook_key:
            return jsonify(
                ok=False,
                code="WEBHOOK_NOT_CONFIGURED",
                error="Merchandise Stripe webhook is not configured.",
            ), 503

        signature = request.headers.get("Stripe-Signature") or ""
        payload = request.get_data(cache=False, as_text=False)

        try:
            event = stripe_module.Webhook.construct_event(
                payload,
                signature,
                webhook_key,
            )
        except Exception as error:
            print("[merch] invalid Stripe webhook:", repr(error))
            return jsonify(ok=False, error="Invalid webhook."), 400

        event_type = str(_stripe_value(event, "type", "") or "")
        event_data = _stripe_value(event, "data", {}) or {}
        data_object = _stripe_value(event_data, "object", {}) or {}

        nova_checkout_events = (
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
            "checkout.session.expired",
            "checkout.session.async_payment_failed",
        )

        # This Stripe account may also receive non-Nova Checkout events.
        # A valid Nova merch session always carries nova_merch_order_id.
        # Ignore unrelated Checkout Sessions instead of returning 500/retrying.
        if event_type in nova_checkout_events:
            metadata = _stripe_value(data_object, "metadata", {}) or {}
            if not isinstance(metadata, dict):
                try:
                    metadata = dict(metadata)
                except Exception:
                    metadata = {}
            order_id = str(
                metadata.get("nova_merch_order_id") or ""
            ).strip()
            if not order_id:
                return jsonify(ok=True, ignored=True)

        try:
            if event_type in (
                "checkout.session.completed",
                "checkout.session.async_payment_succeeded",
            ):
                _finalize_session(data_object)

            elif event_type in (
                "checkout.session.expired",
                "checkout.session.async_payment_failed",
            ):
                _cancel_order(order_id, "expired")

        except Exception as error:
            # Return non-2xx so Stripe retries a transient finalization failure.
            print("[merch] webhook processing failed:", repr(error))
            return jsonify(ok=False, error="Webhook processing failed."), 500

        return jsonify(ok=True)

    def _landing_page(title: str, message: str) -> str:
        safe_title = html.escape(title)
        safe_message = html.escape(message)

        return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Nova Tutoring — {safe_title}</title>
  <style>
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      box-sizing: border-box;
      background: #090912;
      color: #fff;
      font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }}
    .card {{
      width: min(100%, 440px);
      padding: 28px;
      border-radius: 22px;
      border: 1px solid #8b74ff;
      background: #151522;
      text-align: center;
    }}
    h1 {{ margin: 0 0 12px; }}
    p {{ color: #c9c9d8; line-height: 1.55; }}
    a {{
      display: inline-block;
      margin-top: 16px;
      padding: 12px 18px;
      border-radius: 12px;
      background: #8b74ff;
      color: white;
      text-decoration: none;
      font-weight: 800;
    }}
  </style>
</head>
<body>
  <main class="card">
    <h1>{safe_title}</h1>
    <p>{safe_message}</p>
    <a href="nova://">Open Nova Tutoring</a>
  </main>
</body>
</html>"""
