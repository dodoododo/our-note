import { Routes, Route, useLocation } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

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

export default function App() {
  const location = useLocation();

  const currentPageName = getRouteKeyFromPath(location.pathname);

  return (
    <MainLayout currentPageName={currentPageName}>
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
      </Routes>
    </MainLayout>
  );
}
