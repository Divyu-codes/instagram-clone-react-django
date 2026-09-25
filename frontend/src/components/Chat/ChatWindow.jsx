import React, {

    useEffect,

    useRef,

    useState,

} from "react";



import useWebsocket from "./useWebsocket";

import MessageInput from "./MessageInput";

import { authenticatedFetch } from "../../utils/auth";



const BACKEND_HOST =

    (typeof window !== "undefined" &&

        window.__BACKEND_HOST__) ||

    "http://127.0.0.1:8000";



const REACTION_EMOJIS = [

    "❤️",

    "😂",

    "😍",

    "😢",

    "😡",

    "👍",

];



const MESSAGE_EMOJIS = [

    "😀",

    "😃",

    "😄",

    "😁",

    "😂",

    "🤣",

    "😊",

    "😍",

    "🥰",

    "😘",

    "😎",

    "🤔",

    "😮",

    "😢",

    "😭",

    "😡",

    "👍",

    "👎",

    "👏",

    "🙏",

    "🔥",

    "🎉",

    "❤️",

    "💯",

];



export default function ChatWindow({

    roomName,

    token,

    selectedUser,

}) {

    const [messages, setMessages] = useState([]);

    const [typingUsers, setTypingUsers] = useState({});

    const [openReactionMenu, setOpenReactionMenu] =

        useState(null);

    const [showEmojiPicker, setShowEmojiPicker] =

        useState(false);



    const messagesEndRef = useRef(null);

    const seenMessageIdsRef = useRef(new Set());



    // =====================================================

    // CURRENT USER

    // =====================================================



    const getCurrentUserId = () => {

        try {

            const tokenStr =

                localStorage.getItem("access_token");



            if (!tokenStr) {

                return null;

            }



            const payload = JSON.parse(

                atob(tokenStr.split(".")[1])

            );



            return Number(

                payload.user_id ||

                payload.userId ||

                payload.sub

            );

        } catch (error) {

            console.error(

                "Current user ID error:",

                error

            );



            return null;

        }

    };



    const currentUserId = getCurrentUserId();



    // =====================================================

    // WEBSOCKET URL

    // =====================================================



    const wsProtocol =

        window.location.protocol === "https:"

            ? "wss"

            : "ws";



    const backendHost = BACKEND_HOST.replace(

        /^https?:\/\//,

        ""

    );



    const wsUrl =

        `${wsProtocol}://${backendHost}` +

        `/ws/chat/${roomName}/?token=${token}`;



    console.log("CHAT WINDOW");

    console.log("Current User:", currentUserId);

    console.log("Selected User:", selectedUser);

    console.log("Room:", roomName);



    // =====================================================

    // MEDIA URL

    // =====================================================



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



        return (

            BACKEND_HOST +

            (url.startsWith("/") ? "" : "/") +

            url

        );

    };



    // =====================================================

    // NOTIFICATION SOUND

    // =====================================================



    const playNotification = () => {

        try {

            const audio = new Audio(

                "/notification.wav"

            );



            audio.volume = 0.6;



            audio.play().catch(() => {});

        } catch (error) {

            console.error(

                "Notification sound error:",

                error

            );

        }

    };



    // =====================================================

    // NORMALIZE MESSAGE

    // =====================================================



    const normalizeMessage = (data) => {

        return {

            ...data,



            id:

                data.id ??

                data.message_id ??

                `temp-${Date.now()}-${Math.random()}`,



            message:

                data.message ??

                data.content ??

                "",



            content:

                data.content ??

                data.message ??

                "",



            sender_id: Number(

                data.sender_id ??

                data.user_id

            ),



            sender_username:

                data.sender_username ||

                data.username ||

                "",



            message_type:

                data.message_type ||

                "text",



            attachment_url:

                data.attachment_url ||

                null,



            timestamp:

                data.timestamp ||

                new Date().toISOString(),



            reactions:

                Array.isArray(data.reactions)

                    ? data.reactions

                    : [],



            seen_by:

                Array.isArray(data.seen_by)

                    ? data.seen_by.map(Number)

                    : [],

        };

    };



    // =====================================================

    // ADD MESSAGE SAFELY

    // =====================================================



    const addMessage = (data) => {

        const newMessage =

            normalizeMessage(data);



        console.log(

            "ADDING MESSAGE TO STATE:",

            newMessage

        );



        setMessages((previous) => {

            const alreadyExists =

                previous.some(

                    (item) =>

                        String(item.id) ===

                        String(newMessage.id)

                );



            if (alreadyExists) {

                console.log(

                    "Duplicate message ignored:",

                    newMessage.id

                );



                return previous;

            }



            return [

                ...previous,

                newMessage,

            ];

        });

    };



    // =====================================================

    // UPDATE REACTION

    // =====================================================



    const updateReaction = (

        messageId,

        userId,

        emoji

    ) => {

        setMessages((previous) =>

            previous.map((message) => {

                if (

                    Number(message.id) !==

                    Number(messageId)

                ) {

                    return message;

                }



                const reactions =

                    Array.isArray(

                        message.reactions

                    )

                        ? [...message.reactions]

                        : [];



                const existingIndex =

                    reactions.findIndex(

                        (reaction) =>

                            Number(

                                reaction.user_id

                            ) ===

                            Number(userId)

                    );



                const newReaction = {

                    user_id: Number(userId),

                    emoji,

                };



                if (existingIndex >= 0) {

                    reactions[

                        existingIndex

                    ] = newReaction;

                } else {

                    reactions.push(

                        newReaction

                    );

                }



                return {

                    ...message,

                    reactions,

                };

            })

        );

    };



    // =====================================================

    // REMOVE REACTION

    // =====================================================



    const removeReaction = (

        messageId,

        userId

    ) => {

        setMessages((previous) =>

            previous.map((message) => {

                if (

                    Number(message.id) !==

                    Number(messageId)

                ) {

                    return message;

                }



                return {

                    ...message,

                    reactions: (

                        message.reactions || []

                    ).filter(

                        (reaction) =>

                            Number(

                                reaction.user_id

                            ) !==

                            Number(userId)

                    ),

                };

            })

        );

    };



    // =====================================================

    // WEBSOCKET

    // =====================================================



    const { send } = useWebsocket(

        wsUrl,

        (data) => {

            console.log(

                "========== CHAT WS MESSAGE =========="

            );



            console.log("TYPE:", data.type);

            console.log("DATA:", data);



            // =============================================

            // TYPING

            // =============================================



            if (data.type === "typing") {

                setTypingUsers(

                    (previous) => ({

                        ...previous,

                        [data.user_id]:

                            data.typing,

                    })

                );



                return;

            }



            // =============================================

            // REACTION

            // =============================================



            if (data.type === "reaction") {

                updateReaction(

                    data.message_id,

                    data.user_id,

                    data.emoji

                );



                return;

            }



            // =============================================

            // REMOVE REACTION

            // =============================================



            if (

                data.type ===

                "reaction_removed"

            ) {

                removeReaction(

                    data.message_id,

                    data.user_id

                );



                return;

            }



            // =============================================

            // SEEN

            // =============================================



            if (data.type === "seen") {

                const messageId = data.message_id;

                const userId = Number(data.user_id);



                setMessages((previous) =>

                    previous.map((message) => {

                        if (

                            String(message.id) !==

                            String(messageId)

                        ) {

                            return message;

                        }



                        const seenBy = Array.isArray(message.seen_by)

                            ? message.seen_by.map(Number)

                            : [];



                        if (seenBy.includes(userId)) {

                            return message;

                        }



                        return {

                            ...message,

                            seen_by: [...seenBy, userId],

                        };

                    })

                );



                return;

            }



            // =============================================

            // MESSAGE

            // =============================================



            if (

                data.type === "message" ||

                data.message !== undefined ||

                data.content !== undefined

            ) {

                const message =

                    normalizeMessage(data);



                console.log(

                    "MESSAGE RECEIVED:",

                    message

                );



                setMessages((previous) => {

                    const exists =

                        previous.some(

                            (item) =>

                                String(

                                    item.id

                                ) ===

                                String(

                                    message.id

                                )

                        );



                    if (exists) {

                        return previous;

                    }



                    return [

                        ...previous,

                        message,

                    ];

                });



                if (

                    message.sender_id &&

                    Number(

                        message.sender_id

                    ) !==

                        Number(

                            currentUserId

                        )

                ) {

                    playNotification();



                    // This chat is open, so persist the read state.

                    markRoomAsRead();

                }



                return;

            }



            console.log(

                "Unknown WebSocket event:",

                data

            );

        },

        () => {

            console.log(

                "Chat WebSocket connected:",

                roomName

            );

        }

    );



    // =====================================================

    // MARK ROOM AS READ

    // =====================================================



    async function markRoomAsRead() {

        if (!roomName) {

            return;

        }



        try {

            const response = await authenticatedFetch(

                `${BACKEND_HOST}/api/messages/room/${roomName}/mark-read/`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type": "application/json",

                    },

                }

            );



            if (!response.ok) {

                console.error(

                    "Mark room read failed:",

                    response.status

                );

                return;

            }



            const data = await response.json();



            console.log(

                "CHAT MARK READ:",

                data

            );

        } catch (error) {

            console.error(

                "Mark room read error:",

                error

            );

        }

    }



    // =====================================================

    // MARK INDIVIDUAL MESSAGE AS SEEN

    // =====================================================



    useEffect(() => {

        if (!roomName || !currentUserId || !messages.length) {

            return;

        }



        messages.forEach((message) => {

            const messageId = String(message.id);



            if (!message.id) {

                return;

            }



            if (

                Number(message.sender_id) ===

                Number(currentUserId)

            ) {

                return;

            }



            if (seenMessageIdsRef.current.has(messageId)) {

                return;

            }



            const seenBy = Array.isArray(message.seen_by)

                ? message.seen_by.map(Number)

                : [];



            if (seenBy.includes(Number(currentUserId))) {

                seenMessageIdsRef.current.add(messageId);

                return;

            }



            seenMessageIdsRef.current.add(messageId);



            send({

                action: "seen",

                message_id: message.id,

            });



            setMessages((previous) =>

                previous.map((item) => {

                    if (String(item.id) !== messageId) {

                        return item;

                    }



                    const currentSeenBy = Array.isArray(item.seen_by)

                        ? item.seen_by.map(Number)

                        : [];



                    if (

                        currentSeenBy.includes(

                            Number(currentUserId)

                        )

                    ) {

                        return item;

                    }



                    return {

                        ...item,

                        seen_by: [

                            ...currentSeenBy,

                            Number(currentUserId),

                        ],

                    };

                })

            );

        });

    }, [messages, roomName, currentUserId, send]);



    // =====================================================

    // LOAD HISTORY

    // =====================================================



    useEffect(() => {

        if (!roomName) {

            return;

        }



        let cancelled = false;



        const fetchHistory = async () => {

            try {

                console.log(

                    "Loading chat history:",

                    roomName

                );



                const response =

                    await authenticatedFetch(

                        `${BACKEND_HOST}/api/messages/room/${roomName}/`

                    );



                if (!response.ok) {

                    console.error(

                        "Failed to fetch messages:",

                        response.status

                    );



                    return;

                }



                const data =

                    await response.json();



                if (cancelled) {

                    return;

                }



                const history =

                    Array.isArray(data)

                        ? data.map(

                            normalizeMessage

                        )

                        : [];



                console.log(

                    "CHAT HISTORY:",

                    history

                );



                /*

                 * IMPORTANT:

                 *

                 * Don't simply do:

                 *

                 * setMessages(history)

                 *

                 * because WebSocket may already have

                 * delivered a new message.

                 *

                 * Merge history + current state instead.

                 */



                setMessages((previous) => {

                    const merged = [

                        ...history,

                        ...previous,

                    ];



                    const unique = [];



                    const seenIds =

                        new Set();



                    merged.forEach(

                        (message) => {

                            const id =

                                String(

                                    message.id

                                );



                            if (

                                !seenIds.has(

                                    id

                                )

                            ) {

                                seenIds.add(id);

                                unique.push(

                                    message

                                );

                            }

                        }

                    );



                    unique.sort(

                        (a, b) =>

                            new Date(

                                a.timestamp

                            ) -

                            new Date(

                                b.timestamp

                            )

                    );



                    return unique;

                });



                // Persist read state in Django database.

                await markRoomAsRead();

            } catch (error) {

                console.error(

                    "History error:",

                    error

                );

            }

        };



        fetchHistory();



        return () => {

            cancelled = true;

        };

    }, [roomName]);



    // =====================================================

    // AUTO SCROLL

    // =====================================================



    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({

            behavior: "smooth",

        });

    }, [messages]);



    // =====================================================

    // UPLOAD

    // =====================================================



    const upload = async (file) => {

        try {

            const formData =

                new FormData();



            formData.append(

                "file",

                file

            );



            const response =

                await authenticatedFetch(

                    `${BACKEND_HOST}/api/messages/upload/`,

                    {

                        method: "POST",

                        body: formData,

                    }

                );



            if (!response.ok) {

                console.error(

                    "Upload failed:",

                    response.status

                );



                return null;

            }



            return await response.json();

        } catch (error) {

            console.error(

                "Upload error:",

                error

            );



            return null;

        }

    };



    // =====================================================

    // SEND MESSAGE

    // =====================================================



    const handleSend = (data) => {

        console.log(

            "SENDING CHAT MESSAGE:",

            data

        );



        return send({

            action: "message",

            ...data,

        });

    };



    // =====================================================

    // TYPING

    // =====================================================



    const handleTyping = (isTyping) => {

        send({

            action: "typing",

            typing: isTyping,

        });

    };



    // =====================================================

    // SEND EMOJI

    // =====================================================



    const handleEmojiMessage = (emoji) => {

        send({

            action: "message",

            message: emoji,

            message_type: "text",

        });



        setShowEmojiPicker(false);

    };



    // =====================================================

    // ADD REACTION

    // =====================================================



    const handleReaction = (

        messageId,

        emoji

    ) => {

        const message =

            messages.find(

                (item) =>

                    Number(item.id) ===

                    Number(messageId)

            );



        if (!message) {

            return;

        }



        const myReaction = (

            message.reactions || []

        ).find(

            (reaction) =>

                Number(

                    reaction.user_id

                ) ===

                Number(

                    currentUserId

                )

        );



        if (

            myReaction &&

            myReaction.emoji === emoji

        ) {

            send({

                action:

                    "remove_reaction",

                message_id:

                    messageId,

            });

        } else {

            send({

                action: "reaction",

                message_id:

                    messageId,

                emoji,

            });

        }



        setOpenReactionMenu(null);

    };



    // =====================================================

    // GET REACTION COUNTS

    // =====================================================



    const getReactionCounts = (

        reactions

    ) => {

        const counts = {};



        (

            reactions || []

        ).forEach((reaction) => {

            counts[reaction.emoji] =

                (counts[

                    reaction.emoji

                ] || 0) + 1;

        });



        return counts;

    };



    // =====================================================

    // RENDER ATTACHMENT

    // =====================================================



    const renderAttachment = (

        message

    ) => {

        const attachment =

            message.attachments?.[0];



        const url = getMediaUrl(

            message.attachment_url ||

            attachment?.url

        );



        if (!url) {

            return null;

        }



        if (

            message.message_type ===

            "image"

        ) {

            return (

                <img

                    src={url}

                    alt="attachment"

                    style={styles.image}

                />

            );

        }



        if (

            message.message_type ===

            "video"

        ) {

            return (

                <video

                    src={url}

                    controls

                    preload="metadata"

                    style={styles.video}

                />

            );

        }



        if (

            message.message_type ===

            "voice"

        ) {

            return (

                <audio

                    src={url}

                    controls

                    preload="metadata"

                    style={styles.audio}

                />

            );

        }



        if (

            message.message_type ===

            "document"

        ) {

            return (

                <a

                    href={url}

                    target="_blank"

                    rel="noreferrer"

                    style={styles.document}

                >

                    📄

                    <span>

                        Open document

                    </span>

                </a>

            );

        }



        return null;

    };



    // =====================================================

    // RENDER

    // =====================================================



    return (

        <div style={styles.container}>

            {/* HEADER */}



            <div style={styles.header}>

                <div

                    style={

                        styles.headerAvatarWrapper

                    }

                >

                    {selectedUser?.image ? (

                        <img

                            src={

                                getMediaUrl(

                                    selectedUser.image

                                )

                            }

                            alt={

                                selectedUser.username

                            }

                            style={

                                styles.headerAvatarImage

                            }

                        />

                    ) : (

                        <div

                            style={

                                styles.headerAvatar

                            }

                        >

                            👤

                        </div>

                    )}

                </div>



                <div>

                    <div

                        style={

                            styles.username

                        }

                    >

                        {selectedUser?.username ||

                            "Chat"}

                    </div>



                    <div

                        style={styles.status}

                    >

                        <span

                            style={

                                styles.activeDot

                            }

                        >

                            ●

                        </span>



                        Active now

                    </div>

                </div>

            </div>



            {/* MESSAGES */}



            <div

                style={

                    styles.messagesArea

                }

                onClick={() => {

                    setOpenReactionMenu(null);

                }}

            >

                {messages.length === 0 && (

                    <div

                        style={styles.empty}

                    >

                        <div

                            style={

                                styles.emptyAvatar

                            }

                        >

                            {selectedUser?.image ? (

                                <img

                                    src={getMediaUrl(

                                        selectedUser.image

                                    )}

                                    alt=""

                                    style={

                                        styles.emptyAvatarImage

                                    }

                                />

                            ) : (

                                "👤"

                            )}

                        </div>



                        <h2

                            style={

                                styles.emptyTitle

                            }

                        >

                            {

                                selectedUser?.username

                            }

                        </h2>



                        <p

                            style={

                                styles.emptyText

                            }

                        >

                            Send a message to

                            start chatting

                        </p>

                    </div>

                )}



                {messages.map(

                    (message, index) => {

                        const isMine =

                            Number(

                                message.sender_id

                            ) ===

                            Number(

                                currentUserId

                            );



                        const content =

                            message.message ||

                            message.content ||

                            "";



                        const reactionCounts =

                            getReactionCounts(

                                message.reactions

                            );



                        const myReaction = (

                            message.reactions ||

                            []

                        ).find(

                            (reaction) =>

                                Number(

                                    reaction.user_id

                                ) ===

                                Number(

                                    currentUserId

                                )

                        );



                        return (

                            <div

                                key={`${message.id}-${index}`}

                                style={{

                                    ...styles.messageRow,

                                    justifyContent:

                                        isMine

                                            ? "flex-end"

                                            : "flex-start",

                                }}

                            >

                                <div

                                    style={

                                        styles.messageContainer

                                    }

                                >

                                    {/* REACTION BUTTON */}



                                    <button

                                        type="button"

                                        onClick={(

                                            event

                                        ) => {

                                            event.stopPropagation();



                                            setOpenReactionMenu(

                                                openReactionMenu ===

                                                    message.id

                                                    ? null

                                                    : message.id

                                            );

                                        }}

                                        style={

                                            styles.reactionTrigger

                                        }

                                    >

                                        😊

                                    </button>



                                    {/* REACTION MENU */}



                                    {openReactionMenu ===

                                        message.id && (

                                        <div

                                            onClick={(

                                                event

                                            ) =>

                                                event.stopPropagation()

                                            }

                                            style={{

                                                ...styles.reactionMenu,

                                                ...(isMine

                                                    ? styles.reactionMenuMine

                                                    : styles.reactionMenuOther),

                                            }}

                                        >

                                            {REACTION_EMOJIS.map(

                                                (

                                                    emoji

                                                ) => (

                                                    <button

                                                        key={

                                                            emoji

                                                        }

                                                        type="button"

                                                        onClick={() =>

                                                            handleReaction(

                                                                message.id,

                                                                emoji

                                                            )

                                                        }

                                                        style={{

                                                            ...styles.reactionEmojiButton,

                                                            ...(myReaction?.emoji ===

                                                            emoji

                                                                ? styles.selectedReaction

                                                                : {}),

                                                        }}

                                                    >

                                                        {

                                                            emoji

                                                        }

                                                    </button>

                                                )

                                            )}

                                        </div>

                                    )}



                                    {/* BUBBLE */}



                                    <div

                                        style={{

                                            ...styles.bubble,

                                            ...(isMine

                                                ? styles.myBubble

                                                : styles.otherBubble),

                                        }}

                                    >

                                        {!isMine && (

                                            <div

                                                style={

                                                    styles.senderName

                                                }

                                            >

                                                {message.sender_username ||

                                                    selectedUser?.username ||

                                                    "User"}

                                            </div>

                                        )}



                                        {renderAttachment(

                                            message

                                        )}



                                        {content && (

                                            <div

                                                style={

                                                    styles.messageText

                                                }

                                            >

                                                {

                                                    content

                                                }

                                            </div>

                                        )}



                                        <div

                                            style={{

                                                ...styles.time,

                                                color:

                                                    isMine

                                                        ? "rgba(255,255,255,0.75)"

                                                        : "#999",

                                            }}

                                        >

                                            {message.timestamp

                                                ? new Date(

                                                    message.timestamp

                                                ).toLocaleTimeString(

                                                    [],

                                                    {

                                                        hour: "2-digit",

                                                        minute: "2-digit",

                                                    }

                                                )

                                                : ""}

                                        </div>

                                    </div>



                                    {/* REACTION COUNTS */}



                                    {Object.keys(

                                        reactionCounts

                                    ).length > 0 && (

                                        <div

                                            style={{

                                                ...styles.reactionSummary,

                                                ...(isMine

                                                    ? styles.reactionSummaryMine

                                                    : {}),

                                            }}

                                        >

                                            {Object.entries(

                                                reactionCounts

                                            ).map(

                                                ([

                                                    emoji,

                                                    count,

                                                ]) => (

                                                    <span

                                                        key={

                                                            emoji

                                                        }

                                                        style={

                                                            styles.reactionCount

                                                        }

                                                    >

                                                        {

                                                            emoji

                                                        }



                                                        {count >

                                                            1 &&

                                                            ` ${count}`}

                                                    </span>

                                                )

                                            )}

                                        </div>

                                    )}

                                </div>

                            </div>

                        );

                    }

                )}



                {/* TYPING */}



                {Object.values(

                    typingUsers

                ).some(Boolean) && (

                    <div

                        style={

                            styles.typingWrapper

                        }

                    >

                        <div

                            style={

                                styles.typingBubble

                            }

                        >

                            • • •

                        </div>



                        <span

                            style={

                                styles.typingText

                            }

                        >

                            typing...

                        </span>

                    </div>

                )}



                <div

                    ref={messagesEndRef}

                />

            </div>



            {/* EMOJI PICKER */}



            {showEmojiPicker && (

                <div

                    style={

                        styles.emojiPicker

                    }

                >

                    {MESSAGE_EMOJIS.map(

                        (emoji) => (

                            <button

                                key={emoji}

                                type="button"

                                onClick={() =>

                                    handleEmojiMessage(

                                        emoji

                                    )

                                }

                                style={

                                    styles.emojiButton

                                }

                            >

                                {emoji}

                            </button>

                        )

                    )}

                </div>

            )}



            {/* INPUT */}



            <MessageInput

                onSend={handleSend}

                onUpload={upload}

                sendTyping={handleTyping}

                onEmojiClick={() =>

                    setShowEmojiPicker(

                        (previous) =>

                            !previous

                    )

                }

            />

        </div>

    );

}



