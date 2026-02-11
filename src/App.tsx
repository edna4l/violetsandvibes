import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalLayout } from "@/components/GlobalLayout";
import { AuthGate } from "@/components/AuthGate";
import Index from "./pages/Index";
import HeroesPage from "./pages/HeroesPage";
import SignInPage from "./pages/SignInPage";
import NotFound from "./pages/NotFound";

import MatchesPage from "./pages/MatchesPage";
import SocialPage from "./pages/SocialPage";
import ChatPage from "./pages/ChatPage";
import VideoPage from "./pages/VideoPage";
import EventsPage from "./pages/EventsPage";
import NotificationsPage from "./pages/NotificationsPage";
import VerificationPage from "./pages/VerificationPage";
import FiltersPage from "./pages/FiltersPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import ProfileCreationFlow from "@/components/ProfileCreationFlow";
import ProfileEditPage from "./pages/ProfileEditPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient();

const RedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");

    if (redirect && redirect.startsWith("/")) {
      navigate(redirect, { replace: true });
    }
  }, [location.search, navigate]);

  return null;
};

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RedirectHandler />
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/" element={<GlobalLayout><Index /></GlobalLayout>} />
            <Route path="/heroes" element={<GlobalLayout><HeroesPage /></GlobalLayout>} />
            <Route
              path="/matches"
              element={
                <AuthGate>
                  <GlobalLayout><MatchesPage /></GlobalLayout>
                </AuthGate>
              }
            />
            <Route path="/social" element={<AuthGate><GlobalLayout><SocialPage /></GlobalLayout></AuthGate>} />
            <Route
              path="/chat"
              element={
                <AuthGate>
                  <GlobalLayout><ChatPage /></GlobalLayout>
                </AuthGate>
              }
            />
            <Route path="/video" element={<AuthGate><GlobalLayout><VideoPage /></GlobalLayout></AuthGate>} />
            <Route path="/events" element={<AuthGate><GlobalLayout><EventsPage /></GlobalLayout></AuthGate>} />
            <Route path="/notifications" element={<AuthGate><GlobalLayout><NotificationsPage /></GlobalLayout></AuthGate>} />
            <Route path="/verification" element={<AuthGate><GlobalLayout><VerificationPage /></GlobalLayout></AuthGate>} />
            <Route path="/filters" element={<AuthGate><GlobalLayout><FiltersPage /></GlobalLayout></AuthGate>} />
            <Route
              path="/profile"
              element={
                <AuthGate>
                  <GlobalLayout><ProfilePage /></GlobalLayout>
                </AuthGate>
              }
            />
            <Route path="/profile/:id" element={<AuthGate><GlobalLayout><ProfilePage /></GlobalLayout></AuthGate>} />
            <Route
              path="/create-new-profile"
              element={
                <AuthGate>
                  <ProfileCreationFlow />
                </AuthGate>
              }
            />
            <Route path="/edit-profile" element={<AuthGate><GlobalLayout><ProfileEditPage /></GlobalLayout></AuthGate>} />
            <Route path="/admin" element={<AuthGate><GlobalLayout><AdminPage /></GlobalLayout></AuthGate>} />
            <Route path="/subscription" element={<AuthGate><GlobalLayout><SubscriptionPage /></GlobalLayout></AuthGate>} />
            <Route path="/settings" element={<AuthGate><GlobalLayout><SettingsPage /></GlobalLayout></AuthGate>} />
            <Route path="*" element={<GlobalLayout><NotFound /></GlobalLayout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
