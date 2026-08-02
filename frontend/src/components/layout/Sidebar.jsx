import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaSearch,
  FaCompass,
  FaHeart,
  FaUser,
} from "react-icons/fa";

import { MdOutlineOndemandVideo } from "react-icons/md";
import { BiMessageRounded } from "react-icons/bi";

function Sidebar() {
  const menuItems = [
    {
      name: "Home",
      path: "/",
      icon: <FaHome />,
    },
    {
      name: "Search",
      path: "/search",
      icon: <FaSearch />,
    },
    {
      name: "Explore",
      path: "/explore",
      icon: <FaCompass />,
    },
    {
      name: "Reels",
      path: "/reels",
      icon: <MdOutlineOndemandVideo />,
    },
    {
      name: "Messages",
      path: "/messages",
      icon: <BiMessageRounded />,
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: <FaHeart />,
    },
    {
      name: "Profile",
      path: "/profile",
      icon: <FaUser />,
    },
  ];

  return (
    <div className="w-64 h-screen border-r border-gray-300 p-5">
      <h1 className="text-2xl font-bold mb-10">Instagram</h1>

      <ul className="space-y-6 text-lg">

        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg ${isActive ? "bg-gray-200 font-bold" : "hover:bg-gray-100"
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}

      </ul>
    </div>
  );
}

export default Sidebar;