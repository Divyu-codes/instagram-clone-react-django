import { useState } from "react";

import PostActions from "./PostActions";
import PostFooter from "./PostFooter";
import PostHeader from "./PostHeader";
import PostImage from "./PostImage";
import CommentSection from "./CommentSection";

import { authenticatedFetch } from "../../utils/auth";

const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";

function getCurrentUserId() {
  try {
    /*
     * Try stored user information first.
     */
    const storedUser =
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser");

    if (storedUser) {
      const user = JSON.parse(storedUser);

      const userId =
        user?.user_id ||
        user?.id ||
        user?.user?.id;

      if (userId !== undefined && userId !== null) {
        return Number(userId);
      }
    }

    /*
     * Fallback:
     * Try JWT access token.
     */
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token");

    if (!token) {
      return null;
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      atob(
        parts[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    );

    return Number(
      payload?.user_id ||
        payload?.userId ||
        payload?.id ||
        payload?.sub
    );
  } catch (error) {
    console.error(
      "Unable to get current user ID:",
      error
    );

    return null;
  }
}

function PostCard({
  post,
  onPostDeleted,
}) {
  const postId = post?.id;

  const username =
    post?.username ||
    post?.user?.username ||
    "user";

  const location =
    post?.location ||
    "";

  const image =
    post?.image ||
    "";

  const profileImage =
    post?.profile_image ||
    post?.user_profile_image ||
    post?.user?.profile_image ||
    "";

  const likes = Number(
    post?.likes ||
      post?.likes_count ||
      0
  );

  const caption =
    post?.caption ||
    "";

  const comments = Number(
    post?.comments ||
      post?.comments_count ||
      0
  );

  const createdAt =
    post?.created_at;

  /*
   * Current logged-in user
   */
  const currentUserId =
    getCurrentUserId();

  /*
   * Post owner
   */
  const postOwnerId = Number(
    post?.user_id ??
      post?.user?.id ??
      post?.user
  );

  /*
   * Delete button should appear ONLY
   * when current user owns this post.
   */
  const isOwnPost =
    currentUserId !== null &&
    Number.isFinite(currentUserId) &&
    Number.isFinite(postOwnerId) &&
    currentUserId === postOwnerId;

  const [
    commentCount,
    setCommentCount,
  ] = useState(comments);

  const [
    showComments,
    setShowComments,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    sharing,
    setSharing,
  ] = useState(false);

  /*
   * Comment added
   */
  const handleCommentAdded = () => {
    setCommentCount(
      (previousCount) =>
        previousCount + 1
    );

    setShowComments(true);
  };

  /*
   * Delete own post
   */
  const handleDelete = async () => {
    if (!postId || deleting) {
      return;
    }

    if (!isOwnPost) {
      alert(
        "You can only delete your own posts."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this post?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/posts/${postId}/`,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {
        let errorMessage =
          "Failed to delete post.";

        try {
          const data =
            await response.json();

          errorMessage =
            data?.detail ||
            data?.error ||
            errorMessage;
        } catch {
          // Empty response
        }

        throw new Error(
          errorMessage
        );
      }

      /*
       * Tell Home.jsx to remove
       * the deleted post immediately.
       */
      if (onPostDeleted) {
        onPostDeleted(postId);
      }
    } catch (error) {
      console.error(
        "Delete post error:",
        error
      );

      alert(
        error?.message ||
          "Unable to delete post."
      );
    } finally {
      setDeleting(false);
    }
  };

  /*
   * ==================================================
   * SHARE POST
   * ==================================================
   *
   * IMPORTANT:
   * Pehle profile URL share ho raha tha:
   *
   * /profile/${userId}
   *
   * Ab actual POST URL share hoga:
   *
   * /post/${postId}
   *
   */
  const handleShare = async () => {
    if (!postId || sharing) {
      return;
    }

    try {
      setSharing(true);

      /*
       * Actual post URL.
       *
       * Agar tumhare frontend mein /post/:id route
       * bana hua hai, ye directly post open karega.
       */
      const shareUrl =
        `${window.location.origin}/post/${postId}`;

      const shareText =
        `Check out ${username}'s post on Insta Clone`;

      /*
       * ----------------------------------------------
       * Native Web Share
       * ----------------------------------------------
       *
       * Mobile browsers / supported browsers mein
       * WhatsApp, Instagram, Messages etc. ke
       * share options open ho sakte hain.
       */
      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: "Insta Clone",
          text: shareText,
          url: shareUrl,
        });

        return;
      }

      /*
       * ----------------------------------------------
       * Clipboard
       * ----------------------------------------------
       */
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          "function"
      ) {
        await navigator.clipboard.writeText(
          shareUrl
        );

        alert("Post link copied!");

        return;
      }

      /*
       * ----------------------------------------------
       * Older browser fallback
       * ----------------------------------------------
       */
      const temporaryInput =
        document.createElement("textarea");

      temporaryInput.value =
        shareUrl;

      temporaryInput.style.position =
        "fixed";

      temporaryInput.style.left =
        "-9999px";

      temporaryInput.style.top =
        "0";

      document.body.appendChild(
        temporaryInput
      );

      temporaryInput.focus();
      temporaryInput.select();

      const copied =
        document.execCommand("copy");

      document.body.removeChild(
        temporaryInput
      );

      if (copied) {
        alert("Post link copied!");
      } else {
        alert(
          `Copy this post link:\n${shareUrl}`
        );
      }
    } catch (error) {
      /*
       * User may close the native share dialog.
       * Is case mein error show karne ki zarurat nahi.
       */
      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }

      console.error(
        "Share error:",
        error
      );

      /*
       * Last fallback:
       * At least user ko URL dikha do.
       */
      const fallbackUrl =
        `${window.location.origin}/post/${postId}`;

      alert(
        `Unable to open share menu.\n\nPost link:\n${fallbackUrl}`
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <article className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

      {/* ================= POST HEADER ================= */}

      <PostHeader
        username={username}
        location={location}
        id={postId}
        time={createdAt}
        profileImage={profileImage}
        onDelete={
          isOwnPost
            ? handleDelete
            : null
        }
        deleting={deleting}
      />

      {/* ================= POST IMAGE ================= */}

      <PostImage
        image={image}
      />

      {/* ================= ACTIONS ================= */}

      <PostActions
        postId={postId}
        likes={likes}

        onCommentToggle={() =>
          setShowComments(
            (current) => !current
          )
        }

        onShare={handleShare}

        /*
         * Agar PostActions component
         * sharing prop accept karta hai,
         * to button disabled/loading state
         * bhi use kar sakta hai.
         */
        sharing={sharing}
      />

      {/* ================= FOOTER ================= */}

      <PostFooter
        username={username}
        likes={likes}
        caption={caption}
        comments={commentCount}
      />

      {/* ================= COMMENTS ================= */}

      {showComments && (
        <CommentSection
          postId={postId}
          onCommentAdded={
            handleCommentAdded
          }
        />
      )}

    </article>
  );
}

export default PostCard;