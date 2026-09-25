const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";


const DEFAULT_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80";


function getMediaUrl(url) {
  if (!url) {
    return DEFAULT_PROFILE_IMAGE;
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${BACKEND_HOST}${url}`;
  }

  return `${BACKEND_HOST}/${url}`;
}


function PostHeader({
  username,
  location,
  time,
  id,
  onDelete,
  deleting = false,
  profileImage,
}) {

  const imageUrl =
    getMediaUrl(profileImage);


  return (
    <div className="flex items-center justify-between p-4">

      {/* ================= USER INFO ================= */}

      <div className="flex min-w-0 items-center gap-3">

        <img
          src={imageUrl}
          alt={`${username}'s profile`}
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-gray-200"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src =
              DEFAULT_PROFILE_IMAGE;
          }}
        />


        <div className="min-w-0">

          <h3 className="truncate font-semibold text-gray-900">
            {username}
          </h3>


          {location && (
            <p className="truncate text-xs text-gray-500">
              {location}
            </p>
          )}


          {time && (
            <p className="text-xs text-gray-400">
              {time}
            </p>
          )}

        </div>

      </div>


      {/* ================= DELETE BUTTON ================= */}

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(id)}
          disabled={deleting}
          aria-label="Delete post"
          className="ml-3 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting
            ? "Deleting..."
            : "Delete"}
        </button>
      )}

    </div>
  );
}


export default PostHeader;

