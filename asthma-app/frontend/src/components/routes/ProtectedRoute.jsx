import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

// any routes within this route require being logged in
function ProtectedRoute() {
  const { user, token } = useAuth();

  if (!user || !token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;