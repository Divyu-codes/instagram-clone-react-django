from django.urls import path

from .views import (
    ProfileListView,
    ProfileDetailView,
    MyProfileView,
    LogoutView,
)

from .security import (
    ForgotPasswordView,
    ResetPasswordConfirmView,
    ChangePasswordView,
    SendVerificationEmailView,
    VerifyEmailView,
    TwoFactorSetupView,
    TwoFactorConfirmView,
    TwoFactorDisableView,
    RegisterView,
    GoogleSignInView,
)


urlpatterns = [

    # My profile
    path(
        "profile/me/",
        MyProfileView.as_view(),
        name="my-profile"
    ),

    # All profiles
    path(
        "",
        ProfileListView.as_view(),
        name="profile-list"
    ),

    # Single profile
    path(
        "<int:pk>/",
        ProfileDetailView.as_view(),
        name="profile-detail"
    ),

    # Authentication
    path(
        "register/",
        RegisterView.as_view()
    ),

    path(
        "google/",
        GoogleSignInView.as_view()
    ),

    path(
        "verify-email/",
        VerifyEmailView.as_view()
    ),

    path(
        "logout/",
        LogoutView.as_view(),
        name="logout"
    ),

    # Password
    path(
        "password/forgot/",
        ForgotPasswordView.as_view()
    ),

    path(
        "password/reset/<uid>/<token>/",
        ResetPasswordConfirmView.as_view()
    ),

    path(
        "password/change/",
        ChangePasswordView.as_view()
    ),

    # Email verification
    path(
        "email/verification/send/",
        SendVerificationEmailView.as_view()
    ),

    # 2FA
    path(
        "2fa/setup/",
        TwoFactorSetupView.as_view()
    ),

    path(
        "2fa/confirm/",
        TwoFactorConfirmView.as_view()
    ),

    path(
        "2fa/disable/",
        TwoFactorDisableView.as_view()
    ),
]