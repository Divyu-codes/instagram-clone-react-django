from urllib.parse import parse_qs

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware


User = get_user_model()


@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):

    async def __call__(self, scope, receive, send):
        scope = dict(scope)

        token = None
        refresh_token = None

        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)

        if "token" in query_params:
            token = query_params["token"][0]
        if "refresh" in query_params:
            refresh_token = query_params["refresh"][0]

        if not token:
            headers = dict(scope.get("headers", []))
            authorization = headers.get(b"authorization")
            if authorization:
                authorization = authorization.decode()
                if authorization.startswith("Bearer "):
                    token = authorization.split(" ", 1)[1]

        if token:
            try:
                access_token = AccessToken(token)
                user_id = access_token.get("user_id")
                scope["user"] = await get_user(user_id) if user_id else AnonymousUser()
            except (TokenError, InvalidToken, TypeError, ValueError) as error:
                print("JWT authentication error:", error)
                if refresh_token:
                    try:
                        refreshed = RefreshToken(refresh_token)
                        access_token = refreshed.access_token
                        scope["user"] = await get_user(access_token.get("user_id"))
                    except Exception:
                        scope["user"] = AnonymousUser()
                else:
                    scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
