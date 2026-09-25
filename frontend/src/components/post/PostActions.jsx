import { useState } from "react";
import { FaHeart, FaRegHeart, FaRegComment } from "react-icons/fa";
import { FiSend } from "react-icons/fi";
import { authenticatedFetch } from "../../utils/auth";

function PostActions({ postId, likes, onCommentToggle, onShare }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes || 0);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading || !postId) return;

    try {
      setLoading(true);
      const response = await authenticatedFetch(`http://127.0.0.1:8000/api/likes/${postId}/`, {
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Failed to update like.");
      }

      setLiked(Boolean(data.liked));
      setLikeCount(Number(data.likes_count || 0));
    } catch (error) {
      console.error("Like error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-5 text-2xl">
        <button
          type="button"
          onClick={handleLike}
          disabled={loading}
          className="disabled:opacity-50"
          aria-label={liked ? "Unlike post" : "Like post"}
        >
          {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
        </button>

        <button type="button" aria-label="Comment" onClick={onCommentToggle}>
          <FaRegComment />
        </button>

        <button type="button" aria-label="Share" onClick={onShare}>
          <FiSend />
        </button>
      </div>

      <p className="mt-3 font-semibold">{likeCount} Likes</p>
    </div>
  );
}

export default PostActions;