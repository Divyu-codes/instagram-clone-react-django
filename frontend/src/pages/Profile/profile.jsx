import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { authenticatedFetch } from "../../utils/auth";

const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";

// ==================================================
// MEDIA URL
// ==================================================

const getMediaUrl = (url) => {
  if (!url) {
    return null;
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return `${BACKEND_HOST}${url.startsWith("/") ? "" : "/"}${url}`;
};

// ==================================================
// PROFILE COMPONENT
// ==================================================

const Profile = () => {
  const { id } = useParams();

  const isOwnProfile = !id;

  // ==================================================
  // PROFILE STATE
  // ==================================================

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);

  // ==================================================
  // FOLLOW STATE
  // ==================================================

  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestPending, setFollowRequestPending] =
    useState(false);

  const [followers, setFollowers] = useState(0);

  // ==================================================
  // SELECTED POST / LIKE STATE
  // ==================================================

  const [selectedPost, setSelectedPost] = useState(null);

  const [likeCount, setLikeCount] = useState(0);

  const [isLiked, setIsLiked] = useState(false);

  // ==================================================
  // COMMENT STATE
  // ==================================================

  const [comment, setComment] = useState("");

  const [commentList, setCommentList] = useState([]);

  const [commentsLoading, setCommentsLoading] =
    useState(false);

  const [commentSubmitting, setCommentSubmitting] =
    useState(false);

  const [commentError, setCommentError] = useState("");

  // ==================================================
  // EDIT PROFILE STATE
  // ==================================================

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [profileMessage, setProfileMessage] =
    useState("");

  const [selectedProfileImage, setSelectedProfileImage] =
    useState(null);

  const [profilePreview, setProfilePreview] =
    useState(null);

  const [editProfile, setEditProfile] = useState({
    bio: "",
    profile_image: "",
    is_private: false,
  });

  // ==================================================
  // FOLLOW REQUEST STATE
  // ==================================================

  const [followRequests, setFollowRequests] =
    useState([]);

  const [requestsLoading, setRequestsLoading] =
    useState(false);

  const [requestActionLoading, setRequestActionLoading] =
    useState(null);

  // ==================================================
  // FOLLOWERS / FOLLOWING MODAL STATE
  // ==================================================

  const [showFollowersModal, setShowFollowersModal] =
    useState(false);

  const [showFollowingModal, setShowFollowingModal] =
    useState(false);

  const [followersList, setFollowersList] =
    useState([]);

  const [followingList, setFollowingList] =
    useState([]);

  const [followersLoading, setFollowersLoading] =
    useState(false);

  const [followingLoading, setFollowingLoading] =
    useState(false);

  // ==================================================
  // LOAD PROFILE
  // ==================================================

  const loadProfile = async () => {
    try {
      setLoading(true);

      const profileUrl = isOwnProfile
        ? `${BACKEND_HOST}/api/users/profile/me/`
        : `${BACKEND_HOST}/api/users/${id}/`;

      const profileResponse =
        await authenticatedFetch(profileUrl);

      if (!profileResponse.ok) {
        throw new Error("Failed to load profile");
      }

      const profileData =
        await profileResponse.json();

      setUser(profileData);

      setFollowers(
        Number(profileData.followers_count || 0)
      );

      setIsFollowing(
        Boolean(profileData.is_following)
      );

      setFollowRequestPending(
        Boolean(profileData.follow_request_pending)
      );

      setEditProfile({
        bio: profileData.bio || "",
        profile_image:
          profileData.profile_image || "",
        is_private:
          Boolean(profileData.is_private),
      });

      // ==================================================
      // LOAD POSTS
      // ==================================================

      const postsResponse =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/posts/`
        );

      if (postsResponse.ok) {
        const postsData =
          await postsResponse.json();

        const postsArray =
          Array.isArray(postsData)
            ? postsData
            : postsData.results || [];

        const profileUserId =
          profileData.user_id ||
          profileData.id;

        const userPosts =
          postsArray.filter((post) => {
            const postUserId =
              typeof post.user === "object"
                ? post.user?.id
                : post.user;

            return (
              Number(postUserId) ===
              Number(profileUserId)
            );
          });

        setPosts(userPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error(
        "Profile loading error:",
        error
      );

      setUser(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // LOAD FOLLOW REQUESTS
  // ==================================================

  const loadFollowRequests = async () => {
    if (!isOwnProfile) {
      return;
    }

    try {
      setRequestsLoading(true);

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/follows/requests/`
        );

      if (!response.ok) {
        setFollowRequests([]);
        return;
      }

      const data =
        await response.json();

      setFollowRequests(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Follow requests error:",
        error
      );

      setFollowRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  // ==================================================
  // LOAD FOLLOWERS
  // ==================================================

  const loadFollowers = async () => {
    if (!user) {
      return;
    }

    try {
      setFollowersLoading(true);

      const userId =
        user.user_id || user.id;

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/follows/${userId}/followers/`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to load followers"
        );
      }

      const data =
        await response.json();

      setFollowersList(
        Array.isArray(data) ? data : []
      );

      setShowFollowersModal(true);
    } catch (error) {
      console.error(
        "Followers loading error:",
        error
      );

      setFollowersList([]);
      setShowFollowersModal(true);
    } finally {
      setFollowersLoading(false);
    }
  };

  // ==================================================
  // LOAD FOLLOWING
  // ==================================================

  const loadFollowing = async () => {
    if (!user) {
      return;
    }

    try {
      setFollowingLoading(true);

      const userId =
        user.user_id || user.id;

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/follows/${userId}/following/`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to load following"
        );
      }

      const data =
        await response.json();

      setFollowingList(
        Array.isArray(data) ? data : []
      );

      setShowFollowingModal(true);
    } catch (error) {
      console.error(
        "Following loading error:",
        error
      );

      setFollowingList([]);
      setShowFollowingModal(true);
    } finally {
      setFollowingLoading(false);
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadProfile();
    loadFollowRequests();
  }, [id]);

  // ==================================================
  // FOLLOW / UNFOLLOW
  // ==================================================

  const handleFollow = async () => {
    if (!user) {
      return;
    }

    try {
      const userId =
        user.user_id || user.id;

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/follows/${userId}/`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.detail ||
            "Something went wrong."
        );

        return;
      }

      setIsFollowing(
        Boolean(data.following)
      );

      setFollowRequestPending(
        Boolean(data.requested)
      );

      if (
        typeof data.followers_count ===
        "number"
      ) {
        setFollowers(
          data.followers_count
        );
      }

      await loadProfile();
    } catch (error) {
      console.error(
        "Follow error:",
        error
      );

      alert(
        "Unable to update follow status."
      );
    }
  };

  // ==================================================
  // ACCEPT FOLLOW REQUEST
  // ==================================================

  const handleAcceptRequest = async (
    requestId
  ) => {
    try {
      setRequestActionLoading(
        requestId
      );

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/follows/requests/${requestId}/accept/`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.detail ||
            "Unable to accept request."
        );

        return;
      }

      if (
        typeof data.followers_count ===
        "number"
      ) {
        setFollowers(
          data.followers_count
        );
      }

      setFollowRequests(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== requestId
          )
      );

      await loadProfile();
    } catch (error) {
      console.error(
        "Accept request error:",
        error
      );
    } finally {
      setRequestActionLoading(null);
    }
  };

  // ==================================================
  // REJECT FOLLOW REQUEST
  // ==================================================

  const handleRejectRequest = async (
    requestId
  ) => {
    try {
      setRequestActionLoading(
        requestId
      );

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/follows/requests/${requestId}/reject/`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.detail ||
            "Unable to reject request."
        );

        return;
      }

      setFollowRequests(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== requestId
          )
      );
    } catch (error) {
      console.error(
        "Reject request error:",
        error
      );
    } finally {
      setRequestActionLoading(null);
    }
  };

  // ==================================================
  // PROFILE IMAGE SELECTION
  // ==================================================

  const handleProfileImageChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedProfileImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setProfilePreview(
      previewUrl
    );
  };

  // ==================================================
  // SAVE PROFILE
  // ==================================================

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setProfileMessage("");

      const formData =
        new FormData();

      formData.append(
        "bio",
        editProfile.bio || ""
      );

      formData.append(
        "is_private",
        editProfile.is_private
          ? "true"
          : "false"
      );

      if (selectedProfileImage) {
        formData.append(
          "profile_image",
          selectedProfileImage
        );
      }

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/users/profile/me/`,
          {
            method: "PATCH",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to update profile."
        );
      }

      setUser(data);

      setFollowers(
        data.followers_count || 0
      );

      setEditProfile({
        bio: data.bio || "",
        profile_image:
          data.profile_image || "",
        is_private:
          Boolean(data.is_private),
      });

      setSelectedProfileImage(null);
      setProfilePreview(null);

      setProfileMessage(
        "Profile updated successfully."
      );

      setTimeout(() => {
        setShowEditModal(false);
        setProfileMessage("");
      }, 800);
    } catch (error) {
      console.error(
        "Save profile error:",
        error
      );

      setProfileMessage(
        error.message ||
          "Unable to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // ==================================================
  // GET LIKE STATUS
  // ==================================================

  const loadLikeStatus = async (
    postId
  ) => {
    if (!postId) {
      return;
    }

    try {
      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/likes/${postId}/`
        );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "Like status error:",
          data
        );

        return;
      }

      const actualLikeCount =
        Number(
          data.likes_count || 0
        );

      setIsLiked(
        Boolean(data.liked)
      );

      setLikeCount(
        actualLikeCount
      );

      // Update selected post
      setSelectedPost(
        (previousPost) => {
          if (!previousPost) {
            return previousPost;
          }

          return {
            ...previousPost,
            likes:
              actualLikeCount,
          };
        }
      );

      // Update posts grid
      setPosts(
        (previousPosts) =>
          previousPosts.map(
            (post) =>
              Number(post.id) ===
              Number(postId)
                ? {
                    ...post,
                    likes:
                      actualLikeCount,
                  }
                : post
          )
      );
    } catch (error) {
      console.error(
        "Load like status error:",
        error
      );
    }
  };

  // ==================================================
  // LIKE / UNLIKE
  // ==================================================

  const handleLike = async () => {
    if (!selectedPost?.id) {
      return;
    }

    try {
      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/likes/${selectedPost.id}/`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.error ||
            "Unable to like post."
        );
      }

      const actualLikeCount =
        Number(
          data.likes_count || 0
        );

      // Backend ka actual liked status
      setIsLiked(
        Boolean(data.liked)
      );

      // Backend ka actual count
      setLikeCount(
        actualLikeCount
      );

      // Update selected post
      setSelectedPost(
        (previousPost) => {
          if (!previousPost) {
            return previousPost;
          }

          return {
            ...previousPost,
            likes:
              actualLikeCount,
          };
        }
      );

      // Update posts grid
      setPosts(
        (previousPosts) =>
          previousPosts.map(
            (post) =>
              Number(post.id) ===
              Number(selectedPost.id)
                ? {
                    ...post,
                    likes:
                      actualLikeCount,
                  }
                : post
          )
      );
    } catch (error) {
      console.error(
        "Like/unlike error:",
        error
      );

      alert(
        error.message ||
          "Unable to like post."
      );
    }
  };

  // ==================================================
  // LOAD COMMENTS
  // ==================================================

  const loadComments = async (
    postId
  ) => {
    try {
      setCommentsLoading(true);
      setCommentError("");

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/comments/${postId}/`
        );

      if (!response.ok) {
        throw new Error(
          "Unable to load comments."
        );
      }

      const data =
        await response.json();

      setCommentList(
        Array.isArray(data)
          ? data
          : data.results || []
      );
    } catch (error) {
      console.error(
        "Comments error:",
        error
      );

      setCommentList([]);

      setCommentError(
        "Unable to load comments."
      );
    } finally {
      setCommentsLoading(false);
    }
  };

  // ==================================================
  // OPEN POST
  // ==================================================

  const handleOpenPost = async (
    post
  ) => {
    setSelectedPost(post);

    /*
     * Initially show whatever count came
     * from the post API.
     *
     * Then loadLikeStatus() will fetch the
     * REAL count from Like table.
     */

    setLikeCount(
      Number(
        post.likes ||
          post.likes_count ||
          post.like_count ||
          0
      )
    );

    setIsLiked(
      Boolean(post.is_liked)
    );

    setComment("");
    setCommentError("");
    setCommentList([]);

    // Load real like count/status
    await loadLikeStatus(
      post.id
    );

    // Load comments
    await loadComments(
      post.id
    );
  };

  // ==================================================
  // ADD COMMENT
  // ==================================================

  const handleAddComment = async () => {
    if (
      !selectedPost ||
      !comment.trim()
    ) {
      return;
    }

    try {
      setCommentSubmitting(true);
      setCommentError("");

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/comments/${selectedPost.id}/`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              text: comment.trim(),
              content: comment.trim(),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to add comment."
        );
      }

      setComment("");

      await loadComments(
        selectedPost.id
      );
    } catch (error) {
      console.error(
        "Comment submit error:",
        error
      );

      setCommentError(
        error.message ||
          "Unable to add comment."
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ==================================================
  // GET POST MEDIA
  // ==================================================

  const getPostMedia = (
    post
  ) => {
    return getMediaUrl(
      post.image ||
        post.media ||
        post.image_url ||
        post.file ||
        null
    );
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          Loading profile...
        </p>
      </div>
    );
  }

  // ==================================================
  // PROFILE NOT FOUND
  // ==================================================

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">
          Profile not found.
        </p>
      </div>
    );
  }

  // ==================================================
  // PROFILE DATA
  // ==================================================

  const profileImage =
    getMediaUrl(
      user.profile_image
    );

  const postCount =
    typeof user.posts_count ===
    "number"
      ? user.posts_count
      : posts.length;

  const followingCount =
    Number(
      user.following_count || 0
    );

  const privateLocked =
    !isOwnProfile &&
    user.is_private &&
    !user.can_view_posts;

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">

        {/* ==================================================
            PROFILE HEADER
        ================================================== */}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          <div className="flex flex-col md:flex-row gap-6">

            {/* PROFILE IMAGE */}

            <div className="flex justify-center md:justify-start">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-200 flex items-center justify-center">

                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl text-gray-500">
                    👤
                  </span>
                )}

              </div>
            </div>

            {/* PROFILE INFO */}

            <div className="flex-1">

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                <div className="flex items-center gap-2">

                  <h1 className="text-2xl font-semibold">
                    {user.username}
                  </h1>

                  {user.is_private && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                      Private
                    </span>
                  )}

                </div>

                {/* PROFILE BUTTON */}

                {isOwnProfile ? (
                  <button
                    onClick={() =>
                      setShowEditModal(true)
                    }
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                  >
                    Edit profile
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={`px-5 py-2 rounded-lg font-medium ${
                      isFollowing
                        ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                        : followRequestPending
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {isFollowing
                      ? "Following"
                      : followRequestPending
                      ? "Requested"
                      : "Follow"}
                  </button>
                )}

              </div>

              {/* BIO */}

              <div className="mt-4">

                {user.bio ? (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {user.bio}
                  </p>
                ) : (
                  <p className="text-gray-400">
                    No bio yet.
                  </p>
                )}

              </div>

              {/* STATS */}

              <div className="flex gap-8 mt-6">

                {/* POSTS */}

                <div className="text-center">
                  <div className="font-bold text-lg">
                    {postCount}
                  </div>

                  <div className="text-sm text-gray-500">
                    Posts
                  </div>
                </div>

                {/* FOLLOWERS */}

                <button
                  type="button"
                  onClick={loadFollowers}
                  className="text-center hover:opacity-70"
                >
                  <div className="font-bold text-lg">
                    {followers}
                  </div>

                  <div className="text-sm text-gray-500">
                    Followers
                  </div>
                </button>

                {/* FOLLOWING */}

                <button
                  type="button"
                  onClick={loadFollowing}
                  className="text-center hover:opacity-70"
                >
                  <div className="font-bold text-lg">
                    {followingCount}
                  </div>

                  <div className="text-sm text-gray-500">
                    Following
                  </div>
                </button>

              </div>

            </div>
          </div>
        </div>

        {/* ==================================================
            FOLLOW REQUESTS
        ================================================== */}

        {isOwnProfile &&
          followRequests.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">

              <h2 className="text-lg font-semibold mb-4">
                Follow Requests
              </h2>

              {requestsLoading ? (
                <p className="text-gray-500">
                  Loading requests...
                </p>
              ) : (
                <div className="space-y-3">

                  {followRequests.map(
                    (request) => {
                      const image =
                        getMediaUrl(
                          request.profile_image
                        );

                      return (
                        <div
                          key={
                            request.id
                          }
                          className="flex items-center justify-between gap-3"
                        >

                          <div className="flex items-center gap-3">

                            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">

                              {image ? (
                                <img
                                  src={image}
                                  alt={
                                    request.username
                                  }
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>
                                  👤
                                </span>
                              )}

                            </div>

                            <div>

                              <p className="font-medium">
                                {
                                  request.username
                                }
                              </p>

                              <p className="text-sm text-gray-500">
                                wants to follow you
                              </p>

                            </div>

                          </div>

                          <div className="flex gap-2">

                            <button
                              onClick={() =>
                                handleAcceptRequest(
                                  request.id
                                )
                              }
                              disabled={
                                requestActionLoading ===
                                request.id
                              }
                              className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                            >
                              Accept
                            </button>

                            <button
                              onClick={() =>
                                handleRejectRequest(
                                  request.id
                                )
                              }
                              disabled={
                                requestActionLoading ===
                                request.id
                              }
                              className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                            >
                              Reject
                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>
          )}

        {/* ==================================================
            PRIVATE ACCOUNT LOCK
        ================================================== */}

        {privateLocked ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">

            <div className="text-5xl mb-4">
              🔒
            </div>

            <h2 className="text-xl font-semibold mb-2">
              This Account is Private
            </h2>

            <p className="text-gray-500">
              Follow this account to see their photos and videos.
            </p>

          </div>
        ) : (
          <>
            {/* ==================================================
                POSTS GRID
            ================================================== */}

            {posts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">

                <div className="text-5xl mb-4">
                  📷
                </div>

                <h2 className="text-xl font-semibold mb-2">
                  No Posts Yet
                </h2>

                {isOwnProfile ? (
                  <p className="text-gray-500">
                    Share your first photo or video.
                  </p>
                ) : (
                  <p className="text-gray-500">
                    This user hasn't posted anything yet.
                  </p>
                )}

              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1">

                {posts.map((post) => {
                  const mediaUrl =
                    getPostMedia(post);

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() =>
                        handleOpenPost(post)
                      }
                      className="aspect-square bg-gray-200 overflow-hidden relative group"
                    >

                      {mediaUrl ? (
                        post.video ||
                        post.media_type ===
                          "video" ||
                        post.content_type ===
                          "video" ? (
                          <video
                            src={mediaUrl}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={mediaUrl}
                            alt="Post"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-4 bg-gray-100">

                          <p className="text-sm text-gray-700 line-clamp-6">
                            {post.caption ||
                              post.content ||
                              "Post"}
                          </p>

                        </div>
                      )}

                    </button>
                  );
                })}

              </div>
            )}
          </>
        )}

      </div>

      {/* ==================================================
          FOLLOWERS MODAL
      ================================================== */}

      {showFollowersModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() =>
            setShowFollowersModal(false)
          }
        >
          <div
            className="bg-white w-full max-w-md rounded-xl max-h-[80vh] overflow-hidden"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-center justify-between p-4 border-b">

              <h2 className="text-lg font-semibold">
                Followers
              </h2>

              <button
                onClick={() =>
                  setShowFollowersModal(false)
                }
                className="text-2xl text-gray-500 hover:text-gray-900"
              >
                ×
              </button>

            </div>

            <div className="p-4 overflow-y-auto max-h-[65vh]">

              {followersLoading ? (
                <p className="text-center text-gray-500 py-8">
                  Loading followers...
                </p>
              ) : followersList.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No followers yet.
                </p>
              ) : (
                <div className="space-y-3">

                  {followersList.map(
                    (item) => {
                      const image =
                        getMediaUrl(
                          item.profile_image
                        );

                      return (
                        <div
                          key={
                            item.id ||
                            item.user_id
                          }
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                        >

                          <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">

                            {image ? (
                              <img
                                src={image}
                                alt={
                                  item.username
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                👤
                              </span>
                            )}

                          </div>

                          <div>
                            <p className="font-medium">
                              {
                                item.username
                              }
                            </p>
                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ==================================================
          FOLLOWING MODAL
      ================================================== */}

      {showFollowingModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() =>
            setShowFollowingModal(false)
          }
        >
          <div
            className="bg-white w-full max-w-md rounded-xl max-h-[80vh] overflow-hidden"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-center justify-between p-4 border-b">

              <h2 className="text-lg font-semibold">
                Following
              </h2>

              <button
                onClick={() =>
                  setShowFollowingModal(false)
                }
                className="text-2xl text-gray-500 hover:text-gray-900"
              >
                ×
              </button>

            </div>

            <div className="p-4 overflow-y-auto max-h-[65vh]">

              {followingLoading ? (
                <p className="text-center text-gray-500 py-8">
                  Loading following...
                </p>
              ) : followingList.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Not following anyone yet.
                </p>
              ) : (
                <div className="space-y-3">

                  {followingList.map(
                    (item) => {
                      const image =
                        getMediaUrl(
                          item.profile_image
                        );

                      return (
                        <div
                          key={
                            item.id ||
                            item.user_id
                          }
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                        >

                          <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">

                            {image ? (
                              <img
                                src={image}
                                alt={
                                  item.username
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                👤
                              </span>
                            )}

                          </div>

                          <div>
                            <p className="font-medium">
                              {
                                item.username
                              }
                            </p>
                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ==================================================
          EDIT PROFILE MODAL
      ================================================== */}

      {showEditModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() =>
            setShowEditModal(false)
          }
        >
          <div
            className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-center justify-between mb-6">

              <h2 className="text-xl font-semibold">
                Edit Profile
              </h2>

              <button
                onClick={() =>
                  setShowEditModal(false)
                }
                className="text-2xl text-gray-500 hover:text-gray-900"
              >
                ×
              </button>

            </div>

            {/* PROFILE IMAGE */}

            <div className="flex flex-col items-center mb-6">

              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center mb-3">

                {profilePreview ? (
                  <img
                    src={profilePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : profileImage ? (
                  <img
                    src={profileImage}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">
                    👤
                  </span>
                )}

              </div>

              <label className="cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">

                Change profile photo

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleProfileImageChange
                  }
                  className="hidden"
                />

              </label>

            </div>

            {/* BIO */}

            <div className="mb-5">

              <label className="block text-sm font-medium mb-2">
                Bio
              </label>

              <textarea
                value={
                  editProfile.bio
                }
                onChange={(event) =>
                  setEditProfile(
                    (previous) => ({
                      ...previous,
                      bio: event.target.value,
                    })
                  )
                }
                rows={4}
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Write something about yourself..."
              />

            </div>

            {/* PRIVATE ACCOUNT */}

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-5">

              <div>

                <p className="font-medium">
                  Private Account
                </p>

                <p className="text-sm text-gray-500">
                  Only approved followers can see your posts.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setEditProfile(
                    (previous) => ({
                      ...previous,
                      is_private:
                        !previous.is_private,
                    })
                  )
                }
                className={`w-12 h-7 rounded-full transition ${
                  editProfile.is_private
                    ? "bg-blue-500"
                    : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    editProfile.is_private
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>

            </div>

            {/* MESSAGE */}

            {profileMessage && (
              <p
                className={`mb-4 text-sm ${
                  profileMessage.includes(
                    "successfully"
                  )
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {profileMessage}
              </p>
            )}

            {/* ACTIONS */}

            <div className="flex justify-end gap-3">

              <button
                onClick={() =>
                  setShowEditModal(false)
                }
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {savingProfile
                  ? "Saving..."
                  : "Save changes"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ==================================================
          POST MODAL
      ================================================== */}

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() =>
            setSelectedPost(null)
          }
        >
          <div
            className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col md:flex-row"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* ==================================================
                POST MEDIA
            ================================================== */}

            <div className="md:w-3/5 bg-black flex items-center justify-center min-h-[300px]">

              {getPostMedia(
                selectedPost
              ) ? (
                selectedPost.video ||
                selectedPost.media_type ===
                  "video" ||
                selectedPost.content_type ===
                  "video" ? (
                  <video
                    src={getPostMedia(
                      selectedPost
                    )}
                    controls
                    className="max-h-[80vh] max-w-full"
                  />
                ) : (
                  <img
                    src={getPostMedia(
                      selectedPost
                    )}
                    alt="Post"
                    className="max-h-[80vh] max-w-full object-contain"
                  />
                )
              ) : (
                <div className="text-white p-8 text-center">
                  {selectedPost.caption ||
                    selectedPost.content ||
                    "Post"}
                </div>
              )}

            </div>

            {/* ==================================================
                POST DETAILS
            ================================================== */}

            <div className="md:w-2/5 flex flex-col max-h-[80vh]">

              {/* HEADER */}

              <div className="p-4 border-b flex items-center justify-between">

                <div>
                  <p className="font-semibold">
                    {user.username}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSelectedPost(null)
                  }
                  className="text-2xl text-gray-500 hover:text-gray-900"
                >
                  ×
                </button>

              </div>

              {/* COMMENTS */}

              <div className="flex-1 overflow-y-auto p-4">

                {selectedPost.caption && (
                  <div className="mb-5">

                    <p className="text-sm">

                      <span className="font-semibold mr-2">
                        {user.username}
                      </span>

                      {selectedPost.caption}

                    </p>

                  </div>
                )}

                {commentsLoading ? (
                  <p className="text-sm text-gray-500">
                    Loading comments...
                  </p>
                ) : commentList.length ===
                  0 ? (
                  <p className="text-sm text-gray-500">
                    No comments yet.
                  </p>
                ) : (
                  <div className="space-y-4">

                    {commentList.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item.id ||
                            index
                          }
                          className="text-sm"
                        >

                          <span className="font-semibold mr-2">
                            {item.username ||
                              item.user
                                ?.username ||
                              "User"}
                          </span>

                          {item.text ||
                            item.content ||
                            item.comment ||
                            ""}

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

              {/* ==================================================
                  LIKE
              ================================================== */}

              <div className="border-t px-4 py-3">

                <button
                  type="button"
                  onClick={
                    handleLike
                  }
                  className="text-2xl"
                  aria-label={
                    isLiked
                      ? "Unlike post"
                      : "Like post"
                  }
                >
                  {isLiked
                    ? "❤️"
                    : "♡"}
                </button>

                <p className="text-sm font-medium mt-1">
                  {likeCount} likes
                </p>

              </div>

              {/* COMMENT ERROR */}

              {commentError && (
                <p className="px-4 text-sm text-red-500">
                  {commentError}
                </p>
              )}

              {/* COMMENT INPUT */}

              <div className="border-t p-3 flex gap-2">

                <input
                  type="text"
                  value={comment}
                  onChange={(event) =>
                    setComment(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleAddComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                <button
                  onClick={
                    handleAddComment
                  }
                  disabled={
                    commentSubmitting ||
                    !comment.trim()
                  }
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                >
                  {commentSubmitting
                    ? "..."
                    : "Post"}
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;