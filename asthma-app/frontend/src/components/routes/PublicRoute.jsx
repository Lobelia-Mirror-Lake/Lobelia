import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

// any routes within this route required being logged out
export function PublicRoute() {
  const { user, token } = useAuth();

  if (user && token) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

export default PublicRoute;