import { useEffect, useState } from "react";
import {
  authenticatedFetch,
  getCurrentUserId,
} from "../../utils/auth";

import PostCard from "../../components/post/PostCard";
import CreatePostModal from "../../components/CreatePost/CreatePostModal";
import Stories from "../../components/story/Stories";

const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";


function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreatePost, setShowCreatePost] =
    useState(false);

  const [currentUserId, setCurrentUserId] =
    useState(null);


  /*
   * Fetch all posts
   *
   * Important:
   * Follow karna required nahi hai.
   * Backend authenticated users ko all posts return karega.
   */
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/posts/`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch posts"
        );
      }

      const data =
        await response.json();

      /*
       * Django REST Framework pagination
       * support bhi rakh rahe hain.
       */
      if (Array.isArray(data)) {
        setPosts(data);
      } else if (
        Array.isArray(data?.results)
      ) {
        setPosts(data.results);
      } else {
        setPosts([]);
      }

    } catch (fetchError) {
      console.error(
        "Fetch posts error:",
        fetchError
      );

      setError(
        "Unable to load posts."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const userId =
      getCurrentUserId();

    setCurrentUserId(
      userId
        ? Number(userId)
        : null
    );

    fetchPosts();
  }, []);


  /*
   * New post create hone ke baad
   * post ko feed ke top par add karo.
   */
  const handlePostCreated = (
    newPost
  ) => {

    if (newPost) {
      setPosts(
        (previousPosts) => [
          newPost,
          ...previousPosts,
        ]
      );
    }

    setShowCreatePost(false);
  };


  /*
   * Post successfully delete hone ke baad
   * feed se immediately remove karo.
   */
  const handleDeletePost = (
    deletedPostId
  ) => {

    setPosts(
      (previousPosts) =>
        previousPosts.filter(
          (post) =>
            Number(post.id) !==
            Number(deletedPostId)
        )
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">

      <div className="mx-auto max-w-[980px] px-4 py-6 md:px-6">

        {/* ================= STORIES ================= */}

        <div className="mb-6 overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <Stories />
        </div>


        {/* ================= HOME HEADER ================= */}

        <div className="mb-6 flex items-center justify-between rounded-[24px] border border-gray-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
              Your feed
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Home
            </h2>
          </div>


          <button
            type="button"
            onClick={() =>
              setShowCreatePost(true)
            }
            className="rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-200 transition hover:scale-[1.02] active:scale-95"
          >
            Create Post
          </button>

        </div>


        {/* ================= ERROR ================= */}

        {error && (
          <div className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-500">
            {error}

            <button
              type="button"
              onClick={fetchPosts}
              className="ml-2 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}


        {/* ================= LOADING ================= */}

        {loading && (
          <div className="my-10 flex justify-center">
            <div className="flex items-center gap-3 text-sm font-medium text-gray-500">

              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-pink-500" />

              Loading posts...

            </div>
          </div>
        )}


        {/* ================= POSTS ================= */}

        {!loading && !error && (
          <div className="space-y-7">

            {posts.length === 0 ? (

              <div className="rounded-[24px] border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 shadow-sm">

                <p className="text-lg font-semibold text-gray-700">
                  No posts yet
                </p>

                <p className="mt-1 text-sm">
                  Create the first post!
                </p>

              </div>

            ) : (

              posts.map((post) => (

                <PostCard
                  key={post.id}
                  post={post}

                  /*
                   * Current logged-in user ID
                   * PostCard ko diya ja raha hai
                   * taaki wo determine kar sake
                   * ki Delete button dikhana hai ya nahi.
                   */
                  currentUserId={
                    currentUserId
                  }

                  /*
                   * Delete successful hone ke baad
                   * Home se post remove hogi.
                   */
                  onPostDeleted={
                    handleDeletePost
                  }

                  /*
                   * Compatibility ke liye
                   * existing prop bhi rakha hai.
                   */
                  onDelete={
                    handleDeletePost
                  }
                />

              ))

            )}

          </div>
        )}

      </div>


      {/* ================= CREATE POST MODAL ================= */}

      {showCreatePost && (

        <CreatePostModal
          onClose={() =>
            setShowCreatePost(false)
          }

          onPostCreated={
            handlePostCreated
          }
        />

      )}

    </div>
  );
}


export default Home;

