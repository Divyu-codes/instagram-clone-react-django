import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getValidAccessToken } from "../../utils/auth";

function ProtectedRoute({ children }) {
  const [allowed, setAllowed] = useState(() => Boolean(localStorage.getItem("access_token")));
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("access_token");
    if (active) setAllowed(Boolean(token));

    getValidAccessToken().then((validToken) => {
      if (active) setAllowed(Boolean(validToken));
    });
    return () => { active = false; };
  }, [location.pathname]);

  if (!allowed) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default ProtectedRoute;
