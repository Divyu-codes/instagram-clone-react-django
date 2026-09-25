const API_URL = "http://127.0.0.1:8000";

let refreshRequest = null;

function tokenExpired(token) {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    return !exp || exp * 1000 <= Date.now() + 10_000;
  } catch {
    return true;
  }
}


// =====================================================
// GET CURRENT LOGGED-IN USER ID
// =====================================================

export function getCurrentUserId() {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      return null;
    }

    const payload = JSON.parse(
      atob(token.split(".")[1])
    );

    const userId =
      payload.user_id ??
      payload.userId ??
      payload.sub;

    if (userId === undefined || userId === null) {
      return null;
    }

    return Number(userId);
  } catch (error) {
    console.error(
      "Unable to get current user ID:",
      error
    );

    return null;
  }
}


// =====================================================
// REFRESH ACCESS TOKEN
// =====================================================

export async function refreshAccessToken() {
  if (refreshRequest) return refreshRequest;

  const refresh =
    localStorage.getItem("refresh_token");

  if (!refresh) return null;

  refreshRequest = fetch(
    `${API_URL}/api/token/refresh/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh,
      }),
    }
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Session expired");
      }

      const tokens =
        await response.json();

      localStorage.setItem(
        "access_token",
        tokens.access
      );

      if (tokens.refresh) {
        localStorage.setItem(
          "refresh_token",
          tokens.refresh
        );
      }

      return tokens.access;
    })
    .catch(() => {
      clearSession();
      return null;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}


// =====================================================
// GET VALID ACCESS TOKEN
// =====================================================

export async function getValidAccessToken() {
  const access =
    localStorage.getItem("access_token");

  if (
    access &&
    !tokenExpired(access)
  ) {
    return access;
  }

  return refreshAccessToken();
}


// =====================================================
// AUTHENTICATED FETCH
// =====================================================

export async function authenticatedFetch(
  url,
  options = {}
) {
  const access =
    await getValidAccessToken();

  if (!access) {
    throw new Error(
      "Authentication required"
    );
  }

  const request = (token) =>
    fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

  let response =
    await request(access);

  if (response.status === 401) {
    const refreshedAccess =
      await refreshAccessToken();

    if (!refreshedAccess) {
      return response;
    }

    response =
      await request(refreshedAccess);
  }

  return response;
}


// =====================================================
// CLEAR SESSION
// =====================================================

export function clearSession() {
  [
    "access_token",
    "refresh_token",
    "logged_in_username",
    "unread_message_count",
    "unread_messages_by_sender",
  ].forEach((key) =>
    localStorage.removeItem(key)
  );
}


// =====================================================
// LOGOUT
// =====================================================

export async function logout() {
  const refresh =
    localStorage.getItem("refresh_token");

  const access =
    await getValidAccessToken();

  try {
    if (refresh && access) {
      await fetch(
        `${API_URL}/api/users/logout/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({
            refresh,
          }),
        }
      );
    }
  } finally {
    clearSession();
  }
}