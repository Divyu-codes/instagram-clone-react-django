import React, {
    useEffect,
    useRef,
    useState,
} from "react";


export default function MessageInput({
    onSend,
    onUpload,
    sendTyping,
    onEmojiClick,
}) {

    const [text, setText] =
        useState("");

    const [recording, setRecording] =
        useState(false);

    const [uploading, setUploading] =
        useState(false);


    const fileRef =
        useRef(null);

    const recorderRef =
        useRef(null);

    const mediaStreamRef =
        useRef(null);

    const chunksRef =
        useRef([]);


    // =====================================================
    // CLEANUP
    // =====================================================

    useEffect(() => {

        return () => {

            if (
                recorderRef.current &&
                recorderRef.current.state !==
                    "inactive"
            ) {

                recorderRef.current.stop();
            }


            if (
                mediaStreamRef.current
            ) {

                mediaStreamRef.current
                    .getTracks()
                    .forEach(
                        (track) =>
                            track.stop()
                    );
            }
        };

    }, []);


    // =====================================================
    // SEND TEXT
    // =====================================================

    const sendText =
        () => {

            const cleanText =
                text.trim();


            if (!cleanText) {
                return;
            }


            const success =
                onSend({

                    message:
                        cleanText,

                    message_type:
                        "text",
                });


            if (
                success !== false
            ) {

                setText("");

                sendTyping?.(
                    false
                );
            }
        };


    // =====================================================
    // ENTER
    // =====================================================

    const handleKeyDown =
        (event) => {

            if (
                event.key ===
                "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendText();
            }
        };


    // =====================================================
    // FILE TYPE
    // =====================================================

    const getMessageType =
        (file) => {

            if (
                file.type.startsWith(
                    "image/"
                )
            ) {

                return "image";
            }


            if (
                file.type.startsWith(
                    "video/"
                )
            ) {

                return "video";
            }


            if (
                file.type.startsWith(
                    "audio/"
                )
            ) {

                return "voice";
            }


            return "document";
        };


    // =====================================================
    // FILE UPLOAD
    // =====================================================

    const handleFile =
        async (event) => {

            const file =
                event.target.files?.[0];


            if (!file) {
                return;
            }


            try {

                setUploading(
                    true
                );


                const data =
                    await onUpload(
                        file
                    );


                if (!data) {

                    return;
                }


                const messageType =
                    getMessageType(
                        file
                    );


                onSend({

                    message: "",

                    message_type:
                        messageType,

                    attachment_id:
                        data.id,

                    attachment_url:
                        data.url,
                });


            } catch (error) {

                console.error(
                    "File upload error:",
                    error
                );

            } finally {

                setUploading(
                    false
                );


                if (
                    fileRef.current
                ) {

                    fileRef.current.value =
                        "";
                }
            }
        };


    // =====================================================
    // START RECORDING
    // =====================================================

    const startRecording =
        async () => {

            try {

                if (
                    !navigator.mediaDevices ||
                    !navigator
                        .mediaDevices
                        .getUserMedia
                ) {

                    alert(
                        "Your browser does not support microphone."
                    );

                    return;
                }


                const stream =
                    await navigator
                        .mediaDevices
                        .getUserMedia({
                            audio: true,
                        });


                mediaStreamRef.current =
                    stream;


                let mimeType =
                    "audio/webm";


                if (
                    MediaRecorder.isTypeSupported(
                        "audio/webm;codecs=opus"
                    )
                ) {

                    mimeType =
                        "audio/webm;codecs=opus";

                } else if (
                    MediaRecorder.isTypeSupported(
                        "audio/webm"
                    )
                ) {

                    mimeType =
                        "audio/webm";

                } else if (
                    MediaRecorder.isTypeSupported(
                        "audio/ogg;codecs=opus"
                    )
                ) {

                    mimeType =
                        "audio/ogg;codecs=opus";
                }


                const recorder =
                    new MediaRecorder(
                        stream,
                        {
                            mimeType,
                        }
                    );


                recorderRef.current =
                    recorder;


                chunksRef.current =
                    [];


                recorder.ondataavailable =
                    (event) => {

                        if (
                            event.data &&
                            event.data.size >
                                0
                        ) {

                            chunksRef.current.push(
                                event.data
                            );
                        }
                    };


                recorder.onstop =
                    async () => {

                        try {

                            const blob =
                                new Blob(
                                    chunksRef.current,
                                    {
                                        type:
                                            mimeType,
                                    }
                                );


                            if (
                                blob.size ===
                                0
                            ) {

                                return;
                            }


                            const extension =
                                mimeType.includes(
                                    "ogg"
                                )
                                    ? "ogg"
                                    : "webm";


                            const file =
                                new File(
                                    [blob],
                                    `voice_${Date.now()}.${extension}`,
                                    {
                                        type:
                                            mimeType,
                                    }
                                );


                            setUploading(
                                true
                            );


                            const data =
                                await onUpload(
                                    file
                                );


                            if (
                                data
                            ) {

                                onSend({

                                    message:
                                        "",

                                    message_type:
                                        "voice",

                                    attachment_id:
                                        data.id,

                                    attachment_url:
                                        data.url,
                                });
                            }

                        } catch (error) {

                            console.error(
                                "Voice error:",
                                error
                            );

                        } finally {

                            setUploading(
                                false
                            );


                            if (
                                mediaStreamRef.current
                            ) {

                                mediaStreamRef.current
                                    .getTracks()
                                    .forEach(
                                        (
                                            track
                                        ) =>
                                            track.stop()
                                    );

                                mediaStreamRef.current =
                                    null;
                            }
                        }
                    };


                recorder.start();

                setRecording(
                    true
                );


            } catch (error) {

                console.error(
                    "Microphone error:",
                    error
                );


                if (
                    error.name ===
                    "NotAllowedError"
                ) {

                    alert(
                        "Microphone permission denied. Browser settings se microphone Allow karo."
                    );

                } else {

                    alert(
                        "Microphone start nahi ho paya."
                    );
                }
            }
        };


    // =====================================================
    // STOP RECORDING
    // =====================================================

    const stopRecording =
        () => {

            const recorder =
                recorderRef.current;


            if (
                recorder &&
                recorder.state !==
                    "inactive"
            ) {

                recorder.stop();
            }


            setRecording(
                false
            );


            sendTyping?.(
                false
            );
        };


    // =====================================================
    // UI
    // =====================================================

    return (

        <div
            style={
                styles.wrapper
            }
        >

            {/* EMOJI */}

            <button
                type="button"
                onClick={
                    onEmojiClick
                }
                disabled={
                    uploading ||
                    recording
                }
                style={
                    styles.iconButton
                }
                title="Emoji"
            >
                😊
            </button>


            {/* ATTACHMENT */}

            <label
                style={
                    styles.iconButton
                }
                title="Attach"
            >

                📎

                <input
                    ref={fileRef}
                    type="file"
                    onChange={
                        handleFile
                    }
                    disabled={
                        uploading ||
                        recording
                    }
                    accept="
                        image/*,
                        video/*,
                        audio/*,
                        .pdf,
                        .doc,
                        .docx,
                        .txt,
                        .zip,
                        .rar
                    "
                    style={
                        styles.hiddenInput
                    }
                />

            </label>


            {/* INPUT */}

            <div
                style={
                    styles.inputWrapper
                }
            >

                <input
                    type="text"
                    value={text}
                    disabled={
                        uploading ||
                        recording
                    }
                    onChange={(
                        event
                    ) => {

                        const value =
                            event.target.value;

                        setText(
                            value
                        );

                        sendTyping?.(
                            value.length >
                                0
                        );
                    }}
                    onKeyDown={
                        handleKeyDown
                    }
                    placeholder={
                        recording
                            ? "Recording..."
                            : uploading
                            ? "Uploading..."
                            : "Message..."
                    }
                    style={
                        styles.input
                    }
                />

            </div>


            {/* MIC */}

            {!recording ? (

                <button
                    type="button"
                    onClick={
                        startRecording
                    }
                    disabled={
                        uploading
                    }
                    style={
                        styles.iconButton
                    }
                    title="Voice message"
                >
                    🎙️
                </button>

            ) : (

                <button
                    type="button"
                    onClick={
                        stopRecording
                    }
                    style={
                        styles.stopButton
                    }
                    title="Stop recording"
                >
                    ⏹
                </button>

            )}


            {/* SEND */}

            <button
                type="button"
                onClick={
                    sendText
                }
                disabled={
                    !text.trim() ||
                    uploading ||
                    recording
                }
                style={{
                    ...styles.sendButton,
                    opacity:
                        !text.trim() ||
                        uploading ||
                        recording
                            ? 0.45
                            : 1,
                }}
            >
                ➤
            </button>

        </div>
    );
}


// =====================================================
// STYLES
// =====================================================

const styles = {

    wrapper: {
        display: "flex",
        alignItems: "center",
        gap: "7px",
        padding: "11px 14px",
        borderTop:
            "1px solid #e5e7eb",
        background: "#fff",
    },

    inputWrapper: {
        flex: 1,
    },

    input: {
        width: "100%",
        height: "42px",
        boxSizing: "border-box",
        border:
            "1px solid #d1d5db",
        borderRadius: "22px",
        padding:
            "0 16px",
        outline: "none",
        fontSize: "14px",
        background: "#f9fafb",
    },

    iconButton: {
        width: "40px",
        height: "40px",
        border: "none",
        borderRadius: "50%",
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: "19px",
        flexShrink: 0,
    },

    stopButton: {
        width: "40px",
        height: "40px",
        border: "none",
        borderRadius: "50%",
        background: "#fee2e2",
        color: "#dc2626",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: "17px",
        flexShrink: 0,
    },

    sendButton: {
        width: "42px",
        height: "42px",
        border: "none",
        borderRadius: "50%",
        background: "#3797f0",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: "19px",
        flexShrink: 0,
    },

    hiddenInput: {
        display: "none",
    },
};