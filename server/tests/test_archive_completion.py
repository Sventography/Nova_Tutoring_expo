"""Local Flask tests: fixed phrases cannot award coins without trusted proof."""
import os
import unittest
from unittest.mock import Mock, patch
from flask import Flask
from archive_completion import register_archive_routes

BODY = {"recovered": "unerased first draft", "prompt": "ask nova what she got wrong"}

class ArchiveCompletionTests(unittest.TestCase):
    def client(self, verifier=None, user=None, verification_url=None):
        app = Flask(__name__)
        app.testing = True
        register_archive_routes(app, extract_bearer_token=lambda: "fixture",
            verify_access_token=lambda token: user,
            headers_for_service=lambda headers: headers,
            rpc_url="https://example.invalid/rpc", verify_completion_evidence=verifier, verification_rpc_url=verification_url)
        return app.test_client()

    @patch.dict(os.environ, {"NOVA_ARCHIVE_REWARDS_ENABLED": "true"})
    @patch("archive_completion.requests.post")
    def test_missing_verifier_fails_closed(self, post):
        response = self.client(user={"id": "a"}).post("/api/archive/complete", json=BODY)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json["status"], "closed")
        post.assert_not_called()

    @patch.dict(os.environ, {"NOVA_ARCHIVE_REWARDS_ENABLED": "true"})
    @patch("archive_completion.requests.post")
    def test_rejects_unproven_account(self, post):
        verify = Mock(return_value=False)
        response = self.client(verify, {"id": "b"}).post("/api/archive/complete", json=BODY)
        self.assertEqual(response.status_code, 403)
        verify.assert_called_once_with("b")
        post.assert_not_called()

    @patch.dict(os.environ, {"NOVA_ARCHIVE_REWARDS_ENABLED": "true"})
    @patch("archive_completion.requests.post")
    def test_only_trusted_account_can_reach_rpc(self, post):
        post.return_value.ok = True
        post.return_value.json.return_value = "awarded"
        verify = Mock(return_value=True)
        client = self.client(verify, {"id": "a"})
        response = client.post("/api/archive/complete", json={**BODY, "user_id": "b"})
        self.assertEqual(response.json["status"], "awarded")
        verify.assert_called_once_with("a")
        self.assertEqual(post.call_args.kwargs["json"], {"p_user_id": "a"})

    @patch.dict(os.environ, {"NOVA_ARCHIVE_REWARDS_ENABLED": "true"})
    @patch("archive_completion.requests.post")
    def test_anonymous_rejected(self, post):
        verify = Mock(return_value=True)
        response = self.client(verify, {"id": "a", "is_anonymous": True}).post("/api/archive/complete", json=BODY)
        self.assertEqual(response.status_code, 401)
        verify.assert_not_called()
        post.assert_not_called()

    @patch.dict(os.environ, {"NOVA_ARCHIVE_REWARDS_ENABLED": "true", "NOVA_ARCHIVE_VERIFICATION_ENABLED": "true"})
    @patch("archive_completion.requests.post")
    def test_new_route_only_claims_after_server_verifies(self, post):
        client = self.client(user={"id": "a"}, verification_url="https://example.invalid/verify")
        post.return_value.ok = True
        post.return_value.json.return_value = {"status": "question", "challenge": "fixture", "question": "A question", "step": 1, "total": 4, "answer": "not returned"}
        response = client.post("/api/archive/verification", json={"action":"start", "user_id":"b"})
        self.assertEqual(response.json["status"],"question")
        self.assertNotIn("answer", response.json)
        self.assertEqual(post.call_count,1)
        self.assertEqual(post.call_args.kwargs["json"]["p_user_id"],"a")
        post.reset_mock()
        post.return_value.json.side_effect = [{"status":"verified"}, "awarded", "awarded"]
        response = client.post("/api/archive/verification", json={"action":"answer","challenge":"00000000-0000-4000-8000-000000000001","answer":"fixture"})
        self.assertEqual(response.json["status"],"awarded")
        self.assertEqual(post.call_count,2)
        self.assertEqual(post.call_args.kwargs["json"],{"p_user_id":"a"})

    @patch.dict(os.environ, {"NOVA_ARCHIVE_REWARDS_ENABLED": "true", "NOVA_ARCHIVE_VERIFICATION_ENABLED": "false"})
    @patch("archive_completion.requests.post")
    def test_new_route_disabled_by_default(self, post):
        response = self.client(user={"id":"a"}, verification_url="https://example.invalid/verify").post("/api/archive/verification", json={"action":"start"})
        self.assertEqual(response.json["status"],"closed")
        post.assert_not_called()

if __name__ == "__main__":
    unittest.main()
