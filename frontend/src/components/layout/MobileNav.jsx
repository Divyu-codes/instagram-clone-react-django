import { NavLink } from "react-router-dom";
import { FaHome, FaSearch, FaHeart, FaUser } from "react-icons/fa";
import { BiMessageRounded } from "react-icons/bi";

export default function MobileNav() {
  const menuItems = [
    { path: "/", icon: <FaHome /> },
    { path: "/search", icon: <FaSearch /> },
    { path: "/messages", icon: <BiMessageRounded /> },
    { path: "/notifications", icon: <FaHeart /> },
    { path: "/profile", icon: <FaUser /> },
  ];

  return (
    // md:hidden ka matlab ye sirf mobile par dikhega, laptop par nahi
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FFFEF0] border-t border-yellow-200 flex justify-around items-center py-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `text-2xl transition-transform duration-200 ${
              isActive 
                ? "text-[#FFCB05] scale-110 drop-shadow-md" 
                : "text-gray-500 hover:text-gray-700"
            }`
          }
        >
          {item.icon}
        </NavLink>
      ))}
    </nav>
  );
}