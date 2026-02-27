import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoHome = () => {
    if (isAuthenticated) {
      navigate("/");
    } else {
      navigate("/landing");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-pink-400 to-rose-500 shadow-md">
          <Heart className="h-8 w-8 text-yellow-300 fill-yellow-300 opacity-90" />
        </div>

        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-muted-foreground">
          Oops… this page went missing
        </p>

        <button
          onClick={handleGoHome}
          className="inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          Take me home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
