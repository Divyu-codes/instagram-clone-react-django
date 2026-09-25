import { useEffect, useState } from "react";
import CreateStory from "./CreateStory";
import StoryViewer from "./StoryViewer";
import {
  authenticatedFetch,
  getValidAccessToken,
} from "../../utils/auth";

const BACKEND_HOST =
  "http://127.0.0.1:8000";

// ==========================================
// GET CURRENT USER ID
// ==========================================

function getCurrentUserId() {
  try {
    const token =
      localStorage.getItem("access_token");

    if (!token) {
      return null;
    }

    const payload = JSON.parse(
      atob(token.split(".")[1])
    );

    const userId = Number(
      payload.user_id ||
        payload.userId ||
        payload.sub
    );

    if (!userId || Number.isNaN(userId)) {
      return null;
    }

    return userId;
  } catch (error) {
    console.error(
      "Unable to read current user:",
      error
    );

    return null;
  }
}

// ==========================================
// IMAGE URL
// ==========================================

function getImageUrl(url) {
  if (!url) {
    return null;
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return `${BACKEND_HOST}${url}`;
}

// ==========================================
// STORIES
// ==========================================

function Stories() {
  const [stories, setStories] =
    useState([]);

  const [showCreateStory, setShowCreateStory] =
    useState(false);

  const [selectedStories, setSelectedStories] =
    useState([]);

  const [selectedUserId, setSelectedUserId] =
    useState(null);

  const [token, setToken] =
    useState(null);

  const [isOwnStory, setIsOwnStory] =
    useState(false);

  const currentUserId =
    getCurrentUserId();

  // ==========================================
  // LOAD STORIES
  // ==========================================

  const loadStories = async () => {
    try {
      const response =
        await authenticatedFetch(
          `${BACKEND_HOST}/api/stories/`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to load stories"
        );
      }

      const data =
        await response.json();

      console.log(
        "STORIES API:",
        data
      );

      setStories(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "Stories loading error:",
        error
      );

      setStories([]);
    }
  };

  // ==========================================
  // INITIALIZE
  // ==========================================

  useEffect(() => {
    const initialize = async () => {
      const validToken =
        await getValidAccessToken();

      if (validToken) {
        setToken(validToken);
      }

      await loadStories();
    };

    initialize();
  }, []);

  // ==========================================
  // GROUP STORIES BY USER
  // ==========================================

  const groupedStories =
    stories.reduce(
      (groups, story) => {
        const userId = Number(
          story.user_id ||
            story.user?.id ||
            story.profile?.user_id
        );

        if (!userId) {
          return groups;
        }

        if (!groups[userId]) {
          groups[userId] = [];
        }

        groups[userId].push(story);

        return groups;
      },
      {}
    );

  // ==========================================
  // MY STORY
  // ==========================================

  const myStoryGroup =
    currentUserId
      ? groupedStories[
          currentUserId
        ] || []
      : [];

  // ==========================================
  // OTHER STORIES
  // ==========================================

  const otherStoryGroups =
    Object.entries(
      groupedStories
    ).filter(
      ([userId]) =>
        Number(userId) !==
        Number(currentUserId)
    );

  // ==========================================
  // OPEN STORIES
  // ==========================================

  const openStories = async (
    userId,
    userStories,
    ownStory = false
  ) => {
    const validToken =
      await getValidAccessToken();

    if (validToken) {
      setToken(validToken);
    }

    setSelectedUserId(
      Number(userId)
    );

    setSelectedStories(
      userStories
    );

    setIsOwnStory(ownStory);
  };

  // ==========================================
  // MY STORY CLICK
  // ==========================================

  const handleMyStoryClick =
    async () => {
      if (myStoryGroup.length > 0) {
        await openStories(
          currentUserId,
          myStoryGroup,
          true
        );
      } else {
        setShowCreateStory(true);
      }
    };

  // ==========================================
  // STORY CREATED
  // ==========================================

  const handleStoryCreated =
    async () => {
      setShowCreateStory(false);

      await loadStories();
    };

  // ==========================================
  // CLOSE STORY
  // ==========================================

  const handleCloseStory =
    () => {
      setSelectedStories([]);
      setSelectedUserId(null);
      setIsOwnStory(false);
    };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-4 py-3">

        {/* ====================================
            MY STORY
        ==================================== */}

        <div className="flex min-w-[72px] flex-col items-center">

          <div className="relative">

            <button
              type="button"
              onClick={
                handleMyStoryClick
              }
              className="h-16 w-16 overflow-hidden rounded-full border-2 border-gray-300 bg-gray-100"
            >
              {myStoryGroup.length >
              0 ? (
                <img
                  src={getImageUrl(
                    myStoryGroup[0]
                      ?.profile_image ||
                      myStoryGroup[0]
                        ?.user
                        ?.profile_image
                  )}
                  alt="Your story"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-gray-500">
                  👤
                </div>
              )}
            </button>

            {/* PLUS BUTTON */}

            <button
              type="button"
              onClick={() =>
                setShowCreateStory(
                  true
                )
              }
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-lg font-bold text-white"
            >
              +
            </button>

          </div>

          <span className="mt-1 max-w-[70px] truncate text-xs">
            Your story
          </span>

        </div>

        {/* ====================================
            OTHER USERS STORIES
        ==================================== */}

        {otherStoryGroups.map(
          ([userId, userStories]) => {
            const firstStory =
              userStories[0];

            const username =
              firstStory?.username ||
              firstStory?.user
                ?.username ||
              "User";

            const profileImage =
              firstStory?.profile_image ||
              firstStory?.user
                ?.profile_image ||
              null;

            return (
              <button
                key={userId}
                type="button"
                onClick={() =>
                  openStories(
                    Number(userId),
                    userStories,
                    false
                  )
                }
                className="flex min-w-[72px] flex-col items-center"
              >

                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-pink-500 p-[2px]">

                  <div className="h-full w-full overflow-hidden rounded-full bg-gray-100">

                    {profileImage ? (
                      <img
                        src={getImageUrl(
                          profileImage
                        )}
                        alt={username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">
                        👤
                      </div>
                    )}

                  </div>

                </div>

                <span className="mt-1 max-w-[70px] truncate text-xs">
                  {username}
                </span>

              </button>
            );
          }
        )}

      </div>

      {/* ====================================
          CREATE STORY
      ==================================== */}

      {showCreateStory && (
        <CreateStory
          token={token}
          onStoryCreated={
            handleStoryCreated
          }
          onClose={() =>
            setShowCreateStory(false)
          }
        />
      )}

      {/* ====================================
          STORY VIEWER
      ==================================== */}

      {selectedStories.length > 0 && (
        <StoryViewer
          stories={selectedStories}
          userId={selectedUserId}
          token={token}
          isOwnStory={isOwnStory}
          onClose={
            handleCloseStory
          }
        />
      )}
    </>
  );
}

export default Stories;