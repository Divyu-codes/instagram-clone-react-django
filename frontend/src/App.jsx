import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home/home";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import Profile from "./pages/Profile/profile";
import Messages from "./pages/Messages/messages";
import NotFound from "./pages/NotFound/notfound";
import Search from "./pages/search/Search";
import NotificationsPage from "./pages/Notifications/NotificationsPage";

import Stories from "./components/story/Stories";
import Notification from "./components/Notification/Notification";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Sidebar from "./components/layout/Sidebar";
import MobileNav from "./components/layout/MobileNav"; // ✅ Already imported

import Security from "./pages/Auth/Security";
import ResetPassword from "./pages/Auth/ResetPassword";
import VerifyEmail from "./pages/Auth/VerifyEmail";

function AuthenticatedLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#FFFEF0]">
      <Sidebar />
      
      {/* CHANGE 1: pb-20 md:pb-0 add kiya hai taaki mobile par niche jagah bane */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>

      {/* CHANGE 2: MobileNav ko yahan add kiya hai (Sirf authenticated users ke liye) */}
      <MobileNav />
    </div>
  );
}

function App() {
  const hasAccessToken = () =>
    typeof window !== "undefined" && Boolean(window.localStorage.getItem("access_token"));

  const protectedPage = (page) => (
    <ProtectedRoute>
      <AuthenticatedLayout>{page}</AuthenticatedLayout>
    </ProtectedRoute>
  );

  return (
    <>
      <Notification />

      <Routes>
        <Route path="/" element={hasAccessToken() ? protectedPage(<Home />) : <Navigate to="/login" replace />} />
        <Route path="/login" element={hasAccessToken() ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={hasAccessToken() ? <Navigate to="/" replace /> : <Signup />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/security" element={protectedPage(<Security />)} />
        <Route path="/profile" element={protectedPage(<Profile />)} />
        <Route path="/profile/:id" element={protectedPage(<Profile />)} />
        <Route path="/messages" element={protectedPage(<Messages />)} />
        <Route path="/search" element={protectedPage(<Search />)} />
        <Route path="/stories" element={protectedPage(<Stories />)} />
        <Route path="/notifications" element={protectedPage(<NotificationsPage />)} />
        <Route path="*" element={protectedPage(<NotFound />)} />
      </Routes>
    </>
  );
}

export default App;