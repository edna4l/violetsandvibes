import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalLayout } from "@/components/GlobalLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
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
            <Route path="/matches" element={<ProtectedRoute requireProfile><GlobalLayout><MatchesPage /></GlobalLayout></ProtectedRoute>} />
            <Route path="/social" element={<ProtectedRoute requireProfile><GlobalLayout><SocialPage /></GlobalLayout></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute requireProfile><GlobalLayout><ChatPage /></GlobalLayout></ProtectedRoute>} />
            <Route path="/video" element={<ProtectedRoute><GlobalLayout><VideoPage /></GlobalLayout></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><GlobalLayout><EventsPage /></GlobalLayout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><GlobalLayout><NotificationsPage /></GlobalLayout></ProtectedRoute>} />
            <Route path="/verification" element={<ProtectedRoute><GlobalLayout><VerificationPage /></GlobalLayout></ProtectedRoute>} />
            <Route path="/filters" element={<ProtectedRoute><GlobalLayout><FiltersPage /></GlobalLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><GlobalLayout><ProfilePage /></GlobalLayout></ProtectedRoute>} />
            <Route path="/profile/:id" element={<GlobalLayout><ProfilePage /></GlobalLayout>} />
            <Route path="/create-new-profile" element={<ProtectedRoute><ProfileCreationFlow /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<GlobalLayout><ProfileEditPage /></GlobalLayout>} />
            <Route path="/admin" element={<GlobalLayout><AdminPage /></GlobalLayout>} />
            <Route path="/subscription" element={<GlobalLayout><SubscriptionPage /></GlobalLayout>} />
            <Route path="/settings" element={<ProtectedRoute><GlobalLayout><SettingsPage /></GlobalLayout></ProtectedRoute>} />
            <Route path="*" element={<GlobalLayout><NotFound /></GlobalLayout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
