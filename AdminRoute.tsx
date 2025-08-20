import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    // Not logged in → send to signin
    return <Navigate to="/signin" replace />;
  }

  if (user.role !== "admin") {
    // Logged in but not admin → send to home (or 403 page if you want)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
