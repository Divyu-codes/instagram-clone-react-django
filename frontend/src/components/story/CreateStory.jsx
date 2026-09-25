import { useState } from "react";
import { authenticatedFetch } from "../../utils/auth";

const BACKEND_HOST = "http://127.0.0.1:8000";

function CreateStory({
  onStoryCreated,
  onClose,
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!image && !video && !text.trim()) {
      setError("Please add an image, video, or text.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();

      if (image) {
        formData.append("image", image);
      }

      if (video) {
        formData.append("video", video);
      }

      if (text.trim()) {
        formData.append("text", text.trim());
      }

      const response = await authenticatedFetch(
        `${BACKEND_HOST}/api/stories/create/`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      console.log("CREATE STORY RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          data?.message ||
          JSON.stringify(data) ||
          "Failed to create story"
        );
      }

      onStoryCreated?.(data);
    } catch (error) {
      console.error("Create story error:", error);
      setError(error.message || "Failed to create story");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            Create Story
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-gray-500"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">
              Image
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                setImage(event.target.files?.[0] || null);
                setVideo(null);
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Video
            </label>

            <input
              type="file"
              accept="video/*"
              onChange={(event) => {
                setVideo(event.target.files?.[0] || null);
                setImage(null);
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Text
            </label>

            <textarea
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              placeholder="Write something..."
              rows={4}
              className="w-full rounded-lg border p-3 outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-100 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Posting..." : "Share Story"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateStory;