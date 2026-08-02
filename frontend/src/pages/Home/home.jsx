import Sidebar from "../../components/layout/Sidebar";
import PostCard from "../../components/post/PostCard";

function Home() {
  return (
    <div className="flex">

      <Sidebar />

      <div className="flex-1 p-8 bg-gray-100">

        <PostCard />

      </div>

    </div>
  );
}

export default Home;