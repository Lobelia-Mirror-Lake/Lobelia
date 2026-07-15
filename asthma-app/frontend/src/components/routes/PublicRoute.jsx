import { Outlet } from "react-router";

// any routes within this route required being logged out
export function PublicRoute() {
  return <Outlet />;
}

export default PublicRoute;