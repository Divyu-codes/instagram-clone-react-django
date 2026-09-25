from urllib.parse import parse_qs

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.tokens import AccessToken

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

        # Copy scope
        scope = dict(scope)

        token = None

        # =========================
        # GET TOKEN FROM URL
        # =========================

        query_string = scope.get(
            "query_string",
            b""
        ).decode()

        query_params = parse_qs(query_string)

        if "token" in query_params:
            token = query_params["token"][0]

        # =========================
        # GET TOKEN FROM HEADER
        # =========================

        if not token:

            headers = dict(scope.get("headers", []))

            authorization = headers.get(
                b"authorization"
            )

            if authorization:

                authorization = authorization.decode()

                if authorization.startswith("Bearer "):

                    token = authorization.split(
                        " ",
                        1
                    )[1]

        # =========================
        # AUTHENTICATE USER
        # =========================

        if token:

            try:

                access_token = AccessToken(token)

                user_id = access_token.get(
                    "user_id"
                )

                if user_id:

                    scope["user"] = await get_user(
                        user_id
                    )

                else:

                    scope["user"] = AnonymousUser()

            except Exception as error:

                print(
                    "JWT authentication error:",
                    error
                )

                scope["user"] = AnonymousUser()

        else:

            scope["user"] = AnonymousUser()

        # =========================
        # CONTINUE TO CONSUMER
        # =========================

        return await super().__call__(
            scope,
            receive,
            send
        )