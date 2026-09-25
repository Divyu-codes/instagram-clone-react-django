import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaHome, FaSearch, FaHeart, FaUser } from "react-icons/fa";
import { BiMessageRounded } from "react-icons/bi";
import { logout } from "../../utils/auth";

function Sidebar() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(
    () => Number(localStorage.getItem("unread_message_count")) || 0
  );

  useEffect(() => {
    const updateUnreadCount = (event) => {
      setUnreadCount(
        Number(event.detail?.total ?? event.detail ?? localStorage.getItem("unread_message_count")) || 0
      );
    };
    window.addEventListener("unread-message-count", updateUnreadCount);
    return () => window.removeEventListener("unread-message-count", updateUnreadCount);
  }, []);

  const markMessagesRead = () => {
    localStorage.setItem("unread_message_count", "0");
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const menuItems = [
    { name: "Home", path: "/", icon: <FaHome /> },
    { name: "Search", path: "/search", icon: <FaSearch /> },
    { name: "Messages", path: "/messages", icon: <BiMessageRounded /> },
    { name: "Notifications", path: "/notifications", icon: <FaHeart /> },
    { name: "Profile", path: "/profile", icon: <FaUser /> },
  ];

  return (
    <aside className="h-screen w-64 shrink-0 border-r border-gray-200 bg-white p-5 shadow-[0_0_35px_rgba(15,23,42,0.03)]">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-400 text-lg font-bold text-white shadow-lg shadow-pink-200">
          I
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Instagram</h1>
      </div>

      <nav className="space-y-2 text-base">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl p-3 transition ${
                isActive ? "bg-gray-100 font-semibold text-black shadow-sm" : "text-gray-700 hover:bg-gray-50"
              }`
            }
            onClick={item.path === "/messages" ? markMessagesRead : undefined}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.name}</span>
            {item.path === "/messages" && unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-8 w-full rounded-2xl border border-red-200 bg-red-50 p-3 text-left font-medium text-red-600 transition hover:bg-red-100"
      >
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
