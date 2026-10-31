from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ai_chat.models import Conversation
from financial_accounts.models import FinancialAccount
from financial_accounts.provisioning import seed_default_chart
from transactions.models import LedgerEntry, Transaction

from .models import AppUser
from .testing import FirebaseAuthMixin

ALICE = "alice-uid"
BOB = "bob-uid"


class FirebaseAuthenticationTests(FirebaseAuthMixin, APITestCase):
    url = reverse("transaction-list")

    def test_missing_token_is_rejected(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response["WWW-Authenticate"], "Bearer")

    def test_invalid_token_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_token_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer expired")
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("expired", str(response.data["detail"]))

    def test_malformed_header_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION="Token token:alice-uid")
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(AppUser.objects.exists())

    def test_first_request_registers_user_and_seeds_chart(self):
        self.authenticate(ALICE)

        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["uid"], ALICE)
        self.assertEqual(response.data["email"], f"{ALICE}@example.com")
        self.assertEqual(response.data["sign_in_provider"], "password")
        user = AppUser.objects.get(firebase_uid=ALICE)
        self.assertIsNotNone(user.last_seen_at)

        accounts = FinancialAccount.objects.filter(user_id=ALICE)
        self.assertEqual(accounts.count(), 43)
        self.assertEqual(accounts.filter(can_receive_movement=True).count(), 19)
        leaf = accounts.get(code="110505")
        self.assertEqual(
            [leaf.parent.code, leaf.parent.parent.code, leaf.parent.parent.parent.code],
            ["1105", "11", "1"],
        )

    def test_later_requests_do_not_duplicate_user_or_chart(self):
        self.authenticate(ALICE)
        self.client.get(reverse("me"))
        self.client.get(reverse("me"))

        self.assertEqual(AppUser.objects.count(), 1)
        self.assertEqual(FinancialAccount.objects.filter(user_id=ALICE).count(), 43)

    def test_users_only_see_their_own_data(self):
        self.authenticate(ALICE)
        alice_accounts = {a["id"] for a in self.client.get(reverse("account-list")).data}
        self.authenticate(BOB)
        bob_accounts = {a["id"] for a in self.client.get(reverse("account-list")).data}

        self.assertEqual(len(alice_accounts), 43)
        self.assertEqual(len(bob_accounts), 43)
        self.assertFalse(alice_accounts & bob_accounts)

    def test_cannot_post_to_another_users_account(self):
        self.authenticate(ALICE)
        self.client.get(reverse("me"))
        alice_cash = FinancialAccount.objects.get(user_id=ALICE, code="110505")
        self.authenticate(BOB)
        self.client.get(reverse("me"))
        bob_income = FinancialAccount.objects.get(user_id=BOB, code="413505")

        response = self.client.post(
            self.url,
            {"lines": [
                {"account": str(alice_cash.id), "debit": "10"},
                {"account": str(bob_income.id), "credit": "10"},
            ]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Transaction.objects.exists())


class AccentColorTests(FirebaseAuthMixin, APITestCase):
    url = reverse("me")

    def test_defaults_to_blank(self):
        self.authenticate(ALICE)
        self.assertEqual(self.client.get(self.url).data["accent_color"], "")

    def test_round_trip_is_normalized_to_upper_case(self):
        self.authenticate(ALICE)

        response = self.client.patch(self.url, {"accent_color": "#2f6ea8"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["accent_color"], "#2F6EA8")
        self.assertEqual(self.client.get(self.url).data["accent_color"], "#2F6EA8")

    def test_blank_resets_to_default(self):
        self.authenticate(ALICE)
        self.client.patch(self.url, {"accent_color": "#2F6EA8"}, format="json")

        response = self.client.patch(self.url, {"accent_color": ""}, format="json")

        self.assertEqual(response.data["accent_color"], "")

    def test_invalid_hex_is_rejected(self):
        self.authenticate(ALICE)
        for bad in ["blue", "#12345", "#GGGGGG", "2F6EA8", "#2F6EA8FF"]:
            response = self.client.patch(self.url, {"accent_color": bad}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, bad)

    def test_identity_fields_cannot_be_changed(self):
        self.authenticate(ALICE)

        self.client.patch(self.url, {"email": "evil@example.com", "uid": BOB}, format="json")

        user = AppUser.objects.get(firebase_uid=ALICE)
        self.assertEqual(user.email, f"{ALICE}@example.com")
        self.assertFalse(AppUser.objects.filter(firebase_uid=BOB).exists())

    def test_color_is_per_user(self):
        self.authenticate(ALICE)
        self.client.patch(self.url, {"accent_color": "#2F6EA8"}, format="json")
        self.authenticate(BOB)

        self.assertEqual(self.client.get(self.url).data["accent_color"], "")

    def test_requires_authentication(self):
        response = self.client.patch(self.url, {"accent_color": "#2F6EA8"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SeedDefaultChartTests(TestCase):
    def test_is_idempotent(self):
        self.assertEqual(seed_default_chart(ALICE), 43)
        self.assertEqual(seed_default_chart(ALICE), 0)
        self.assertEqual(FinancialAccount.objects.filter(user_id=ALICE).count(), 43)

    def test_two_users_can_share_codes(self):
        seed_default_chart(ALICE)
        seed_default_chart(BOB)
        self.assertEqual(FinancialAccount.objects.filter(code="110505").count(), 2)


@override_settings(FIREBASE_ADMIN_UIDS=[ALICE])
class AdminFirebaseLoginTests(FirebaseAuthMixin, TestCase):
    url = reverse("admin_firebase_login")

    def login_with(self, token):
        return self.client.post(self.url, {"id_token": token, "next": "/admin/"})

    def test_login_page_renders(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Continue with Google")

    def test_admin_index_redirects_to_firebase_login(self):
        response = self.client.get("/admin/")
        self.assertRedirects(response, f"{self.url}?next=/admin/", fetch_redirect_response=False)

    def test_listed_uid_gets_staff_session_without_password(self):
        response = self.login_with(f"token:{ALICE}")

        self.assertRedirects(response, "/admin/", fetch_redirect_response=False)
        user = get_user_model().objects.get(username=ALICE)
        self.assertTrue(user.is_staff and user.is_superuser)
        self.assertFalse(user.has_usable_password())
        self.assertTrue(user.password.startswith("!"))
        self.verify_mock.assert_called_with(f"token:{ALICE}", check_revoked=True)
        self.assertEqual(self.client.get("/admin/").status_code, 200)

    def test_unlisted_uid_is_rejected(self):
        response = self.login_with(f"token:{BOB}")

        self.assertEqual(response.status_code, 403)
        self.assertContains(response, "not an administrator", status_code=403)
        self.assertFalse(get_user_model().objects.exists())

    def test_invalid_token_is_rejected(self):
        self.assertEqual(self.login_with("garbage").status_code, 403)

    def test_password_login_is_impossible(self):
        User = get_user_model()
        User.objects.create_superuser("legacy", "legacy@example.com", "s3cret-pass")

        self.assertFalse(self.client.login(username="legacy", password="s3cret-pass"))

    def test_unsafe_next_is_ignored(self):
        response = self.client.post(
            self.url, {"id_token": f"token:{ALICE}", "next": "https://evil.example.com/"}
        )
        self.assertRedirects(response, reverse("admin:index"), fetch_redirect_response=False)


class ReassignUserDataTests(TestCase):
    def setUp(self):
        seed_default_chart("demo-user")
        accounts = FinancialAccount.objects.filter(user_id="demo-user")
        entry = Transaction.objects.create(user_id="demo-user", numbering="0001")
        LedgerEntry.objects.create(transaction=entry, account=accounts.get(code="512501"), debit=10)
        LedgerEntry.objects.create(transaction=entry, account=accounts.get(code="210502"), credit=10)
        Conversation.objects.create(user_id="demo-user")

    def reassign(self, *extra):
        out = StringIO()
        call_command("reassign_user_data", "--from", "demo-user", "--to", ALICE, *extra, stdout=out)
        return out.getvalue()

    def test_moves_everything_to_new_owner(self):
        output = self.reassign()

        self.assertIn("43 accounts, 1 transactions, 1 conversations", output)
        self.assertFalse(FinancialAccount.objects.filter(user_id="demo-user").exists())
        self.assertEqual(Transaction.objects.get().user_id, ALICE)
        self.assertEqual(Conversation.objects.get().user_id, ALICE)

    def test_refuses_when_target_has_accounts(self):
        seed_default_chart(ALICE)
        with self.assertRaisesMessage(CommandError, "--replace"):
            self.reassign()

    def test_replace_drops_unused_seeded_chart(self):
        seed_default_chart(ALICE)

        self.reassign("--replace")

        self.assertEqual(FinancialAccount.objects.filter(user_id=ALICE).count(), 43)
        self.assertEqual(Transaction.objects.get().user_id, ALICE)

    def test_replace_refuses_when_target_chart_is_in_use(self):
        seed_default_chart(ALICE)
        accounts = FinancialAccount.objects.filter(user_id=ALICE)
        entry = Transaction.objects.create(user_id=ALICE, numbering="0001")
        LedgerEntry.objects.create(transaction=entry, account=accounts.get(code="512501"), debit=5)
        LedgerEntry.objects.create(transaction=entry, account=accounts.get(code="210502"), credit=5)

        with self.assertRaisesMessage(CommandError, "ledger entries"):
            self.reassign("--replace")
