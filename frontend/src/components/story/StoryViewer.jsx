import { useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "../../utils/auth";

const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";

const getMediaUrl = (url) => {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${BACKEND_HOST}${url}`;
  }

  return `${BACKEND_HOST}/${url}`;
};

const getCurrentUserId = (token) => {
  try {
    if (!token) return null;

    const payload = JSON.parse(
      atob(token.split(".")[1])
    );

    const userId =
      payload.user_id ??
      payload.userId ??
      payload.sub;

    if (userId === undefined || userId === null) {
      return null;
    }

    return Number(userId);
  } catch (error) {
    console.error("JWT decode error:", error);
    return null;
  }
};

const getTimeAgo = (createdAt) => {
  const created = new Date(createdAt);
  const now = new Date();
  const seconds = Math.floor((now - created) / 1000);

  if (seconds < 60) return `${Math.max(seconds, 0)}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
};

const REACTION_EMOJIS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "🔥",
];

export default function StoryViewer({
  stories = [],
  initialIndex = 0,
  token,
  onClose,
}) {
  const [currentIndex, setCurrentIndex] =
    useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [selectedReaction, setSelectedReaction] =
    useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [viewers, setViewers] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [viewCounts, setViewCounts] = useState({});

  const timerRef = useRef(null);
  const videoRef = useRef(null);

  const currentStory = stories[currentIndex];
  const currentUserId = getCurrentUserId(token);

  const storyUserId =
    currentStory?.user_id ??
    currentStory?.user?.id;

  const isOwnStory =
    Number(storyUserId) === Number(currentUserId);

  // ==========================================
  // RESET ACTIONS WHEN STORY CHANGES
  // ==========================================

  useEffect(() => {
    setSelectedReaction(null);
    setReplyText("");
    setActionMessage("");
    setShowViewers(false);
    setViewers([]);
  }, [currentStory?.id]);

  // ==========================================
  // NEXT
  // ==========================================

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((previous) => previous + 1);
      setProgress(0);
      return;
    }

    onClose();
  };

  // ==========================================
  // PREVIOUS
  // ==========================================

  const goPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((previous) => previous - 1);
      setProgress(0);
      return;
    }

    setProgress(0);
  };

  // ==========================================
  // MARK STORY VIEWED
  // ==========================================

  useEffect(() => {
    const storyId = currentStory?.id;

    if (!storyId || !token || !currentUserId) {
      return;
    }

    // Owner must not become their own viewer.
    if (isOwnStory) {
      console.log(
        "STORY VIEW: own story, not creating self-view",
        storyId
      );
      return;
    }

    let cancelled = false;

    const markAsViewed = async () => {
      try {
        console.log("STORY VIEW: sending", {
          storyId,
          currentUserId,
          storyUserId,
        });

        const response = await authenticatedFetch(
          `${BACKEND_HOST}/api/stories/${storyId}/view/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const text = await response.text();
        let data = {};

        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }

        console.log(
          "STORY VIEW RESPONSE:",
          response.status,
          data
        );

        if (!response.ok) {
          console.error(
            "STORY VIEW FAILED:",
            response.status,
            data
          );
          return;
        }

        if (
          !cancelled &&
          typeof data.view_count === "number"
        ) {
          setViewCounts((previous) => ({
            ...previous,
            [storyId]: data.view_count,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Story view error:",
            error
          );
        }
      }
    };

    markAsViewed();

    return () => {
      cancelled = true;
    };
  }, [
    currentStory?.id,
    token,
    currentUserId,
    isOwnStory,
    storyUserId,
  ]);

  // ==========================================
  // LOAD VIEWERS
  // ==========================================

  const loadViewers = async () => {
    if (!currentStory?.id || !isOwnStory || !token) {
      return;
    }

    setLoadingViewers(true);
    setActionMessage("");

    try {
      const response = await authenticatedFetch(
        `${BACKEND_HOST}/api/stories/${currentStory.id}/viewers/`
      );

      const data = await response.json();

      console.log(
        "STORY VIEWERS RESPONSE:",
        response.status,
        data
      );

      if (!response.ok) {
        setActionMessage(
          data.error || "Unable to load viewers."
        );
        return;
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.viewers)
        ? data.viewers
        : [];

      setViewers(list);
      setViewCounts((previous) => ({
        ...previous,
        [currentStory.id]: Number(
          data.count ?? list.length
        ),
      }));
      setShowViewers(true);
    } catch (error) {
      console.error(
        "Load viewers error:",
        error
      );
      setActionMessage(
        "Unable to load viewers."
      );
    } finally {
      setLoadingViewers(false);
    }
  };

  // ==========================================
  // STORY TIMER
  // ==========================================

  useEffect(() => {
    if (!currentStory || showViewers) {
      return;
    }

    clearInterval(timerRef.current);
    setProgress(0);

    if (currentStory.video) {
      return;
    }

    const duration = 5000;
    const interval = 50;
    let elapsed = 0;

    timerRef.current = setInterval(() => {
      elapsed += interval;

      const percentage =
        (elapsed / duration) * 100;

      setProgress(Math.min(percentage, 100));

      if (elapsed >= duration) {
        clearInterval(timerRef.current);
        goNext();
      }
    }, interval);

    return () => {
      clearInterval(timerRef.current);
    };
  }, [
    currentStory?.id,
    currentStory?.video,
    currentIndex,
    showViewers,
  ]);

  // ==========================================
  // VIDEO
  // ==========================================

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;

    if (!video || !video.duration) {
      return;
    }

    setProgress(
      (video.currentTime / video.duration) * 100
    );
  };

  const handleVideoEnded = () => {
    goNext();
  };

  // ==========================================
  // REACTION
  // ==========================================

  const handleReaction = async (emoji) => {
    if (
      !currentStory ||
      isOwnStory ||
      reacting ||
      !token
    ) {
      return;
    }

    setReacting(true);
    setActionMessage("");

    try {
      const response = await authenticatedFetch(
        `${BACKEND_HOST}/api/stories/${currentStory.id}/react/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emoji }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setActionMessage(
          data.error || "Unable to react."
        );
        return;
      }

      setSelectedReaction(data.emoji || emoji);
      setActionMessage("Reaction sent ❤️");

      setTimeout(() => {
        setActionMessage("");
      }, 1500);
    } catch (error) {
      console.error(
        "Story reaction error:",
        error
      );
      setActionMessage(
        "Unable to send reaction."
      );
    } finally {
      setReacting(false);
    }
  };

  // ==========================================
  // STORY REPLY
  // ==========================================

  const handleReply = async (event) => {
    event.preventDefault();

    const text = replyText.trim();

    if (
      !text ||
      !currentStory ||
      isOwnStory ||
      sendingReply ||
      !token
    ) {
      return;
    }

    setSendingReply(true);
    setActionMessage("");

    try {
      const response = await authenticatedFetch(
        `${BACKEND_HOST}/api/stories/${currentStory.id}/reply/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setActionMessage(
          data.error || "Unable to send reply."
        );
        return;
      }

      setReplyText("");
      setActionMessage("Reply sent 💬");

      setTimeout(() => {
        setActionMessage("");
      }, 1500);
    } catch (error) {
      console.error(
        "Story reply error:",
        error
      );
      setActionMessage(
        "Unable to send reply."
      );
    } finally {
      setSendingReply(false);
    }
  };

  if (!currentStory) {
    return null;
  }

  const displayedViewCount =
    viewCounts[currentStory.id] ??
    currentStory.view_count ??
    0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          height: "100%",
          position: "relative",
          background: "#111",
          overflow: "hidden",
        }}
      >
        {/* PROGRESS */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            right: "12px",
            display: "flex",
            gap: "4px",
            zIndex: 40,
          }}
        >
          {stories.map((story, index) => (
            <div
              key={story.id}
              style={{
                flex: 1,
                height: "3px",
                background:
                  "rgba(255,255,255,0.3)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "#fff",
                  width:
                    index < currentIndex
                      ? "100%"
                      : index === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* MEDIA */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {currentStory.image && (
            <img
              src={getMediaUrl(currentStory.image)}
              alt="Story"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          )}

          {currentStory.video && (
            <video
              ref={videoRef}
              src={getMediaUrl(currentStory.video)}
              autoPlay
              playsInline
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          )}

          {!currentStory.image &&
            !currentStory.video && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  background:
                    "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)",
                }}
              >
                <p
                  style={{
                    color: "#fff",
                    fontSize: "30px",
                    fontWeight: 700,
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {currentStory.text}
                </p>
              </div>
            )}
        </div>

        {/* HEADER */}
        <div
          style={{
            position: "absolute",
            top: "25px",
            left: "15px",
            right: "15px",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#555",
                border: "2px solid #fff",
              }}
            >
              {currentStory.profile_image ? (
                <img
                  src={getMediaUrl(
                    currentStory.profile_image
                  )}
                  alt={currentStory.username}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {currentStory.username
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {currentStory.username}
              </p>
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "12px",
                }}
              >
                {getTimeAgo(currentStory.created_at)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "38px",
              height: "38px",
              border: "none",
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              color: "#fff",
              fontSize: "25px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* PREVIOUS */}
        <button
          type="button"
          onClick={goPrevious}
          aria-label="Previous story"
          style={{
            position: "absolute",
            left: 0,
            top: "80px",
            bottom: "100px",
            width: "30%",
            border: "none",
            background: "transparent",
            zIndex: 10,
          }}
        />

        {/* NEXT */}
        <button
          type="button"
          onClick={goNext}
          aria-label="Next story"
          style={{
            position: "absolute",
            right: 0,
            top: "80px",
            bottom: "100px",
            width: "30%",
            border: "none",
            background: "transparent",
            zIndex: 10,
          }}
        />

        {/* ACTIONS FOR OTHER PEOPLE'S STORIES */}
        {!isOwnStory && (
          <div
            style={{
              position: "absolute",
              left: "12px",
              right: "12px",
              bottom: "18px",
              zIndex: 60,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={reacting}
                  onClick={() => handleReaction(emoji)}
                  style={{
                    width: "42px",
                    height: "42px",
                    border: "none",
                    borderRadius: "50%",
                    background:
                      selectedReaction === emoji
                        ? "rgba(255,255,255,0.45)"
                        : "rgba(0,0,0,0.55)",
                    color: "#fff",
                    fontSize: "21px",
                    cursor: reacting
                      ? "default"
                      : "pointer",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleReply}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <input
                value={replyText}
                onChange={(event) =>
                  setReplyText(event.target.value)
                }
                placeholder="Reply to story..."
                maxLength={1000}
                style={{
                  flex: 1,
                  height: "44px",
                  padding: "0 16px",
                  border:
                    "1px solid rgba(255,255,255,0.5)",
                  borderRadius: "24px",
                  outline: "none",
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  fontSize: "14px",
                }}
              />

              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
                style={{
                  width: "44px",
                  height: "44px",
                  border: "none",
                  borderRadius: "50%",
                  background:
                    !replyText.trim() || sendingReply
                      ? "#555"
                      : "#3797f0",
                  color: "#fff",
                  fontSize: "18px",
                  cursor:
                    !replyText.trim() || sendingReply
                      ? "default"
                      : "pointer",
                }}
              >
                {sendingReply ? "..." : "➤"}
              </button>
            </form>

            {actionMessage && (
              <div
                style={{
                  alignSelf: "center",
                  padding: "6px 12px",
                  borderRadius: "15px",
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              >
                {actionMessage}
              </div>
            )}
          </div>
        )}

        {/* OWN STORY VIEWERS BUTTON */}
        {isOwnStory && (
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: 0,
              right: 0,
              zIndex: 70,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={loadViewers}
              disabled={loadingViewers}
              style={{
                padding: "10px 18px",
                border: "none",
                borderRadius: "25px",
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              👁 {displayedViewCount}{" "}
              {Number(displayedViewCount) === 1
                ? "view"
                : "views"}
              <span style={{ marginLeft: "8px" }}>
                {loadingViewers
                  ? "Loading..."
                  : "Viewers"}
              </span>
            </button>
          </div>
        )}

        {/* VIEWERS SHEET */}
        {showViewers && isOwnStory && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 100,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                width: "100%",
                maxHeight: "70%",
                background: "#fff",
                borderRadius: "20px 20px 0 0",
                overflow: "hidden",
                color: "#111",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "17px",
                      fontWeight: 700,
                    }}
                  >
                    Story viewers
                  </h3>
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "#777",
                      fontSize: "12px",
                    }}
                  >
                    {viewers.length}{" "}
                    {viewers.length === 1
                      ? "person"
                      : "people"}{" "}
                    viewed your story
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowViewers(false)}
                  style={{
                    border: "none",
                    background: "#f1f1f1",
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    fontSize: "20px",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  maxHeight: "calc(70vh - 90px)",
                  overflowY: "auto",
                }}
              >
                {viewers.length === 0 ? (
                  <div
                    style={{
                      padding: "35px 20px",
                      textAlign: "center",
                      color: "#888",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "35px",
                        marginBottom: "8px",
                      }}
                    >
                      👀
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                      }}
                    >
                      No viewers yet
                    </p>
                  </div>
                ) : (
                  viewers.map((viewer) => {
                    const replies = Array.isArray(
                      viewer.replies
                    )
                      ? viewer.replies
                      : [];

                    const reaction =
                      viewer.reaction || null;

                    return (
                      <div
                        key={viewer.user_id}
                        style={{
                          padding: "12px 18px",
                          borderBottom: "1px solid #f1f1f1",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              width: "45px",
                              height: "45px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              background: "#eee",
                              flexShrink: 0,
                            }}
                          >
                            {viewer.profile_image ? (
                              <img
                                src={getMediaUrl(
                                  viewer.profile_image
                                )}
                                alt={viewer.username}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  color: "#666",
                                }}
                              >
                                {viewer.username
                                  ?.charAt(0)
                                  ?.toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                fontWeight: 700,
                              }}
                            >
                              {viewer.username}
                            </p>

                            {(viewer.first_name ||
                              viewer.last_name) && (
                              <p
                                style={{
                                  margin: "2px 0 0",
                                  fontSize: "12px",
                                  color: "#777",
                                }}
                              >
                                {viewer.first_name || ""}{" "}
                                {viewer.last_name || ""}
                              </p>
                            )}
                          </div>

                          <span
                            style={{
                              fontSize: "11px",
                              color: "#999",
                            }}
                          >
                            {viewer.viewed_at
                              ? getTimeAgo(viewer.viewed_at)
                              : "Viewed"}
                          </span>
                        </div>

                        {/* REACTION */}
                        {reaction?.emoji && (
                          <div
                            style={{
                              marginTop: "9px",
                              marginLeft: "57px",
                              display: "flex",
                              alignItems: "center",
                              gap: "7px",
                              fontSize: "13px",
                              color: "#444",
                            }}
                          >
                            <span style={{ fontSize: "18px" }}>
                              {reaction.emoji}
                            </span>
                            <span>
                              Reacted to your story
                            </span>
                          </div>
                        )}

                        {/* REPLIES */}
                        {replies.map((reply) => (
                          <div
                            key={reply.id}
                            style={{
                              marginTop: "8px",
                              marginLeft: "57px",
                              padding: "8px 10px",
                              borderRadius: "10px",
                              background: "#f5f5f5",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                marginBottom: "3px",
                                color: "#777",
                                fontSize: "11px",
                              }}
                            >
                              <span>💬</span>
                              <span>
                                Replied to your story
                              </span>
                            </div>

                            <div
                              style={{
                                color: "#222",
                                fontWeight: 500,
                                wordBreak: "break-word",
                              }}
                            >
                              “{reply.text}”
                            </div>
                          </div>
                        ))}

                        {/* NO REACTION / REPLY */}
                        {!reaction?.emoji &&
                          replies.length === 0 && (
                            <div
                              style={{
                                marginTop: "7px",
                                marginLeft: "57px",
                                color: "#999",
                                fontSize: "11px",
                              }}
                            >
                              👁 Viewed your story
                            </div>
                          )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
