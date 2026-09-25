import uuid
from io import BytesIO

from PIL import Image
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient


class AuthLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="alice",
            email="alice@example.com",
            password="strongpass123",
        )
        # ensure profile exists and set phone
        from .models import Profile

        profile, _ = Profile.objects.get_or_create(user=self.user)
        profile.phone_number = "+1234567890"
        profile.save(update_fields=["phone_number"])

    def test_login_accepts_email_identifier(self):
        response = self.client.post("/api/token/", {"username": "alice@example.com", "password": "strongpass123"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_login_accepts_phone_identifier(self):
        response = self.client.post("/api/token/", {"username": "+1234567890", "password": "strongpass123"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_google_login_creates_session(self):
        response = self.client.post(
            "/api/users/google/",
            {"email": "google.user@example.com", "name": "Google User"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_email_verification_accepts_generated_uuid_token(self):
        from .models import Profile

        user = get_user_model().objects.create_user(
            username="verify-user",
            email="verify-user@example.com",
            password="strongpass123",
        )
        profile, _ = Profile.objects.get_or_create(user=user)
        token = str(uuid.uuid4())
        profile.email_verification_token = token
        profile.save(update_fields=["email_verification_token"])

        response = self.client.post(
            "/api/users/verify-email/",
            {"email": user.email, "code": token},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Email verified successfully.")

    def test_profile_accepts_uploaded_image_and_exposes_it_everywhere(self):
        self.client.force_authenticate(user=self.user)

        image = BytesIO()
        Image.new("RGB", (100, 100), color="blue").save(image, format="PNG")
        image.seek(0)

        response = self.client.patch(
            "/api/users/profile/me/",
            {"profile_image": SimpleUploadedFile("avatar.png", image.read(), content_type="image/png")},
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["profile_image"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.profile.profile_image)
