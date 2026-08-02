import PostActions from "./PostActions";
import PostFooter from "./PostFooter";
import PostHeader from "./PostHeader";
import PostImage from "./PostImage";

function PostCard({
  username,
  location,
  image,
  likes,
  caption,
}) {
  return (
    <div className="bg-white border rounded-lg mb-6 overflow-hidden">

      <PostHeader
        username={username}
        location={location}
      />

      <PostImage
        image={image}
      />

      <PostActions likes={likes}/>

      <PostFooter
        username={username}
        likes={likes}
        caption={caption}
      />

    </div>
  );
}

export default PostCard;