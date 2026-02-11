import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useProfileStatus } from "@/hooks/useProfileStatus";

type Props = {
  children: React.ReactNode;
};

export const ProfileGate: React.FC<Props> = ({ children }) => {
  const { status } = useProfileStatus();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center">
        <div className="text-white/80">Checking your profile…</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center">
        <div className="text-white/80">
          Something went wrong checking your profile. Please refresh.
        </div>
      </div>
    );
  }

  if (status === "incomplete") {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/create-new-profile?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
};
