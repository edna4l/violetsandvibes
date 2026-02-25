import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalLayout } from "@/components/GlobalLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProfileGate } from "@/components/ProfileGate";
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
import LandingPreviewPage from "./pages/LandingPreviewPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/landing-preview" element={<LandingPreviewPage />} />
            <Route path="/" element={<HeroesPage />} />
            <Route path="/discover" element={<GlobalLayout><Index /></GlobalLayout>} />
            <Route path="/heroes" element={<HeroesPage />} />
            <Route
              path="/matches"
              element={
                <ProtectedRoute>
                  <ProfileGate>
                    <GlobalLayout><MatchesPage /></GlobalLayout>
                  </ProfileGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/social"
              element={
                <ProtectedRoute>
                  <ProfileGate>
                    <GlobalLayout><SocialPage /></GlobalLayout>
                  </ProfileGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ProfileGate>
                    <GlobalLayout><ChatPage /></GlobalLayout>
                  </ProfileGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/video"
              element={
                <ProtectedRoute>
                  <ProfileGate>
                    <GlobalLayout><VideoPage /></GlobalLayout>
                  </ProfileGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <ProfileGate>
                    <GlobalLayout><EventsPage /></GlobalLayout>
                  </ProfileGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <ProfileGate>
                    <GlobalLayout><NotificationsPage /></GlobalLayout>
                  </ProfileGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification"
              element={
                <ProtectedRoute>
                  <GlobalLayout><VerificationPage /></GlobalLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/filters"
              element={
                <ProtectedRoute>
                  <ProfileGate>
                    <GlobalLayout><FiltersPage /></GlobalLayout>
                  </ProfileGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <GlobalLayout><ProfilePage /></GlobalLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:id"
              element={
                <ProtectedRoute>
                  <GlobalLayout><ProfilePage /></GlobalLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-new-profile"
              element={
                <ProtectedRoute>
                  <ProfileCreationFlow />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-profile"
              element={
                <ProtectedRoute>
                  <GlobalLayout><ProfileEditPage /></GlobalLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <GlobalLayout><AdminPage /></GlobalLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <GlobalLayout><SubscriptionPage /></GlobalLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <ProfileGate>
                    <GlobalLayout><SettingsPage /></GlobalLayout>
                  </ProfileGate>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<GlobalLayout><NotFound /></GlobalLayout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
