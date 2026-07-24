import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Chip, Grid2 as Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { api, currentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { IssueDetailDialog } from "../components/IssueDetailDialog";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import type { Issue, IssueStatus, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

type Count = { _id: string; value: number };
type DashboardStats = {
  totalProjects: number;
  totalUsers: number;
  bugTotal: number;
  taskTotal: number;
  bugByPriority: Count[];
  taskByPriority: Count[];
  bugByStatus: Count[];
  taskByStatus: Count[];
};

const colors = ["#0f62fe", "#da1e28", "#ff832b", "#24a148", "#8a3ffc"];
const statusOrder: IssueStatus[] = ["OPEN", "BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "REOPENED", "CLOSED"];
const dashboardPanelSx = { height: "100%", borderRadius: "8px", border: "1px solid", borderColor: "divider", boxShadow: "0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px -1px rgb(15 23 42 / 0.1)" };

function countFor(counts: Count[], status: IssueStatus) {
  return counts.find((count) => count._id === status)?.value ?? 0;
}

function flowData(counts: Count[], role?: User["role"]) {
  return statusOrder
    .filter((status) => status !== "BUG_BUCKET" || countFor(counts, status) > 0)
    .map((status) => ({ name: issueStatusLabel(status, role), value: countFor(counts, status) }));
}

function ReportCards({ title, cards }: { title: string; cards: { label: string; value: number }[] }) {
  return (
    <Card sx={dashboardPanelSx}>
      <CardContent>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>{title}</Typography>
        <Grid container spacing={1.5}>
          {cards.map((card) => (
            <Grid size={{ xs: 6, sm: 4 }} key={card.label}>
              <Box sx={{ borderLeft: "4px solid", borderColor: title === "Bug Report" ? "primary.main" : "success.main", bgcolor: "action.hover", borderRadius: 1, px: 1.5, py: 1 }}>
                <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                <Typography variant="h5" fontWeight={900}>{card.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const me = currentUser<User>();
  const navigate = useNavigate();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: () => api<DashboardStats>("/reports/dashboard") });
  const issues = useQuery({ queryKey: ["issues", "recent"], queryFn: () => api<Issue[]>("/issues") });

  if (stats.isPending || issues.isPending || stats.error || issues.error) return <DataState loading={stats.isPending || issues.isPending} error={stats.error || issues.error} />;

  const data = stats.data!;
  const bugFlow = flowData(data.bugByStatus, me?.role);
  const taskFlow = flowData(data.taskByStatus, me?.role);
  const issuePath = (status?: IssueStatus) => status ? `/issues?status=${status}` : "/issues";
  const cards = [
    { label: "Total Projects", value: data.totalProjects, to: "/projects" },
    { label: "Total Bugs", value: data.bugTotal, to: issuePath() },
    { label: "Active Bugs", value: data.bugTotal - countFor(data.bugByStatus, "CLOSED"), to: issuePath("IN_PROGRESS") },
    { label: "Total Tasks", value: data.taskTotal, to: "/tasks" },
    { label: "Active Tasks", value: data.taskTotal - countFor(data.taskByStatus, "CLOSED"), to: "/tasks" },
    { label: "Total Users", value: data.totalUsers, to: "/users" }
  ];
  const recentWork = [...issues.data!].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8);

  return (
    <>
      <PageHeader title="Dashboard" />
      <Typography color="text.secondary" sx={{ mb: 3 }}>Task and bug reports, workflow progress, and recent team activity.</Typography>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={card.label}>
            <StatCard {...card} variant="plain" size="compact" onClick={() => navigate(card.to)} actionLabel={`View ${card.label.toLowerCase()}`} />
          </Grid>
        ))}

        <Grid size={{ xs: 12, lg: 6 }}>
          <ReportCards title="Bug Report" cards={[
            { label: "Open", value: countFor(data.bugByStatus, "OPEN") },
            { label: "Reported", value: countFor(data.bugByStatus, "BUG_BUCKET") },
            { label: "Assigned", value: countFor(data.bugByStatus, "ASSIGNED") },
            { label: "In Progress", value: countFor(data.bugByStatus, "IN_PROGRESS") },
            { label: "Fixed", value: countFor(data.bugByStatus, "FIXED") },
            { label: "Closed", value: countFor(data.bugByStatus, "CLOSED") }
          ]} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ReportCards title="Task Report" cards={[
            { label: "Open", value: countFor(data.taskByStatus, "OPEN") },
            { label: "Assigned", value: countFor(data.taskByStatus, "ASSIGNED") },
            { label: "In Progress", value: countFor(data.taskByStatus, "IN_PROGRESS") },
            { label: "Fixed", value: countFor(data.taskByStatus, "FIXED") },
            { label: "Ready for Testing", value: countFor(data.taskByStatus, "READY_FOR_TESTING") },
            { label: "Closed", value: countFor(data.taskByStatus, "CLOSED") }
          ]} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6" fontWeight={800}>Bug Flow</Typography><Typography variant="body2" color="text.secondary">Bugs by workflow status</Typography><Box sx={{ height: 280, mt: 1 }}><ResponsiveContainer><BarChart data={bugFlow}><XAxis dataKey="name" interval={0} angle={-22} textAnchor="end" height={70} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#0f62fe" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6" fontWeight={800}>Task Flow</Typography><Typography variant="body2" color="text.secondary">Tasks by workflow status</Typography><Box sx={{ height: 280, mt: 1 }}><ResponsiveContainer><BarChart data={taskFlow}><XAxis dataKey="name" interval={0} angle={-22} textAnchor="end" height={70} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#24a148" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6" fontWeight={800}>Bugs by Priority</Typography><Box sx={{ height: 260 }}><ResponsiveContainer><PieChart><Pie data={data.bugByPriority} dataKey="value" nameKey="_id" innerRadius={58} outerRadius={92} label>{data.bugByPriority.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6" fontWeight={800}>Tasks by Priority</Typography><Box sx={{ height: 260 }}><ResponsiveContainer><PieChart><Pie data={data.taskByPriority} dataKey="value" nameKey="_id" innerRadius={58} outerRadius={92} label>{data.taskByPriority.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>

        <Grid size={12}>
          <Card sx={dashboardPanelSx}><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}><Box><Typography variant="h6" fontWeight={800}>Recent Task and Bug Activity</Typography><Typography variant="body2" color="text.secondary">Most recently updated work items</Typography></Box></Stack><Box sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow>{["ID", "Type", "Title", "Project", "Status", "Priority", "Assignee", "Updated"].map((heading) => <TableCell key={heading} sx={{ whiteSpace: "nowrap", fontWeight: 800 }}>{heading}</TableCell>)}</TableRow></TableHead><TableBody>{recentWork.map((issue) => <TableRow key={issue._id} hover onClick={() => setSelectedIssue(issue)} sx={{ cursor: "pointer" }}><TableCell>{issue.issueNumber}</TableCell><TableCell><Chip size="small" label={issue.type ?? "Bug"} color={issue.type === "Task" ? "success" : "primary"} /></TableCell><TableCell>{issue.title}</TableCell><TableCell>{issue.project?.key}</TableCell><TableCell><Chip size="small" label={issueStatusLabel(issue.status, me?.role)} /></TableCell><TableCell>{issue.priority}</TableCell><TableCell>{issue.assignee?.name ?? "Unassigned"}</TableCell><TableCell>{new Date(issue.updatedAt).toLocaleDateString()}</TableCell></TableRow>)}</TableBody></Table></Box></CardContent></Card>
        </Grid>
      </Grid>

      <IssueDetailDialog issue={selectedIssue} open={Boolean(selectedIssue)} currentUserRole={me?.role} onClose={() => setSelectedIssue(null)} />
    </>
  );
}
