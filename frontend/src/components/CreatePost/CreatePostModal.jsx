import { useState } from "react";
import { authenticatedFetch } from "../../utils/auth";


function CreatePostModal({ onClose, onPostCreated }) {

  // =========================
  // STATE
  // =========================

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // =========================
  // IMAGE SELECT
  // =========================

  const handleImageChange = (event) => {

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }


    // Check image type
    if (!file.type.startsWith("image/")) {

      setError("Please select a valid image.");

      return;
    }


    // Optional size check: 5 MB
    if (file.size > 5 * 1024 * 1024) {

      setError("Image size must be less than 5 MB.");

      return;
    }


    setError("");

    // Actual file
    setImage(file);


    // Preview
    const imageUrl = URL.createObjectURL(file);

    setPreview(imageUrl);
  };


  // =========================
  // CREATE POST
  // =========================

  const handleSubmit = async (event) => {

    event.preventDefault();


    // Image required
    if (!image) {

      setError("Please select an image.");

      return;
    }


    try {

      setLoading(true);
      setError("");


      // =========================
      // FORM DATA
      // =========================

      const formData = new FormData();


      // IMPORTANT:
      // Actual image file send ho rahi hai
      formData.append(
        "image",
        image
      );


      // Caption
      formData.append(
        "caption",
        caption
      );


      // Location
      formData.append(
        "location",
        location
      );


      // =========================
      // API REQUEST
      // =========================

      const response = await authenticatedFetch(
        "http://127.0.0.1:8000/api/posts/",
        {
          method: "POST",
          body: formData,
        }
      );


      // =========================
      // RESPONSE
      // =========================

      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          data.error ||
          "Failed to create post."
        );
      }


      // =========================
      // SEND NEW POST TO HOME
      // =========================

      onPostCreated(data);


    } catch (error) {

      console.error(
        "Create post error:",
        error
      );

      setError(
        error.message ||
        "Something went wrong."
      );


    } finally {

      setLoading(false);

    }
  };


  // =========================
  // CLOSE MODAL
  // =========================

  const handleClose = () => {

    // Preview URL cleanup
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    onClose();
  };


  return (

    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/60
        px-4
      "
    >

      {/* =========================
          MODAL
      ========================= */}

      <div
        className="
          w-full
          max-w-md
          rounded-xl
          bg-white
          p-6
          shadow-xl
        "
      >


        {/* =========================
            HEADER
        ========================= */}

        <div
          className="
            mb-5
            flex
            items-center
            justify-between
          "
        >

          <h2 className="text-xl font-bold text-gray-800">
            Create Post
          </h2>


          <button
            type="button"
            onClick={handleClose}
            className="
              text-xl
              text-gray-500
              hover:text-gray-800
            "
          >
            ✕
          </button>

        </div>


        {/* =========================
            ERROR
        ========================= */}

        {error && (

          <div
            className="
              mb-4
              rounded-lg
              bg-red-100
              px-4
              py-3
              text-sm
              text-red-600
            "
          >
            {error}
          </div>

        )}


        {/* =========================
            FORM
        ========================= */}

        <form onSubmit={handleSubmit}>


          {/* =========================
              IMAGE INPUT
          ========================= */}

          <div className="mb-4">

            <label
              htmlFor="post-image"
              className="
                mb-2
                block
                font-medium
                text-gray-700
              "
            >
              Select Image
            </label>


            <input
              id="post-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="
                w-full
                cursor-pointer
                rounded-lg
                border
                border-gray-300
                p-2
              "
            />

          </div>


          {/* =========================
              IMAGE PREVIEW
          ========================= */}

          {preview && (

            <div className="mb-4">

              <img
                src={preview}
                alt="Post preview"
                className="
                  h-64
                  w-full
                  rounded-lg
                  object-cover
                "
              />

            </div>

          )}


          {/* =========================
              CAPTION
          ========================= */}

          <div className="mb-4">

            <label
              htmlFor="post-caption"
              className="
                mb-2
                block
                font-medium
                text-gray-700
              "
            >
              Caption
            </label>


            <textarea
              id="post-caption"
              value={caption}
              onChange={(event) =>
                setCaption(event.target.value)
              }
              placeholder="Write a caption..."
              rows="3"
              className="
                w-full
                resize-none
                rounded-lg
                border
                border-gray-300
                p-3
                outline-none
                focus:border-blue-500
              "
            />

          </div>


          {/* =========================
              LOCATION
          ========================= */}

          <div className="mb-5">

            <label
              htmlFor="post-location"
              className="
                mb-2
                block
                font-medium
                text-gray-700
              "
            >
              Location
            </label>


            <input
              id="post-location"
              type="text"
              value={location}
              onChange={(event) =>
                setLocation(event.target.value)
              }
              placeholder="Add location"
              className="
                w-full
                rounded-lg
                border
                border-gray-300
                p-3
                outline-none
                focus:border-blue-500
              "
            />

          </div>


          {/* =========================
              BUTTONS
          ========================= */}

          <div
            className="
              flex
              gap-3
            "
          >

            {/* Cancel */}

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="
                flex-1
                rounded-lg
                border
                border-gray-300
                py-3
                font-medium
                text-gray-700
                hover:bg-gray-100
                disabled:opacity-50
              "
            >
              Cancel
            </button>


            {/* Create Post */}

            <button
              type="submit"
              disabled={loading || !image}
              className="
                flex-1
                rounded-lg
                bg-blue-500
                py-3
                font-medium
                text-white
                hover:bg-blue-600
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >

              {loading
                ? "Creating..."
                : "Create Post"
              }

            </button>

          </div>

        </form>

      </div>

    </div>

  );
}


export default CreatePostModal;