function PostFooter({ likes, username, caption, comments }) {
  return (
    <div className="px-4 pb-4">
      <p className="font-semibold">{likes} Likes</p>

      <p className="mt-2">
        <span className="font-semibold">{username}</span> {caption}
      </p>

      <p className="mt-2 text-sm text-gray-500">
        {comments} comments
      </p>
    </div>
  );
}

export default PostFooter;