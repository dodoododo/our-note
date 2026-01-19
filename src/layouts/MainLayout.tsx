import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Users,
  Calendar,
  FileText,
  CheckSquare,
  MapPin,
  Bell,
  Settings,
  Menu,
  X,
  Heart,
  LogOut,
  ChevronDown,
  MessageCircle,
  Palette,
} from "lucide-react";

import { mockApiClient } from "@/lib/mockApiClient";
import { createPageUrl, type RouteKey } from "@/routes";
import { generateThemeFromColor } from "@/components/theme/ThemeGenerator";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

/* ================== Types ================== */

interface Theme {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  accentAlt: string;
  gradient: string;
  gradientAlt: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  profile_pic_url?: string;
  theme_hue?: number;
}

interface Invitation {
  id: string;
  invitee_email: string;
  status: string;
}

interface NavItem {
  name: string;
  icon: React.ElementType;
  page: RouteKey;
}

interface MainLayoutProps {
  children: React.ReactNode;
  currentPageName: RouteKey;
}

/* ================== Layout ================== */

export default function MainLayout({
  children,
  currentPageName,
}: MainLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [theme, setTheme] = useState<Theme | null>(null);

  const navigate = useNavigate();

  /* ---------- Load data ---------- */

  useEffect(() => {
    loadUser();
    loadInvitations();
  }, []);

  useEffect(() => {
    const hue = user?.theme_hue ?? 250;
    setTheme(generateThemeFromColor(hue));
  }, [user]);

  const loadUser = async () => {
    try {
      const me = await mockApiClient.auth.me();
      setUser(me);
    } catch {}
  };

  const loadInvitations = async () => {
    try {
      const me = await mockApiClient.auth.me();
      if (!me) return;

      const data = await mockApiClient.entities.Invitation.filter({
        invitee_email: me.email,
        status: "pending",
      });

      setInvitations(data);
    } catch {}
  };

  const handleLogout = () => {
    mockApiClient.auth.redirectToLogin();
    navigate("/login");
  };

  const getInitials = (name?: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "U";

  /* ---------- Navigation ---------- */

  const navItems: NavItem[] = [
    { name: "Home", icon: Home, page: "Home" },
    { name: "Groups", icon: Users, page: "Groups" },
    { name: "Messages", icon: MessageCircle, page: "Messages" },
    { name: "Calendar", icon: Calendar, page: "Calendar" },
    { name: "Tasks", icon: CheckSquare, page: "Tasks" },
    { name: "Notes", icon: FileText, page: "Notes" },
    { name: "Events", icon: MapPin, page: "Events" },
    { name: "Whiteboard", icon: Palette, page: "Whiteboard" },
    { name: "Invitations", icon: Bell, page: "Invitations" }, // ✅ ADDED
  ];

  /* ================== JSX ================== */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {theme && (
        <style>{`
          :root {
            --theme-primary: ${theme.primary};
            --theme-gradient: ${theme.gradient};
          }
        `}</style>
      )}

      {/* ===== Mobile Header ===== */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: theme?.gradient }}
            >
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-800">
                OurNote
            </span>
          </div>

          <Link to={createPageUrl("Invitations")} className="relative p-2">
            <Bell className="w-5 h-5" />
            {invitations.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                {invitations.length}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ===== Mobile Sidebar ===== */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <Sidebar
                {...{
                  user,
                  theme,
                  invitations,
                  navItems,
                  currentPageName,
                  getInitials,
                  onLogout: handleLogout,
                  onClose: () => setSidebarOpen(false),
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== Desktop Sidebar ===== */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-72 bg-white border-r">
        <Sidebar
          {...{
            user,
            theme,
            invitations,
            navItems,
            currentPageName,
            getInitials,
            onLogout: handleLogout,
          }}
        />
      </aside>

      {/* ===== Main Content ===== */}
      <main className="lg:ml-72 pt-16 lg:pt-0 p-4 lg:p-8 mt-4 lg:mt-8">
        {children}
      </main>
    </div>
  );
}

/* ================== Sidebar ================== */

function Sidebar({
  user,
  theme,
  invitations,
  navItems,
  currentPageName,
  onClose,
  onLogout,
  getInitials,
}: any) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: theme?.gradient }}
          >
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-3xl font-extrabold tracking-tight text-slate-800">
                OurNote
            </span>
            <p className="text-x text-slate-500">Together, organized</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2">
            <X />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item: NavItem) => {
          const active = currentPageName === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition ${
                active
                  ? "text-white shadow-lg"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              style={active ? { background: theme?.gradient } : {}}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>

              {item.page === "Invitations" && invitations.length > 0 && (
                <Badge className="ml-auto bg-red-500 text-white">
                  {invitations.length}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-slate-100">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{user.full_name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56">
              <DropdownMenuItem asChild>
                <Link to={createPageUrl("Settings")}>
                  <Settings className="mr-2 w-4 h-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="mr-2 w-4 h-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
