import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import BrandPrideCard from "@/components/BrandPrideCard";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="page-calm min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <BrandPrideCard
          title="404"
          subtitle="Page not found"
          points={["Women-centered", "Inclusive", "Safety-first"]}
          description="That route does not exist. Jump back to the homepage."
          cta={
            <Button asChild className="btn-pride-celebrate">
              <Link to="/">Return Home</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default NotFound;
