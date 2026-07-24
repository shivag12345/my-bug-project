import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { AppBar, Avatar, Badge, Box, Divider, Drawer, IconButton, InputBase, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Typography } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BugReportIcon from "@mui/icons-material/BugReport";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import AssignmentIcon from "@mui/icons-material/Assignment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import FlagIcon from "@mui/icons-material/Flag";
import GroupsIcon from "@mui/icons-material/Groups";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AUTH_EXPIRED_EVENT, api, clearSession, currentUser, setCurrentUser } from "../api/client";
import { connectSocket, disconnectSocket } from "../api/socket";
import type { Role, User } from "../types";

const drawerWidth = 270;
type AppNotification = { _id: string; title: string; message: string; type: string; entity?: string; read?: boolean; createdAt: string };

const sections: { label: string; items: { text: string; icon: ReactNode; to: string; roles?: Role[] }[] }[] = [
  { label: "", items: [{ text: "Dashboard", icon: <DashboardIcon />, to: "/" }] },
  { label: "TRACKING", items: [
    { text: "Bugs", icon: <BugReportIcon />, to: "/issues" },
    { text: "Kanban", icon: <ViewKanbanIcon />, to: "/kanban" },
    { text: "My Bugs", icon: <AssignmentIndIcon />, to: "/my-issues" },
    { text: "Tasks", icon: <AssignmentIcon />, to: "/tasks", roles: ["Admin"] },
    { text: "Watchlist", icon: <VisibilityIcon />, to: "/watchlist" },
    { text: "Reports", icon: <AssessmentIcon />, to: "/reports", roles: ["Admin"] }
  ] },
  { label: "MANAGEMENT", items: [
    { text: "Chat", icon: <ChatBubbleOutlineIcon />, to: "/management", roles: ["Admin", "Developer", "Tester"] },
    { text: "Projects", icon: <AccountTreeIcon />, to: "/projects", roles: ["Admin"] },
    { text: "Milestones", icon: <FlagIcon />, to: "/milestones", roles: ["Admin"] },
    { text: "Teams", icon: <GroupsIcon />, to: "/teams", roles: ["Admin"] },
    { text: "Users", icon: <PeopleIcon />, to: "/users", roles: ["Admin"] }
  ] },
  { label: "SETTINGS", items: [
    { text: "Categories", icon: <SettingsIcon />, to: "/categories" },
    { text: "Priorities", icon: <SettingsIcon />, to: "/priorities" },
    { text: "Statuses", icon: <SettingsIcon />, to: "/statuses" },
    { text: "Email Templates", icon: <SettingsIcon />, to: "/email-templates" },
    { text: "Settings", icon: <SettingsIcon />, to: "/settings" }
  ] }
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(() => currentUser<User>());
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<HTMLElement | null>(null);
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/auth/me"), retry: false });
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<AppNotification[]>("/notifications"),
    enabled: Boolean(me.data),
    retry: false
  });
  const unread = notifications.filter((n) => !n.read).length;
  const markNotificationRead = useMutation({
    mutationFn: (id: string) => api<AppNotification>(`/notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] })
  });

  useEffect(() => {
    if (!me.data) return;
    setCurrentUser(me.data);
    setUser(me.data);
  }, [me.data]);

  useEffect(() => {
    const handleAuthExpired = () => {
      disconnectSocket();
      clearSession();
      qc.clear();
      setUser(null);
      navigate("/login", { replace: true });
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [navigate, qc]);

  useEffect(() => {
    if (!me.data) return;
    const socket = connectSocket();
    socket?.on("notification:new", () => qc.invalidateQueries({ queryKey: ["notifications"] }));
    return () => {
      socket?.off("notification:new");
    };
  }, [qc, me.data]);

  const logout = () => {
    disconnectSocket();
    clearSession();
    qc.clear();
    setUser(null);
    navigate("/login", { replace: true });
  };

  const openNotification = (notification: AppNotification) => {
    if (!notification.read) markNotificationRead.mutate(notification._id);
    setNotificationAnchor(null);
    if (notification.entity) navigate("/issues");
  };

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || (user?.role && item.roles.includes(user.role)))
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Box sx={{ display: "flex", minHeight: "100%", width: "100%", overflowX: "hidden" }}>
      <Drawer variant="permanent" sx={{ width: drawerWidth, "& .MuiDrawer-paper": { width: drawerWidth, borderRight: "1px solid #dde3ea" } }}>
        <Box sx={{ px: 2, py: 2.2 }}>
          <Typography variant="h6">Bug Tracking</Typography>
          <Typography variant="caption" color="text.secondary">Enterprise bug management</Typography>
        </Box>
        <Divider />
        <List dense sx={{ px: 1 }}>
          {visibleSections.map((section) => (
            <Box key={section.label || "main"}>
              {section.label && <Typography sx={{ px: 2, pt: 2, pb: 0.5, fontSize: 11, fontWeight: 800, color: "text.secondary" }}>{section.label}</Typography>}
              {section.items.map((item) => (
                <ListItemButton key={item.to} component={RouterLink} to={item.to} selected={location.pathname === item.to} sx={{ borderRadius: 1, mb: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              ))}
            </Box>
          ))}
        </List>
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid #dde3ea" }}>
          <Toolbar sx={{ gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", bgcolor: "#eef2f6", borderRadius: 1, px: 1.5, flex: 1, maxWidth: 560 }}>
              <SearchIcon color="action" />
              <InputBase placeholder="Search bugs, projects, users" sx={{ ml: 1, flex: 1 }} />
            </Box>
            <IconButton aria-label="Notifications" onClick={(e) => setNotificationAnchor(e.currentTarget)}>
              <Badge badgeContent={unread} color="error"><NotificationsIcon /></Badge>
            </IconButton>
            <Menu
              anchorEl={notificationAnchor}
              open={Boolean(notificationAnchor)}
              onClose={() => setNotificationAnchor(null)}
              PaperProps={{ sx: { width: 360, maxWidth: "calc(100vw - 32px)", maxHeight: 420 } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" fontWeight={800}>Notifications</Typography>
                <Typography variant="caption" color="text.secondary">{unread} unread</Typography>
              </Box>
              <Divider />
              {notifications.length ? notifications.map((notification) => (
                <MenuItem
                  key={notification._id}
                  onClick={() => openNotification(notification)}
                  sx={{ alignItems: "flex-start", gap: 1, whiteSpace: "normal", py: 1.25 }}
                >
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: notification.read ? "transparent" : "error.main", mt: 0.75, flex: "0 0 auto" }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={notification.read ? 500 : 800}>{notification.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{notification.message}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(notification.createdAt).toLocaleString()}</Typography>
                  </Box>
                </MenuItem>
              )) : (
                <MenuItem disabled>No notifications</MenuItem>
              )}
            </Menu>
            <IconButton onClick={(e) => setAnchor(e.currentTarget)}><Avatar src={user?.profileImage}>{user?.name?.[0] ?? "P"}</Avatar></IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <MenuItem disabled>{user?.name} · {user?.role}</MenuItem>
              <MenuItem onClick={logout}>Logout</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: 3, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
