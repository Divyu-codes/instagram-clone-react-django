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
    <aside className="h-full w-64 shrink-0 border-r border-yellow-100 bg-[#FFFEF0] p-5 flex flex-col">

      {/* LOGO & APP NAME */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFCB05] text-2xl shadow-lg shadow-yellow-200">
          ⚡
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">PikaChat</h1>
      </div>

      {/* NAVIGATION MENU */}
      <nav className="space-y-2 text-base">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl p-3 transition-all duration-200 ${isActive
                ? "bg-[#FFF9C4] font-bold text-gray-900 shadow-sm"
                : "text-gray-700 hover:bg-yellow-50"
              }`
            }
            onClick={item.path === "/messages" ? markMessagesRead : undefined}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.name}</span>

            {/* UNREAD BADGE */}
            {item.path === "/messages" && unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-[#FFCB05] px-2 py-0.5 text-[10px] font-bold text-black shadow-sm">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* LOGOUT BUTTON */}

      <button
        type="button"
        onClick={handleLogout}
        className="mt-auto w-full rounded-2xl border border-yellow-200 bg-yellow-50 p-3 text-left font-medium text-yellow-800 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200"
      ></button>
    </aside>
  );
}

export default Sidebar;