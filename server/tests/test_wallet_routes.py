"""Isolated adapter tests; no real HTTP, credentials, or database writes."""
import os
import unittest
from unittest.mock import Mock, patch
import requests
from flask import Flask
from wallet_routes import STAGING_URL, register_wallet_routes

A = "00000000-0000-4000-8000-000000000001"
B = "00000000-0000-4000-8000-000000000002"
C = "00000000-0000-4000-8000-000000000003"
START = {"topic_id":"math","request_id":B}
ANSWER = {"attempt_id":B,"question_id":C,"choice":2}

class WalletRoutesTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"NOVA_VERIFIED_QUIZ_ENABLED":"true","NOVA_VERIFIED_COIN_SHOP_ENABLED":"true"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.post = patch("wallet_routes.requests.post")
        self.rpc = self.post.start()
        self.addCleanup(self.post.stop)
        self.rpc.return_value.status_code = 200
        self.rpc.return_value.json.return_value = {"status":"question","attempt_id":B,"choices":["a","b","c","d"],"correct_index":2}
        self.verify = Mock(return_value={"id":A,"is_anonymous":False})

    def client(self, url=STAGING_URL, token="fixture", headers=True):
        app = Flask(__name__)
        app.testing = True
        register_wallet_routes(app, supabase_url=url,
            extract_bearer_token=lambda:token, verify_access_token=self.verify,
            headers_for_service=lambda extra:extra if headers else None)
        return app.test_client()

    def test_disabled_by_default(self):
        with patch.dict(os.environ, {"NOVA_VERIFIED_QUIZ_ENABLED":"","NOVA_VERIFIED_COIN_SHOP_ENABLED":""}):
            c=self.client()
            self.assertEqual(c.post("/api/wallet/quiz/start",json=START).status_code,503)
            self.assertEqual(c.post("/api/wallet/purchase",json={"item_id":"lamp"}).status_code,503)
        self.rpc.assert_not_called()
        self.verify.assert_not_called()

    def test_nonstaging_blocked_even_if_enabled(self):
        self.assertEqual(self.client("https://production.example.invalid").post("/api/wallet/quiz/start",json=START).json["status"],"closed")
        self.rpc.assert_not_called()

    def test_start_uses_authenticated_account_and_allowlist(self):
        r=self.client().post("/api/wallet/quiz/start",json=START)
        self.assertEqual(r.status_code,200)
        self.assertNotIn("correct_index",r.json)
        self.assertEqual(r.headers["Cache-Control"],"no-store, private")
        self.assertEqual(self.rpc.call_args.kwargs["json"],{"p_user_id":A,"p_topic_id":"math","p_request_id":B})
        self.assertFalse(self.rpc.call_args.kwargs["allow_redirects"])

    def test_forged_fields_rejected(self):
        c=self.client()
        for path, body in [
            ("/api/wallet/quiz/start",{**START,"user_id":C}),
            ("/api/wallet/quiz/answer",{**ANSWER,"correct":True}),
            ("/api/wallet/purchase",{"item_id":"lamp","price":0}),
            ("/api/wallet/purchase",{"item_id":"lamp","amount":50000}),
        ]:
            self.assertEqual(c.post(path,json=body).status_code,400)
        self.rpc.assert_not_called()

    def test_no_token_and_anonymous_denied(self):
        self.assertEqual(self.client(token=None).post("/api/wallet/quiz/start",json=START).status_code,401)
        self.verify.return_value={"id":A,"is_anonymous":True}
        self.assertEqual(self.client().post("/api/wallet/quiz/start",json=START).status_code,401)
        self.rpc.assert_not_called()

    def test_answer_passes_choice_not_correctness_and_filters_nested(self):
        self.rpc.return_value.json.return_value={"status":"answered","correct":False,"coins_awarded":0,"next":{"status":"question","choices":["a","b","c","d"],"correct_index":1,"bank_id":"secret"}}
        r=self.client().post("/api/wallet/quiz/answer",json=ANSWER)
        self.assertEqual(r.status_code,200)
        self.assertEqual(r.json["coins_awarded"],0)
        self.assertNotIn("correct_index",r.json["next"])
        self.assertNotIn("bank_id",r.json["next"])
        self.assertEqual(self.rpc.call_args.kwargs["json"],{"p_user_id":A,"p_attempt_id":B,"p_question_id":C,"p_choice":2})

    def test_current_resume(self):
        r=self.client().post("/api/wallet/quiz/current",json={"attempt_id":B})
        self.assertEqual(r.status_code,200)
        self.assertEqual(self.rpc.call_args.kwargs["json"],{"p_user_id":A,"p_attempt_id":B})

    def test_purchase_uses_catalog_only(self):
        self.rpc.return_value.json.return_value={"status":"owned","balance":10,"internal":"secret"}
        r=self.client().post("/api/wallet/purchase",json={"item_id":"lamp"})
        self.assertEqual(r.json,{"status":"owned","balance":10})
        self.assertEqual(self.rpc.call_args.kwargs["json"],{"p_user_id":A,"p_item_id":"lamp"})

    def test_invalid_input(self):
        c=self.client()
        for body in [{**ANSWER,"choice":True},{**ANSWER,"choice":5},{**ANSWER,"attempt_id":"bad"},{}]:
            self.assertEqual(c.post("/api/wallet/quiz/answer",json=body).status_code,400)
        self.assertEqual(c.post("/api/wallet/quiz/start",json={"topic_id":"x"*3000,"request_id":B}).status_code,413)
        self.assertEqual(c.post("/api/wallet/quiz/start",data="not json",content_type="application/json").status_code,400)
        self.rpc.assert_not_called()

    def test_rpc_failures_are_generic(self):
        c=self.client()
        self.rpc.return_value.status_code=302
        self.assertEqual(c.post("/api/wallet/quiz/start",json=START).json,{"status":"unavailable"})
        self.rpc.side_effect=requests.Timeout("private internal detail")
        self.assertEqual(c.post("/api/wallet/quiz/start",json=START).json,{"status":"unavailable"})

    def test_missing_credentials_and_bad_response(self):
        self.assertEqual(self.client(headers=False).post("/api/wallet/quiz/start",json=START).status_code,503)
        self.rpc.assert_not_called()
        self.rpc.return_value.json.return_value={"status":"unexpected","secret":"private"}
        self.assertEqual(self.client().post("/api/wallet/quiz/start",json=START).json,{"status":"unavailable"})

if __name__ == "__main__":
    unittest.main()
