from types import SimpleNamespace
import unittest
from apple_purchase_policy import sandbox_purchase_policy, BUNDLE_ID
A = "00000000-0000-4000-8000-000000000001"
B = "00000000-0000-4000-8000-000000000002"
class ApplePurchasePolicyTests(unittest.TestCase):
    def fixture(self, **changes):
        data = dict(environment="Sandbox", bundleId=BUNDLE_ID,
                    transactionId="123", originalTransactionId="123",
                    appAccountToken=A, revocationDate=None, revocationReason=None,
                    inAppOwnershipType="PURCHASED", productId="theme_neon",
                    type="Non-Consumable", quantity=1)
        return SimpleNamespace(**{**data, **changes})
    def test_reviewed_products(self):
        for sku, item, coins, kind in [
            ("theme_neon", "theme:neon", 0, "Non-Consumable"),
            ("cursor_orb", "cursor:orb", 0, "Non-Consumable"),
            ("coins_1000", None, 1000, "Consumable"),
            ("coins_5000", None, 5000, "Consumable"),
        ]:
            with self.subTest(sku=sku):
                plan = sandbox_purchase_policy(self.fixture(productId=sku, type=kind), A, "123")
                self.assertEqual((plan.item_id, plan.coins, plan.account_id), (item, coins, A))
    def test_rejections(self):
        for changes in [
            {"appAccountToken":B}, {"appAccountToken":None}, {"appAccountToken":""},
            {"environment":"Production"}, {"environment":"Xcode"}, {"bundleId":"other.app"},
            {"transactionId":"124"}, {"originalTransactionId":None}, {"revocationDate":1},
            {"revocationReason":0}, {"inAppOwnershipType":"FAMILY_SHARED"},
            {"productId":"bundle_neon"}, {"productId":"unknown"}, {"productId":"ask_memory_tier1"},
            {"type":"Consumable"}, {"quantity":2}, {"quantity":True}, {"quantity":None},
        ]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                sandbox_purchase_policy(self.fixture(**changes), A, "123")
