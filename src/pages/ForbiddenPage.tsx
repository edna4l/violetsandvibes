import React from "react";
import { Link } from "react-router-dom";

const ForbiddenPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <h1 className="text-5xl font-bold text-red-600 mb-4">403</h1>
      <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
      <p className="mb-6 text-gray-600">
        You don’t have permission to view this page.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition"
      >
        Go Home
      </Link>
    </div>
  );
};

export default ForbiddenPage;
