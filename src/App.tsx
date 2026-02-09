import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalLayout } from "@/components/GlobalLayout";
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
            <Route path="/matches" element={<GlobalLayout><MatchesPage /></GlobalLayout>} />
            <Route path="/social" element={<GlobalLayout><SocialPage /></GlobalLayout>} />
            <Route path="/chat" element={<GlobalLayout><ChatPage /></GlobalLayout>} />
            <Route path="/video" element={<GlobalLayout><VideoPage /></GlobalLayout>} />
            <Route path="/events" element={<GlobalLayout><EventsPage /></GlobalLayout>} />
            <Route path="/notifications" element={<GlobalLayout><NotificationsPage /></GlobalLayout>} />
            <Route path="/verification" element={<GlobalLayout><VerificationPage /></GlobalLayout>} />
            <Route path="/filters" element={<GlobalLayout><FiltersPage /></GlobalLayout>} />
            <Route path="/profile" element={<GlobalLayout><ProfilePage /></GlobalLayout>} />
            <Route path="/profile/:id" element={<GlobalLayout><ProfilePage /></GlobalLayout>} />
            <Route path="/create-new-profile" element={<GlobalLayout><ProfileEditPage /></GlobalLayout>} />
            <Route path="/edit-profile" element={<GlobalLayout><ProfileEditPage /></GlobalLayout>} />
            <Route path="/admin" element={<GlobalLayout><AdminPage /></GlobalLayout>} />
            <Route path="/subscription" element={<GlobalLayout><SubscriptionPage /></GlobalLayout>} />
            <Route path="/settings" element={<GlobalLayout><SettingsPage /></GlobalLayout>} />
            <Route path="*" element={<GlobalLayout><NotFound /></GlobalLayout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
