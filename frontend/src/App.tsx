import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import LandingLayout from "@/layouts/LandingLayout";

// Pages
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Calendar from "@/pages/Calendar";
import Groups from "@/pages/Groups";
import Messages from "@/pages/Messages";
import Tasks from "@/pages/Tasks";
import Notes from "@/pages/Notes";
import Events from "@/pages/Events";
import Invitations from "@/pages/Invitations";
import Settings from "@/pages/Settings";
import Whiteboard from "@/pages/Whiteboard";

import { getRouteKeyFromPath } from "@/routes";

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route element={<LandingLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          {/* Chặn truy cập các trang nội bộ khi chưa login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  }

  const currentPageName = getRouteKeyFromPath(location.pathname);

  return (
    <MainLayout currentPageName={currentPageName}>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/events" element={<Events />} />
        <Route path="/whiteboard" element={<Whiteboard />} />
        <Route path="/invitations" element={<Invitations />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}