import Postaction from "./PostActions";
import PostFooter from "./PostFooter";
import PostHeader from "./PostHeader";
import PostImage from "./PostImage";

function PostCard() {
  return (
    <div className="bg-white border rounded-lg mb-6 overflow-hidden">

      <PostHeader />

      <PostImage />

      <PostActions />

      <PostFooter />

    </div>
  );
}