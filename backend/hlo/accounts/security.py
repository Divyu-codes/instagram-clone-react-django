import base64
import hashlib
import hmac
import re
import requests
import secrets
import uuid
import struct
import time

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.cache import cache
from django.core.mail import send_mail
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Profile


def verify_totp(secret, code, window=1):
    """Verify an RFC 6238 six-digit code without an extra dependency."""
    if not secret or not str(code).isdigit() or len(str(code)) != 6:
        return False
    try:
        key = base64.b32decode(secret, casefold=True)
    except (ValueError, TypeError):
        return False
    for offset in range(-window, window + 1):
        counter = int(time.time() // 30) + offset
        digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
        position = digest[-1] & 0x0F
        value = (struct.unpack(">I", digest[position:position + 4])[0] & 0x7FFFFFFF) % 1_000_000
        if hmac.compare_digest(f"{value:06d}", str(code)):
            return True
    return False


class EmailOrPhoneModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None

        username = str(username).strip()
        if not username:
            return None

        user_model = get_user_model()
        user = user_model._default_manager.filter(
            Q(username__iexact=username)
            | Q(email__iexact=username)
            | Q(profile__phone_number__iexact=username)
        ).order_by("id").first()

        if user is None or not user.check_password(password) or not self.user_can_authenticate(user):
            return None
        return user


class LoginRateThrottle(SimpleRateThrottle):
    scope = "login"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class TwoFactorTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get(self.username_field)
        password = attrs.get("password")
        user = authenticate(username=username, password=password)
        if not user:
            # Let SimpleJWT return its standard generic invalid-credentials response.
            return super().validate(attrs)

        profile, _ = Profile.objects.get_or_create(user=user)
        if profile.two_factor_enabled:
            code = self.initial_data.get("otp")
            if not code:
                raise AuthenticationFailed("Two-factor authentication code is required.", code="two_factor_required")
            if not verify_totp(profile.two_factor_secret, code):
                raise AuthenticationFailed("Invalid two-factor authentication code.", code="invalid_otp")
        return super().validate(attrs)


class SecureTokenObtainPairView(TokenObtainPairView):
    serializer_class = TwoFactorTokenSerializer
    throttle_classes = [LoginRateThrottle]


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        user = get_user_model().objects.filter(email__iexact=email).first()
        if user and user.has_usable_password():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = PasswordResetTokenGenerator().make_token(user)
            link = f"http://127.0.0.1:5173/reset-password/{uid}/{token}"
            send_mail(
                "Reset your Instagram password",
                f"Use this link to reset your password: {link}",
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@instagram.local"),
                [user.email],
                fail_silently=True,
            )
        return Response({"detail": "If that email exists, a reset link has been sent."})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        phone = request.data.get("phone", "").strip()
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()

        if not username or not password or (not email and not phone):
            return Response({"detail": "Username, password, and either email or phone are required."}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({"detail": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        if email and User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Email already registered."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({"detail": "Username already taken."}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize and validate phone if provided (simple E.164-like check)
        if phone:
            # Normalize: remove non-digit characters, then require exactly 10 digits
            import re as _re
            phone_digits = _re.sub(r"\D", "", phone)
            if len(phone_digits) != 10:
                return Response({"detail": "Phone number must contain exactly 10 digits."}, status=status.HTTP_400_BAD_REQUEST)
            phone = phone_digits
            phone_profile = Profile.objects.filter(phone_number__iexact=phone).first()
            if phone_profile and phone_profile.user != User.objects.filter(username__iexact=username).first():
                return Response({"detail": "Phone number already registered."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(
                username=username,
                email=email or "",
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            profile, _ = Profile.objects.get_or_create(user=user)
            if phone:
                profile.phone_number = phone
                profile.save(update_fields=["phone_number"])
            else:
                profile.save()

            if email:
                profile.email_verification_token = str(uuid.uuid4())
                profile.save(update_fields=["email_verification_token"])
                code = profile.email_verification_token
                send_mail(
                    "Verify your Instagram email",
                    f"Your verification code is: {code}\n\nEnter this code to complete your signup.",
                    getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@instagram.local"),
                    [user.email],
                    fail_silently=False,
                )
                return Response({"detail": "Account created. Verification email sent."}, status=status.HTTP_201_CREATED)

            return Response({"detail": "Account created successfully."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GoogleSignInView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Accept either an OAuth2 ID token (`id_token`) from Google or a demo email/name payload.
        # If `id_token` is provided we verify it via Google's tokeninfo endpoint.
        id_token = request.data.get("id_token")
        email = request.data.get("email", "").strip().lower()
        name = request.data.get("name", "").strip()

        info = None
        if id_token:
            try:
                resp = requests.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token}, timeout=5)
            except requests.RequestException:
                return Response({"detail": "Could not verify token with Google."}, status=status.HTTP_400_BAD_REQUEST)
            if resp.status_code != 200:
                return Response({"detail": "Invalid Google ID token."}, status=status.HTTP_400_BAD_REQUEST)
            info = resp.json()
            email = (info.get("email") or "").strip().lower()
            name = info.get("name") or name
            # Optional audience check
            client_id = getattr(settings, "GOOGLE_CLIENT_ID", None)
            if client_id and info.get("aud") and info.get("aud") != client_id:
                return Response({"detail": "Token audience mismatch."}, status=status.HTTP_400_BAD_REQUEST)

        if not email:
            return Response({"detail": "Google email is required."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            base_username = re.sub(r"[^a-zA-Z0-9_.-]+", "", (name or email.split("@")[0]) or "googleuser") or "googleuser"
            username = base_username
            suffix = 1
            while User.objects.filter(username__iexact=username).exists():
                username = f"{base_username}{suffix}"
                suffix += 1
            user = User.objects.create_user(
                username=username,
                email=email,
                password=secrets.token_urlsafe(18),
                first_name=(name.split()[0] if name else "Google"),
                last_name=(" ".join(name.split()[1:]) if name else "User"),
            )

        profile, _ = Profile.objects.get_or_create(user=user)
        profile.google_account = True
        profile.save(update_fields=["google_account"])

        refresh = RefreshToken.for_user(user)
        return Response({
            "detail": "Google sign-in successful.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email_verified": bool(info and info.get("email_verified")) if info is not None else None,
        })


class ResetPasswordConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, uid, token):
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = get_user_model().objects.get(pk=user_id)
        except (ValueError, TypeError, OverflowError, get_user_model().DoesNotExist):
            return Response({"detail": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)
        password = request.data.get("password", "")
        if len(password) < 8 or not PasswordResetTokenGenerator().check_token(user, token):
            return Response({"detail": "Invalid reset link or password (minimum 8 characters)."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save()
        return Response({"detail": "Password changed. You can now log in."})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password", "")
        new_password = request.data.get("new_password", "")
        if not request.user.check_password(old_password):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({"detail": "New password must contain at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.save()
        return Response({"detail": "Password updated."})


class SendVerificationEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if email:
            request.user.email = email
            request.user.save(update_fields=["email"])
        if not request.user.email:
            return Response({"detail": "Add an email address to this account first."}, status=status.HTTP_400_BAD_REQUEST)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.email_verification_token = str(uuid.uuid4())
        profile.save(update_fields=["email_verification_token"])
        link = f"http://127.0.0.1:5173/verify-email/{profile.email_verification_token}"
        send_mail("Verify your Instagram email", f"Verify your email: {link}", getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@instagram.local"), [request.user.email], fail_silently=True)
        return Response({"detail": "Verification email sent."})


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        code = request.data.get("code", "")
        
        if not email or not code:
            return Response({"detail": "Email and verification code are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_400_BAD_REQUEST)
        
        profile = Profile.objects.filter(user=user).first()

        stored_code = profile.email_verification_token if profile else None
        normalized_stored = str(stored_code).strip() if stored_code is not None else ""
        normalized_input = str(code).strip()

        if not profile or not normalized_stored or normalized_stored.lower() != normalized_input.lower():
            return Response({"detail": "Invalid or expired verification code."}, status=status.HTTP_400_BAD_REQUEST)

        profile.email_verified = True
        profile.email_verification_token = None
        profile.save(update_fields=["email_verified", "email_verification_token"])

        return Response({"detail": "Email verified successfully."})


class TwoFactorSetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        secret = base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")
        profile.two_factor_secret = secret
        profile.two_factor_enabled = False
        profile.save(update_fields=["two_factor_secret", "two_factor_enabled"])
        issuer = "Instagram Clone"
        uri = f"otpauth://totp/{issuer}:{request.user.username}?secret={secret}&issuer={issuer.replace(' ', '%20')}"
        return Response({"secret": secret, "otpauth_uri": uri})


class TwoFactorConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if not verify_totp(profile.two_factor_secret, request.data.get("otp")):
            return Response({"detail": "Invalid authentication code."}, status=status.HTTP_400_BAD_REQUEST)
        profile.two_factor_enabled = True
        profile.save(update_fields=["two_factor_enabled"])
        return Response({"detail": "Two-factor authentication enabled."})


class TwoFactorDisableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if not request.user.check_password(request.data.get("password", "")):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        profile.two_factor_enabled = False
        profile.two_factor_secret = ""
        profile.save(update_fields=["two_factor_enabled", "two_factor_secret"])
        return Response({"detail": "Two-factor authentication disabled."})
