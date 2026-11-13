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


FLAT_SHIPPING_CENTS = 695
ALLOWED_SHIPPING_COUNTRIES = ("US",)
MERCH_POLICY_VERSION = "3B1.5"


_CONFIG = {
    "registered": False,
    "stripe": False,
    "webhook_secret": False,
    "supabase": False,
    "notifications": False,
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
    resend_api_key: str,
    resend_from_email: str,
    shop_owner_email: str,
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
    resend_key = (resend_api_key or "").strip()
    resend_from = (resend_from_email or "").strip()
    owner_email = (shop_owner_email or "").strip()

    _CONFIG.update(
        registered=True,
        stripe=bool(stripe_module and stripe_key),
        webhook_secret=bool(webhook_key),
        supabase=bool(base and service_key),
        notifications=bool(
            resend_key and resend_from and owner_email
        ),
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
                    "merchandise_cash_due_cents,shipping_amount_cents,"
                    "tax_amount_cents,payment_total_cents,currency,size,shipping,"
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

        shipping["country"] = str(shipping["country"]).upper()
        if shipping["country"] not in ALLOWED_SHIPPING_COUNTRIES:
            raise ValueError(
                "Nova merchandise currently ships only within the United States."
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

    def _stripe_mapping(value: Any) -> dict:
        if isinstance(value, dict):
            return value
        try:
            return dict(value or {})
        except Exception:
            return {}

    def _stripe_shipping_snapshot(session: Any) -> dict:
        # Basil (2025-03-31+) moved shipping_details under
        # collected_information. Keep a legacy fallback for older Session
        # objects returned by an older account API version.
        collected = _stripe_mapping(
            _stripe_value(session, "collected_information", {})
        )
        details = _stripe_mapping(
            collected.get("shipping_details")
            or _stripe_value(session, "shipping_details", {})
        )
        address = _stripe_mapping(details.get("address"))
        customer = _stripe_mapping(
            _stripe_value(session, "customer_details", {})
        )

        snapshot = {
            "name": str(details.get("name") or "").strip(),
            "phone": str(
                details.get("phone")
                or customer.get("phone")
                or ""
            ).strip(),
            "email": str(customer.get("email") or "").strip(),
            "address1": str(address.get("line1") or "").strip(),
            "address2": str(address.get("line2") or "").strip(),
            "city": str(address.get("city") or "").strip(),
            "state": str(address.get("state") or "").strip(),
            "postalCode": str(
                address.get("postal_code") or ""
            ).strip(),
            "country": str(
                address.get("country") or ""
            ).upper().strip(),
            "source": "stripe_checkout",
        }

        required = (
            "name",
            "address1",
            "city",
            "state",
            "postalCode",
            "country",
        )

        missing = [
            key for key in required
            if not snapshot.get(key)
        ]

        if missing:
            raise RuntimeError(
                "Paid Stripe session is missing shipping fields: "
                + ", ".join(missing)
            )

        if snapshot["country"] not in ALLOWED_SHIPPING_COUNTRIES:
            raise RuntimeError(
                "Paid Stripe session has a non-US shipping address."
            )

        return snapshot

    def _lookup_auth_email(user_id: str) -> str:
        if not (base and service_key and user_id):
            return ""
        try:
            response = requests.get(
                f"{base}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": service_key,
                    "Authorization": f"Bearer {service_key}",
                },
                timeout=15,
            )
            if response.status_code != 200:
                return ""
            data = response.json()
            return (
                str(data.get("email") or "").strip()
                if isinstance(data, dict)
                else ""
            )
        except Exception as error:
            print("[merch-email] auth lookup warning:", repr(error))
            return ""

    def _money(cents: Any, currency: str) -> str:
        value = int(cents or 0)
        code = str(currency or "usd").upper()
        if code == "USD":
            return f"${value / 100:.2f}"
        return f"{value / 100:.2f} {code}"

    def _notification_payload(
        *,
        kind: str,
        order: dict,
        recipient: str,
    ) -> dict:
        shipping = (
            order.get("shipping")
            if isinstance(order.get("shipping"), dict)
            else {}
        )
        title = str(
            order.get("title_snapshot")
            or order.get("sku")
            or "Nova merchandise"
        ).strip()
        order_id = str(order.get("id") or "").strip()
        sku = str(order.get("sku") or "").strip()
        size = str(order.get("size") or "").strip()
        currency = str(order.get("currency") or "usd").lower()
        name = str(shipping.get("name") or "Nova learner").strip()
        phone = str(shipping.get("phone") or "").strip()
        email_address = str(shipping.get("email") or "").strip()

        address = [
            name,
            str(shipping.get("address1") or "").strip(),
            str(shipping.get("address2") or "").strip(),
            " ".join(
                x for x in (
                    str(shipping.get("city") or "").strip(),
                    str(shipping.get("state") or "").strip(),
                    str(shipping.get("postalCode") or "").strip(),
                ) if x
            ),
            str(shipping.get("country") or "").strip(),
        ]
        address_text = "\n".join(x for x in address if x)

        subtotal = _money(
            order.get("merchandise_subtotal_cents"), currency
        )
        discount = _money(
            order.get("reward_discount_cents"), currency
        )
        cash_due = _money(
            order.get("merchandise_cash_due_cents"), currency
        )
        shipping_amount = _money(
            order.get("shipping_amount_cents"), currency
        )
        tax_amount = _money(
            order.get("tax_amount_cents"), currency
        )
        total = _money(
            order.get("payment_total_cents"), currency
        )
        rewards = int(order.get("reward_points_reserved") or 0)
        stripe_ref = str(
            order.get("payment_reference") or ""
        ).strip()

        common = [
            f"Order ID: {order_id}",
            f"Item: {title}",
            f"SKU: {sku}",
        ]
        if size:
            common.append(f"Size: {size}")

        common.extend([
            "",
            f"Merchandise subtotal: {subtotal}",
            f"Nova Rewards used: {rewards}",
            f"Nova Rewards discount: -{discount}",
            f"Merchandise cash due: {cash_due}",
            f"Shipping: {shipping_amount}",
            f"Tax: {tax_amount}",
            f"Total paid: {total}",
            "",
            "Ship to:",
            address_text,
        ])

        if kind == "customer_confirmation":
            subject = f"Nova Tutoring order confirmed — {title}"
            lines = [
                f"Hi {name},",
                "",
                "Your Nova Tutoring merchandise payment is confirmed.",
                "",
                *common,
                "",
                (
                    "Nova Rewards discount merchandise only. "
                    "Shipping and tax are paid separately in cash."
                ),
                "",
                "Thank you for supporting Nova Tutoring.",
            ]
        elif kind == "owner_fulfillment":
            subject = (
                "PAID Nova merchandise order — "
                f"{title} — {order_id[:8]}"
            )
            lines = [
                (
                    "A Nova merchandise order has been PAID "
                    "and is ready for fulfillment."
                ),
                "",
                *common,
                "",
                f"Customer email: {email_address or '(not available)'}",
                f"Customer phone: {phone or '(not available)'}",
                f"Stripe reference: {stripe_ref}",
                "",
                (
                    "Do not mark fulfilled until the physical order "
                    "is actually shipped/handled."
                ),
            ]
        else:
            raise RuntimeError("Unknown merchandise notification kind.")

        body_text = "\n".join(lines)
        body_html = (
            "<!doctype html><html><body>"
            "<pre style=\"font-family:Arial,sans-serif;"
            "white-space:pre-wrap;line-height:1.5\">"
            + html.escape(body_text)
            + "</pre></body></html>"
        )

        return {
            "from": resend_from,
            "to": [recipient],
            "subject": subject,
            "text": body_text,
            "html": body_html,
        }

    def _send_notification(
        *,
        kind: str,
        order: dict,
        recipient: str,
    ) -> dict:
        order_id = str(order.get("id") or "").strip()
        recipient = str(recipient or "").strip()
        if not order_id or not recipient:
            raise RuntimeError(
                "Merchandise notification is missing order/recipient."
            )
        if not (resend_key and resend_from):
            raise RuntimeError(
                "Resend merchandise notifications are not configured."
            )

        idempotency_key = (
            f"nova-merch/{kind}/{order_id}"
        )
        proposed_payload = _notification_payload(
            kind=kind,
            order=order,
            recipient=recipient,
        )

        claim = _one_rpc_row(
            _rpc(
                "nova_claim_merch_notification",
                {
                    "p_order_id": order_id,
                    "p_kind": kind,
                    "p_recipient": recipient,
                    "p_idempotency_key": idempotency_key,
                    "p_payload": proposed_payload,
                    "p_lease_seconds": 300,
                },
            )
        )

        status = str(
            claim.get("notification_status") or ""
        ).strip()

        if not bool(claim.get("claimed")):
            if status == "sent":
                return {"status": "sent", "sent": True}
            raise RuntimeError(
                f"Notification {kind} is already being delivered; "
                "Stripe should retry."
            )

        frozen_payload = claim.get("payload")
        frozen_key = str(
            claim.get("idempotency_key") or ""
        ).strip()

        if not isinstance(frozen_payload, dict) or not frozen_key:
            _rpc(
                "nova_fail_merch_notification",
                {
                    "p_order_id": order_id,
                    "p_kind": kind,
                    "p_error": "Frozen notification payload/key invalid.",
                },
            )
            raise RuntimeError(
                "Frozen merchandise notification payload/key is invalid."
            )

        try:
            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                    "Idempotency-Key": frozen_key,
                },
                json=frozen_payload,
                timeout=15,
            )
            if response.status_code >= 400:
                raise RuntimeError(
                    f"Resend HTTP {response.status_code}: "
                    f"{response.text[:500]}"
                )

            provider_id = ""
            try:
                response_data = response.json()
                if isinstance(response_data, dict):
                    provider_id = str(
                        response_data.get("id") or ""
                    ).strip()
            except Exception:
                pass

            completed = _rpc(
                "nova_complete_merch_notification",
                {
                    "p_order_id": order_id,
                    "p_kind": kind,
                    "p_provider_message_id": provider_id or None,
                },
            )
            if completed is False:
                raise RuntimeError(
                    "Could not mark merchandise notification sent."
                )

            print(
                "[merch-email] sent:",
                kind,
                order_id,
            )
            return {"status": "sent", "sent": True}

        except Exception as error:
            try:
                _rpc(
                    "nova_fail_merch_notification",
                    {
                        "p_order_id": order_id,
                        "p_kind": kind,
                        "p_error": str(error)[:1500],
                    },
                )
            except Exception as mark_error:
                print(
                    "[merch-email] failure-state warning:",
                    repr(mark_error),
                )
            raise

    def _deliver_paid_order_notifications(
        order_id: str,
    ) -> dict:
        if not (
            resend_key
            and resend_from
            and owner_email
        ):
            raise RuntimeError(
                "Paid merchandise notifications are not configured."
            )

        order = _get_order(order_id)
        if not order:
            raise RuntimeError("Paid merchandise order was not found.")
        if str(order.get("status") or "") not in (
            "paid",
            "fulfilled",
        ):
            raise RuntimeError(
                "Merchandise notification requires a paid order."
            )

        shipping = (
            order.get("shipping")
            if isinstance(order.get("shipping"), dict)
            else {}
        )
        customer_email = str(
            shipping.get("email") or ""
        ).strip()
        if not customer_email:
            customer_email = _lookup_auth_email(
                str(order.get("user_id") or "").strip()
            )
        if not customer_email:
            raise RuntimeError(
                "Paid merchandise order has no trusted customer email."
            )

        owner_result = _send_notification(
            kind="owner_fulfillment",
            order=order,
            recipient=owner_email,
        )
        customer_result = _send_notification(
            kind="customer_confirmation",
            order=order,
            recipient=customer_email,
        )
        return {
            "owner": owner_result,
            "customer": customer_result,
        }


    def _finalize_session(session: Any):
        metadata = _stripe_value(session, "metadata", {}) or {}

        if not isinstance(metadata, dict):
            try:
                metadata = dict(metadata)
            except Exception:
                metadata = {}

        order_id = str(
            metadata.get("nova_merch_order_id") or ""
        ).strip()

        if not order_id:
            raise RuntimeError(
                "Stripe session is missing Nova merch order metadata."
            )

        session_id = str(
            _stripe_value(session, "id", "") or ""
        ).strip()

        amount_subtotal = _stripe_value(
            session,
            "amount_subtotal",
            None,
        )
        amount_total = _stripe_value(
            session,
            "amount_total",
            None,
        )

        currency = str(
            _stripe_value(session, "currency", "") or ""
        ).lower().strip()

        payment_status = str(
            _stripe_value(
                session,
                "payment_status",
                "",
            ) or ""
        ).lower().strip()

        if payment_status != "paid":
            return {
                "finalized": False,
                "order_id": order_id,
                "payment_status": payment_status,
            }

        if (
            not isinstance(amount_subtotal, int)
            or amount_subtotal < 0
        ):
            raise RuntimeError(
                "Stripe session has no valid merchandise subtotal."
            )

        if (
            not isinstance(amount_total, int)
            or amount_total < 0
        ):
            raise RuntimeError(
                "Stripe session has no valid paid amount."
            )

        order = _get_order(order_id)

        if not order:
            raise RuntimeError(
                "Stripe session references an unknown Nova order."
            )

        expected_cash_due = int(
            order.get("merchandise_cash_due_cents") or 0
        )

        expected_shipping = int(
            order.get("shipping_amount_cents") or 0
        )

        if expected_shipping != FLAT_SHIPPING_CENTS:
            raise RuntimeError(
                "Nova order does not contain the expected "
                "flat shipping amount."
            )

        total_details = _stripe_mapping(
            _stripe_value(
                session,
                "total_details",
                {},
            )
        )

        amount_shipping = total_details.get(
            "amount_shipping"
        )
        amount_tax = total_details.get(
            "amount_tax"
        )
        amount_discount = total_details.get(
            "amount_discount"
        )

        if amount_subtotal != expected_cash_due:
            raise RuntimeError(
                "Stripe merchandise subtotal does not match "
                "Nova's server quote."
            )

        if amount_shipping != expected_shipping:
            raise RuntimeError(
                "Stripe shipping amount does not match "
                "Nova's server shipping."
            )

        if amount_discount not in (0, None):
            raise RuntimeError(
                "Unexpected Stripe discount on Nova checkout."
            )

        if (
            not isinstance(amount_tax, int)
            or amount_tax < 0
        ):
            raise RuntimeError(
                "Stripe session has no valid automatic-tax amount."
            )

        automatic_tax = _stripe_mapping(
            _stripe_value(
                session,
                "automatic_tax",
                {},
            )
        )

        if automatic_tax.get("enabled") is not True:
            raise RuntimeError(
                "Stripe automatic tax was not enabled."
            )

        if automatic_tax.get("status") != "complete":
            raise RuntimeError(
                "Stripe automatic tax is not complete."
            )

        expected_total = (
            expected_cash_due
            + expected_shipping
            + amount_tax
        )

        if amount_total != expected_total:
            raise RuntimeError(
                "Stripe paid total does not equal "
                "merchandise + shipping + tax."
            )

        stripe_shipping = _stripe_shipping_snapshot(
            session
        )

        _rest_patch(
            "merch_orders",
            {"id": f"eq.{order_id}"},
            {"shipping": stripe_shipping},
        )

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
            "wallet_balance": int(
                result.get("wallet_balance") or 0
            ),
            "order_status": result.get("order_status"),
            "payment_status": payment_status,
            "shipping_amount_cents": expected_shipping,
            "tax_amount_cents": amount_tax,
            "payment_total_cents": amount_total,
        }

    @app.get("/api/merch/config")
    def merch_config():
        return jsonify(
            ok=True,
            configured=merch_checkout_configuration_status(),
            rewards_to_cent=2,
            max_discount_percent=25,
            flat_shipping_cents=FLAT_SHIPPING_CENTS,
            automatic_tax=True,
            allowed_shipping_countries=list(
                ALLOWED_SHIPPING_COUNTRIES
            ),
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

        if not (
            webhook_key
            and resend_key
            and resend_from
            and owner_email
        ):
            return jsonify(
                ok=False,
                code="MERCH_FULFILLMENT_NOT_CONFIGURED",
                error=(
                    "Physical checkout is temporarily unavailable "
                    "while order notifications are configured."
                ),
            ), 503

        user, auth_error = _authenticated_user()
        if auth_error:
            return auth_error

        customer_email = str(
            (user or {}).get("email") or ""
        ).strip()
        if not customer_email:
            return jsonify(
                ok=False,
                code="CUSTOMER_EMAIL_REQUIRED",
                error=(
                    "A verified account email is required "
                    "for physical merchandise orders."
                ),
            ), 400

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
            "shipping_amount",
            "shippingAmount",
            "shipping_cents",
            "shippingCents",
            "tax_amount",
            "taxAmount",
            "tax_cents",
            "taxCents",
            "total",
            "total_cents",
            "totalCents",
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

        order_snapshot = (
            _get_order(order_id)
            if order_id
            else None
        )

        shipping_cents = int(
            (order_snapshot or {}).get(
                "shipping_amount_cents"
            ) or 0
        )

        if (
            not order_id
            or cash_due <= 0
            or shipping_cents != FLAT_SHIPPING_CENTS
        ):
            if order_id:
                try:
                    _cancel_order(
                        order_id,
                        "invalid_server_quote_or_shipping",
                    )
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
                customer_email=customer_email,
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
                                "tax_code": "txcd_99999999",
                            },
                            "tax_behavior": "exclusive",
                        },
                        "quantity": 1,
                    }
                ],
                automatic_tax={
                    "enabled": True,
                },
                shipping_address_collection={
                    "allowed_countries": list(
                        ALLOWED_SHIPPING_COUNTRIES
                    ),
                },
                shipping_options=[
                    {
                        "shipping_rate_data": {
                            "type": "fixed_amount",
                            "fixed_amount": {
                                "amount": shipping_cents,
                                "currency": currency,
                            },
                            "display_name": (
                                "Nova flat shipping"
                            ),
                            "tax_behavior": "exclusive",
                            "tax_code": "txcd_92010001",
                        },
                    }
                ],
                phone_number_collection={
                    "enabled": True,
                },
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
                    "nova_shipping_cents": str(
                        shipping_cents
                    ),
                    "nova_tax_provider": (
                        "stripe_automatic_tax"
                    ),
                    "nova_policy_version": (
                        MERCH_POLICY_VERSION
                    ),
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
            shippingAmountCents=shipping_cents,
            preTaxTotalCents=(
                cash_due + shipping_cents
            ),
            taxCalculatedAtCheckout=True,
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
                finalize_result = _finalize_session(
                    data_object
                )

                if (
                    finalize_result.get("order_status")
                    in ("paid", "fulfilled")
                    or finalize_result.get("payment_status")
                    == "paid"
                ):
                    _deliver_paid_order_notifications(
                        str(finalize_result.get("order_id"))
                    )

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
