import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Chip, Grid2 as Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useState } from "react";
import { Line, LineChart, Pie, PieChart, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { api, currentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { IssueDetailDialog } from "../components/IssueDetailDialog";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import type { Issue, IssueStatus, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

const colors = ["#0f62fe", "#da1e28", "#ff832b", "#24a148", "#525252"];
const dashboardPanelSx = {
  height: "100%",
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px -1px rgb(15 23 42 / 0.1)"
};

export function DashboardPage() {
  const me = currentUser<User>();
  const navigate = useNavigate();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: () => api<any>("/reports/dashboard") });
  const issues = useQuery({ queryKey: ["issues", "recent"], queryFn: () => api<Issue[]>("/issues") });
  if (stats.isPending || issues.isPending || stats.error || issues.error) return <DataState loading={stats.isPending || issues.isPending} error={stats.error || issues.error} />;
  const allIssues = issues.data!;
  const issuePath = (status?: IssueStatus) => status ? `/issues?status=${status}` : "/issues";
  const cards = [
    { label: "Total Projects", value: stats.data!.totalProjects, to: "/projects", actionLabel: "View projects" },
    { label: "Total Bugs", value: stats.data!.total, to: issuePath(), actionLabel: "View all bugs" },
    { label: "Open Bugs", value: stats.data!.open, to: issuePath("OPEN") },
    { label: "Reported Bug", value: stats.data!.bugBucket, to: issuePath("BUG_BUCKET") },
    { label: "Assigned Bugs", value: stats.data!.assigned, to: issuePath("ASSIGNED") },
    { label: "In Progress", value: stats.data!.inProgress, to: issuePath("IN_PROGRESS") },
    { label: "Fixed Bugs", value: stats.data!.fixed, to: issuePath("FIXED") },
    { label: "Ready For Testing", value: stats.data!.readyForTesting, to: issuePath("READY_FOR_TESTING") },
    { label: "Closed Bugs", value: stats.data!.closed, to: issuePath("CLOSED") },
    { label: "Total Users", value: stats.data!.totalUsers, to: "/users", actionLabel: "View users" }
  ];
  const lineData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => ({ day, issues: Math.max(0, (stats.data!.total ?? 0) - 5 + i * 2) }));
  const priorityData = stats.data!.byPriority.map((x: any) => ({ name: x._id, value: x.value }));
  const statusData = stats.data!.byStatus.map((x: any) => ({ name: issueStatusLabel(x._id, me?.role), value: x.value }));

  return (
    <>
      <PageHeader title="Dashboard" />
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <StatCard {...card} variant="plain" size="compact" onClick={() => navigate(card.to)} actionLabel={card.actionLabel ?? `View ${card.label.toLowerCase()}`} />
          </Grid>
        ))}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6">Bugs Overview</Typography><Box sx={{ height: 260 }}><ResponsiveContainer><LineChart data={lineData}><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="issues" stroke="#0f62fe" strokeWidth={3} /></LineChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6">Bugs by Priority</Typography><Box sx={{ height: 260 }}><ResponsiveContainer><PieChart><Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} label>{priorityData.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={dashboardPanelSx}><CardContent><Typography variant="h6">Team Performance</Typography><Box sx={{ height: 240 }}><ResponsiveContainer><BarChart data={statusData}><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#24a148" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></Box></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={dashboardPanelSx}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Recent Bugs</Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["ID", "Title", "Project", "Category", "Status", "Priority", "Assignee", "Updated"].map((h) => (
                        <TableCell key={h} sx={{ whiteSpace: "nowrap", fontWeight: 800 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allIssues.slice(0, 8).map((issue) => (
                      <TableRow
                        key={issue._id}
                        hover
                        onClick={() => setSelectedIssue(issue)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.issueNumber}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.title}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.project?.key}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.category}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}><Chip size="small" label={issueStatusLabel(issue.status, me?.role)} /></TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.priority}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{issue.assignee?.name ?? "Unassigned"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(issue.updatedAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <IssueDetailDialog
        issue={selectedIssue}
        open={Boolean(selectedIssue)}
        currentUserRole={me?.role}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}
