"""Local Flask tests: fixed phrases cannot award coins without trusted proof."""
import os
import unittest
from unittest.mock import Mock, patch
from flask import Flask
from archive_completion import register_archive_routes

BODY = {"recovered": "unerased first draft", "prompt": "ask nova what she got wrong"}

class ArchiveCompletionTests(unittest.TestCase):
    def client(self, verifier=None, user=None):
        app = Flask(__name__)
        app.testing = True
        register_archive_routes(app, extract_bearer_token=lambda: "fixture",
            verify_access_token=lambda token: user,
            headers_for_service=lambda headers: headers,
            rpc_url="https://example.invalid/rpc", verify_completion_evidence=verifier)
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

if __name__ == "__main__":
    unittest.main()
