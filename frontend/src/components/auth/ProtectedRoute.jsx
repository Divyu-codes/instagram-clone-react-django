import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getValidAccessToken } from "../../utils/auth";

function ProtectedRoute({ children }) {
  const [allowed, setAllowed] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    getValidAccessToken().then((token) => {
      if (active) setAllowed(Boolean(token));
    });
    return () => { active = false; };
  }, [location.pathname]);

  if (allowed === null) return <div className="min-h-screen bg-gray-100" />;
  if (!allowed) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default ProtectedRoute;
