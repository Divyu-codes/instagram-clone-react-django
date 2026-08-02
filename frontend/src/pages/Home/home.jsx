import Sidebar from "../../components/layout/Sidebar";
import PostCard from "../../components/post/PostCard";
import posts from "../../data/posts";

function Home() {
  return (
    <div className="flex">

      <Sidebar />

      <div className="flex-1 p-8 bg-gray-100">

        {posts.map((post) => (
          <PostCard
            key={post.id}
            username={post.username}
            location={post.location}
            image={post.image}
            likes={post.likes}
            caption={post.caption}
          />
        ))}

      </div>

    </div>
  );
}

export default Home;