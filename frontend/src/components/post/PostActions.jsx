import { useState } from "react";
import {
  FaHeart,
  FaRegHeart,
  FaRegComment,
} from "react-icons/fa";
import { FiSend } from "react-icons/fi";

function PostActions({ likes }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  function handleLike() {
    if (liked) {
      setLiked(false);
      setLikeCount(likeCount - 1);
    } else {
      setLiked(true);
      setLikeCount(likeCount + 1);
    }
  }

  return (
    <div className="p-4">
      <div className="flex gap-5 text-2xl">
        <button onClick={handleLike}>
          {liked ? (
            <FaHeart className="text-red-500" />
          ) : (
            <FaRegHeart />
          )}
        </button>

        <FaRegComment />
        <FiSend />
      </div>

      <p className="font-semibold mt-3">
        {likeCount} Likes
      </p>
    </div>
  );
}

export default PostActions;