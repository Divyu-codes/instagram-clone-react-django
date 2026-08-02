import {
  FaHeart,
  FaRegComment,
} from "react-icons/fa";

import { FiSend } from "react-icons/fi";

function PostActions() {
  return (
    <div className="flex gap-5 text-2xl p-4">

      <FaHeart />

      <FaRegComment />

      <FiSend />

    </div>
  );
}

export default PostActions;