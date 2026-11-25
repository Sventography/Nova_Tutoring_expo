"""Sandbox grant planning only, AFTER Apple's cryptographic JWS verification.
Do not expose as an endpoint or use client-supplied decoded fields.
"""
from dataclasses import dataclass
from uuid import UUID
import re

BUNDLE_ID = "com.sventography.novatutoring.ios"
PRODUCTS = {
    "coins_1000": ("Consumable", 1000, None),
    "coins_5000": ("Consumable", 5000, None),
    "theme_neon": ("Non-Consumable", 0, "theme:neon"),
    "cursor_orb": ("Non-Consumable", 0, "cursor:orb"),
}

@dataclass(frozen=True)
class VerifiedPurchase:
    transaction_id: str
    original_transaction_id: str
    account_id: str
    product_id: str
    coins: int
    item_id: str | None

def _enum(value):
    return getattr(value, "value", value)

def sandbox_purchase_policy(decoded, account_id, requested_transaction_id):
    """Return a grant plan, not a grant. Tokenless historical and family
    purchases require separate reconciliation rather than first-claim wins.
    """
    if _enum(getattr(decoded, "environment", None)) != "Sandbox":
        raise ValueError("Sandbox required")
    if getattr(decoded, "bundleId", None) != BUNDLE_ID:
        raise ValueError("Wrong app")
    tx = getattr(decoded, "transactionId", None)
    original = getattr(decoded, "originalTransactionId", None)
    if (not isinstance(tx, str) or not re.fullmatch(r"[0-9]{1,64}", tx)
            or tx != requested_transaction_id
            or not isinstance(original, str) or not re.fullmatch(r"[0-9]{1,64}", original)):
        raise ValueError("Invalid transaction")
    try:
        owner = str(UUID(str(account_id)))
        token = str(UUID(str(getattr(decoded, "appAccountToken", None))))
    except (ValueError, TypeError, AttributeError):
        raise ValueError("Account binding required") from None
    if owner != token:
        raise ValueError("Account mismatch")
    if getattr(decoded, "revocationDate", None) is not None or getattr(decoded, "revocationReason", None) is not None:
        raise ValueError("Revoked transaction")
    if _enum(getattr(decoded, "inAppOwnershipType", None)) != "PURCHASED":
        raise ValueError("Unsupported ownership")
    product = getattr(decoded, "productId", None)
    if not isinstance(product, str) or product not in PRODUCTS:
        raise ValueError("Unreviewed product")
    kind, coins, item = PRODUCTS[product]
    if _enum(getattr(decoded, "type", None)) != kind:
        raise ValueError("Product type mismatch")
    quantity = getattr(decoded, "quantity", None)
    if type(quantity) is not int or quantity != 1:
        raise ValueError("Unsupported quantity")
    return VerifiedPurchase(tx, original, owner, product, coins, item)
