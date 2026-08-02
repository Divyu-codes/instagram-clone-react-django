import Sidebar from "../../components/layout/Sidebar";

function Home() {
  return (
    <div className="flex">
      <Sidebar />

      <div className="p-8">
        <h1 className="text-3xl font-bold">Home Page</h1>
      </div>
    </div>
  );
}

export default Home;