// =====================================================

// STYLES

// =====================================================



const styles = {

    container: {

        height: "100%",

        minHeight: "500px",

        display: "flex",

        flexDirection: "column",

        background: "#fff",

        position: "relative",

    },



    header: {

        height: "70px",

        minHeight: "70px",

        display: "flex",

        alignItems: "center",

        gap: "12px",

        padding: "0 20px",

        borderBottom:

            "1px solid #e5e7eb",

        background: "#fff",

    },



    headerAvatarWrapper: {

        width: "44px",

        height: "44px",

        flexShrink: 0,

    },



    headerAvatarImage: {

        width: "44px",

        height: "44px",

        borderRadius: "50%",

        objectFit: "cover",

    },



    headerAvatar: {

        width: "44px",

        height: "44px",

        borderRadius: "50%",

        background: "#f1f5f9",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        fontSize: "22px",

    },



    username: {

        fontWeight: "600",

        fontSize: "15px",

        color: "#111827",

    },



    status: {

        fontSize: "12px",

        color: "#6b7280",

        marginTop: "3px",

    },



    activeDot: {

        color: "#22c55e",

        marginRight: "5px",

        fontSize: "9px",

    },



    messagesArea: {

        flex: 1,

        overflowY: "auto",

        padding: "24px",

        background: "#fafafa",

    },



    messageRow: {

        display: "flex",

        marginBottom: "12px",

    },



    messageContainer: {

        position: "relative",

        maxWidth: "70%",

    },



    bubble: {

        padding: "9px 13px",

        borderRadius: "18px",

        fontSize: "14px",

        lineHeight: "1.45",

        wordBreak: "break-word",

    },



    myBubble: {

        background: "#3797f0",

        color: "#fff",

        borderBottomRightRadius: "5px",

    },



    otherBubble: {

        background: "#efefef",

        color: "#111827",

        borderBottomLeftRadius: "5px",

    },



    senderName: {

        fontWeight: "600",

        fontSize: "12px",

        marginBottom: "5px",

    },



    messageText: {

        whiteSpace: "pre-wrap",

    },



    time: {

        fontSize: "10px",

        marginTop: "4px",

        textAlign: "right",

    },



    image: {

        maxWidth: "280px",

        maxHeight: "350px",

        borderRadius: "12px",

        display: "block",

        objectFit: "cover",

    },



    video: {

        maxWidth: "300px",

        maxHeight: "350px",

        borderRadius: "12px",

        display: "block",

    },



    audio: {

        width: "260px",

        maxWidth: "100%",

        display: "block",

    },



    document: {

        display: "flex",

        alignItems: "center",

        gap: "8px",

        padding: "10px",

        color: "inherit",

        textDecoration: "none",

    },



    reactionTrigger: {

        position: "absolute",

        right: "-35px",

        bottom: "0",

        width: "28px",

        height: "28px",

        border: "none",

        borderRadius: "50%",

        background: "#fff",

        boxShadow:

            "0 2px 8px rgba(0,0,0,0.12)",

        cursor: "pointer",

        fontSize: "15px",

        zIndex: 5,

    },



    reactionMenu: {

        position: "absolute",

        bottom: "34px",

        display: "flex",

        gap: "3px",

        padding: "6px 8px",

        background: "#fff",

        borderRadius: "22px",

        boxShadow:

            "0 4px 18px rgba(0,0,0,0.18)",

        zIndex: 20,

    },



    reactionMenuMine: {

        right: "0",

    },



    reactionMenuOther: {

        left: "0",

    },



    reactionEmojiButton: {

        border: "none",

        background: "transparent",

        cursor: "pointer",

        fontSize: "20px",

        padding: "4px",

        borderRadius: "50%",

    },



    selectedReaction: {

        background: "#e5e7eb",

    },



    reactionSummary: {

        display: "flex",

        gap: "3px",

        marginTop: "-7px",

        marginLeft: "8px",

        position: "relative",

        zIndex: 3,

    },



    reactionSummaryMine: {

        justifyContent: "flex-end",

        marginRight: "8px",

    },



    reactionCount: {

        background: "#fff",

        border:

            "1px solid #e5e7eb",

        borderRadius: "12px",

        padding: "2px 6px",

        fontSize: "12px",

        boxShadow:

            "0 1px 3px rgba(0,0,0,0.08)",

    },



    typingWrapper: {

        display: "flex",

        alignItems: "center",

        gap: "8px",

        marginTop: "5px",

    },



    typingBubble: {

        padding: "8px 12px",

        background: "#efefef",

        borderRadius: "18px",

        color: "#999",

        fontSize: "12px",

    },



    typingText: {

        color: "#999",

        fontSize: "12px",

    },



    empty: {

        height: "100%",

        minHeight: "350px",

        display: "flex",

        flexDirection: "column",

        alignItems: "center",

        justifyContent: "center",

    },



    emptyAvatar: {

        width: "80px",

        height: "80px",

        borderRadius: "50%",

        overflow: "hidden",

        background: "#f1f5f9",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        fontSize: "35px",

        marginBottom: "15px",

    },



    emptyAvatarImage: {

        width: "100%",

        height: "100%",

        objectFit: "cover",

    },



    emptyTitle: {

        margin: 0,

        fontSize: "18px",

    },



    emptyText: {

        color: "#9ca3af",

        fontSize: "13px",

    },



    emojiPicker: {

        position: "absolute",

        bottom: "70px",

        left: "15px",

        width: "310px",

        padding: "10px",

        background: "#fff",

        border:

            "1px solid #e5e7eb",

        borderRadius: "14px",

        boxShadow:

            "0 8px 25px rgba(0,0,0,0.15)",

        display: "grid",

        gridTemplateColumns:

            "repeat(8, 1fr)",

        gap: "4px",

        zIndex: 50,

    },



    emojiButton: {

        border: "none",

        background: "transparent",

        cursor: "pointer",

        fontSize: "22px",

        padding: "5px",

        borderRadius: "8px",

    },

};