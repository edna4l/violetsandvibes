export default App;
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import { GlobalLayout } from "./components/GlobalLayout";

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
import UserProfilesListPage from "./pages/UserProfilesListPage";

import PrivateRoute from "./components/PrivateRoute";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<GlobalLayout><Index /></GlobalLayout>} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/verification" element={<GlobalLayout><VerificationPage /></GlobalLayout>} />

            {/* Protected pages */}
            <Route
              path="/heroes"
              element={<PrivateRoute><GlobalLayout><HeroesPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/matches"
              element={<PrivateRoute><GlobalLayout><MatchesPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/social"
              element={<PrivateRoute><GlobalLayout><SocialPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/chat"
              element={<PrivateRoute><GlobalLayout><ChatPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/video"
              element={<PrivateRoute><GlobalLayout><VideoPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/events"
              element={<PrivateRoute><GlobalLayout><EventsPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/notifications"
              element={<PrivateRoute><GlobalLayout><NotificationsPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/filters"
              element={<PrivateRoute><GlobalLayout><FiltersPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/profile"
              element={<PrivateRoute><GlobalLayout><ProfilePage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/profile/:id"
              element={<PrivateRoute><GlobalLayout><ProfilePage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/create-new-profile"
              element={<PrivateRoute><GlobalLayout><ProfileEditPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/edit-profile"
              element={<PrivateRoute><GlobalLayout><ProfileEditPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/admin"
              element={<PrivateRoute><GlobalLayout><AdminPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/subscription"
              element={<PrivateRoute><GlobalLayout><SubscriptionPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/settings"
              element={<PrivateRoute><GlobalLayout><SettingsPage /></GlobalLayout></PrivateRoute>}
            />
            <Route
              path="/profiles"
              element={<PrivateRoute><GlobalLayout><UserProfilesListPage /></GlobalLayout></PrivateRoute>}
            />

            {/* 404 */}
            <Route path="*" element={<GlobalLayout><NotFound /></GlobalLayout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
