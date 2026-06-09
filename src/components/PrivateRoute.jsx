import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    // not logged in → redirect to signin
    return <Navigate to="/signin" replace />;
  }

  return children;
};

export default PrivateRoute;
