import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import Profile from "./pages/Profile/Profile";
import Explore from "./pages/Explore/Explore";
import Messages from "./pages/Messages/Messages";
import Reels from "./pages/Reels/Reels";
import NotFound from "./pages/NotFound/NotFound";
function App() {
  return (
    <Routes>

      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/signup" element={<Signup />} />

      <Route path="/profile" element={<Profile />} />

      <Route path="/explore" element={<Explore />} />

      <Route path="/messages" element={<Messages />} />

      <Route path="/reels" element={<Reels />} />

      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default App;