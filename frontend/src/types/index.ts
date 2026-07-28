export type Role = "Admin" | "Developer" | "Tester";
export type IssueStatus = "OPEN" | "BUG_BUCKET" | "ASSIGNED" | "IN_PROGRESS" | "FIXED" | "READY_FOR_TESTING" | "REOPENED" | "CLOSED";
export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IssueSeverity = "MINOR" | "MAJOR" | "CRITICAL" | "BLOCKER";
export type IssueCategory = "UI Bug" | "Backend Bug" | "API Bug" | "Database Bug" | "Performance Bug" | "Security Bug" | "Mobile Bug" | "Enhancement Request";

export interface UserSmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  hasPassword: boolean;
  configured: boolean;
}

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  profileImage?: string;
  disabled?: boolean;
  smtpConfigured?: boolean;
  smtp?: UserSmtpSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  _id: string;
  name: string;
  key: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  teams?: (Team | string)[];
  members?: (User | string)[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Team {
  _id: string;
  name: string;
  description?: string;
  lead?: User | string;
  members?: (User | string)[];
}

export type ModulePage = "Login Page" | "Dashboard" | "Reports" | "User Management" | "API" | "Database" | "Mobile UI" | "Notifications" | "Authentication" | "Chat" | "File Upload";

export interface Issue {
  _id: string;
  issueNumber: string;
  type: "Bug" | "Task" | "Story" | "Improvement";
  category: IssueCategory;
  modulePage: ModulePage;
  title: string;
  description?: string;
  project: Project;
  reporter: User;
  assignee?: User;
  priority: IssuePriority;
  severity: IssueSeverity;
  status: IssueStatus;
  assignedBy?: User;
  labels?: string[];
  attachments?: string[];
  watchers?: (User | string)[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
