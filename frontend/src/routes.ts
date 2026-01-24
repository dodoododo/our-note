// src/lib/routes.ts
export type RouteKey =
  | "Home"
  | "Calendar"
  | "Groups"
  | "Messages"
  | "Tasks"
  | "Notes"
  | "Events"
  | "Invitations"
  | "Settings"
  | "Whiteboard"
  | "Landing";

export const ROUTE_PATHS: Record<RouteKey, string> = {
  Home: "/",
  Calendar: "/calendar",
  Groups: "/groups",
  Messages: "/messages",
  Tasks: "/tasks",
  Notes: "/notes",
  Events: "/events",
  Invitations: "/invitations",
  Settings: "/settings",
  Whiteboard: "/whiteboard",
  Landing: "/landing",
};

export function createPageUrl(key: RouteKey): string {
  return ROUTE_PATHS[key];
}

/**
 * URL → RouteKey
 */
export function getRouteKeyFromPath(pathname: string): RouteKey {
  const entry = Object.entries(ROUTE_PATHS).find(
    ([, path]) => path === pathname
  );

  return (entry?.[0] as RouteKey) ?? "Home";
}
