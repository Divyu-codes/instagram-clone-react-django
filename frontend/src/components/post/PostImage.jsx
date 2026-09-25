const BACKEND_HOST = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

function getMediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BACKEND_HOST}${url}`;
  return `${BACKEND_HOST}/${url}`;
}

function PostImage({ image }) {
  return (
    <img
      src={getMediaUrl(image)}
      alt="post"
      className="h-96 w-full object-cover"
    />
  );
}

export default PostImage;