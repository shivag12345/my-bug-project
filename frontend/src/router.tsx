import { Navigate, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { IssuesPage } from "./pages/IssuesPage";
import { KanbanPage } from "./pages/KanbanPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ManagementPage } from "./pages/ManagementPage";
import { UsersPage } from "./pages/UsersPage";
import { TeamsPage } from "./pages/TeamsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { TasksPage } from "./pages/TasksPage";
import { currentUser, getToken } from "./api/client";
import type { User } from "./types";

function Guard() {
  return getToken() ? <AppLayout /> : <Navigate to="/login" replace />;
}

function AdminOnly({ children }: { children: ReactNode }) {
  return currentUser<User>()?.role === "Admin" ? children : <Navigate to="/" replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <Guard />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "issues", element: <IssuesPage scope="all" /> },
      { path: "my-issues", element: <IssuesPage scope="mine" /> },
      { path: "watchlist", element: <IssuesPage scope="watchlist" /> },
      { path: "tasks", element: <AdminOnly><TasksPage /></AdminOnly> },
      { path: "kanban", element: <KanbanPage /> },
      { path: "management", element: <ManagementPage /> },
      { path: "projects", element: <AdminOnly><ProjectsPage /></AdminOnly> },
      { path: "milestones", element: <AdminOnly><SettingsPage resource="milestones" title="Milestones" /></AdminOnly> },
      { path: "teams", element: <AdminOnly><TeamsPage /></AdminOnly> },
      { path: "users", element: <UsersPage /> },
      { path: "reports", element: <AdminOnly><ReportsPage /></AdminOnly> },
      { path: "categories", element: <SettingsPage resource="categories" title="Categories" /> },
      { path: "priorities", element: <SettingsPage resource="priorities" title="Priorities" /> },
      { path: "statuses", element: <SettingsPage resource="statuses" title="Statuses" /> },
      { path: "email-templates", element: <SettingsPage resource="email-templates" title="Email Templates" template /> },
      { path: "settings", element: <AccountSettingsPage /> }
    ]
  }
]);
