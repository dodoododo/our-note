import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createPageUrl(pageName: string): string {
  const pageMap: Record<string, string> = {
    Home: "/",
    Calendar: "/calendar",
    Groups: "/groups",
    GroupDetail: "/group-detail",
    GroupChat: "/group-chat",
    GroupSettings: "/group-settings",
    Messages: "/messages",
    Tasks: "/tasks",
    Notes: "/notes",
    Events: "/events",
    Invitations: "/invitations",
    Settings: "/settings",
    Whiteboard: "/whiteboard",
  };

  return pageMap[pageName] || "/";
}
