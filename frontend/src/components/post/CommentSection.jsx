import { useEffect, useState } from "react";
import { authenticatedFetch } from "../../utils/auth";

function CommentSection({ postId, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // GET COMMENTS
  // ==========================================

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await authenticatedFetch(
        `http://127.0.0.1:8000/api/comments/${postId}/`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            "Failed to load comments."
        );
      }

      setComments(data);
    } catch (error) {
      console.error("Fetch comments error:", error);
      setError("Unable to load comments.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD COMMENTS WHEN POST LOADS
  // ==========================================

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  // ==========================================
  // ADD COMMENT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await authenticatedFetch(
        `http://127.0.0.1:8000/api/comments/${postId}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: trimmedText,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            "Failed to add comment."
        );
      }

      // New comment ko top par add karo
      setComments((previousComments) => [
        data,
        ...previousComments,
      ]);

      // Input clear
      setText("");

      // Parent PostCard ko batao ki comment add hua
      if (onCommentAdded) {
        onCommentAdded();
      }

    } catch (error) {
      console.error("Add comment error:", error);

      setError(
        error.message || "Unable to add comment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pb-4">

      {/* ================================
          COMMENTS LIST
      ================================= */}

      <div className="mb-4">

        {loading && (
          <p className="text-sm text-gray-500">
            Loading comments...
          </p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-500 mb-2">
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          comments.length === 0 && (
            <p className="text-sm text-gray-500">
              No comments yet.
            </p>
          )}

        {!loading &&
          comments.length > 0 && (
            <div className="space-y-3">

              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="text-sm"
                >
                  <span className="font-semibold mr-2">
                    {comment.username}
                  </span>

                  <span className="text-gray-700">
                    {comment.text}
                  </span>
                </div>
              ))}

            </div>
          )}

      </div>

      {/* ================================
          ADD COMMENT FORM
      ================================= */}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t pt-3"
      >

        <input
          type="text"
          value={text}
          onChange={(event) =>
            setText(event.target.value)
          }
          placeholder="Add a comment..."
          disabled={submitting}
          className="
            flex-1
            rounded-lg
            border
            border-gray-300
            px-3
            py-2
            text-sm
            outline-none
            focus:border-blue-500
            disabled:bg-gray-100
          "
        />

        <button
          type="submit"
          disabled={
            submitting || !text.trim()
          }
          className="
            font-semibold
            text-blue-500
            hover:text-blue-700
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {submitting
            ? "Posting..."
            : "Post"}
        </button>

      </form>

    </div>
  );
}

export default CommentSection;