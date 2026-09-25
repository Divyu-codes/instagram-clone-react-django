import { Link } from "react-router-dom";

const BACKEND_HOST = "http://127.0.0.1:8000";

function getMediaUrl(url) {
  if (!url) return "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `${BACKEND_HOST}${url}`;
  return `${BACKEND_HOST}/${url}`;
}

function UserCard({ id, username, image, posts }) {
  return (
    <Link
      to={`/profile/${id ?? ""}`}
      className="flex items-center gap-4 p-4 border rounded-lg bg-white mb-3 hover:bg-gray-50"
    >
      <img
        src={getMediaUrl(image)}
        alt={username}
        className="w-12 h-12 rounded-full object-cover"
      />

      <div>
        <h2 className="font-semibold">
          {username}
        </h2>

        <p className="text-sm text-gray-500">
          {posts ?? 0} Posts
        </p>
      </div>
    </Link>
  );
}

export default UserCard;