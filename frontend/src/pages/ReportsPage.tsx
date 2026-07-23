import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardContent, Grid2 as Grid, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";

function exportFile(type: "csv" | "excel" | "pdf", data: unknown) {
  const blob = new Blob([type === "pdf" ? JSON.stringify(data, null, 2) : Object.entries(data as Record<string, unknown>).map(([k, v]) => `${k},${Array.isArray(v) ? v.length : 0}`).join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bug-tracking-report.${type === "excel" ? "xls" : type}`;
  a.click();
}

export function ReportsPage() {
  const reports = useQuery({ queryKey: ["reports"], queryFn: () => api<any>("/reports") });
  if (reports.isPending || reports.error) return <DataState loading={reports.isPending} error={reports.error} />;
  const data = reports.data.teamPerformance.map((x: any) => ({ user: x._id ?? "Unassigned", total: x.total, resolved: x.resolved }));
  return <>
    <PageHeader title="Reports" />
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      <Button startIcon={<DownloadIcon />} variant="outlined" onClick={() => exportFile("pdf", reports.data)}>PDF</Button>
      <Button startIcon={<DownloadIcon />} variant="outlined" onClick={() => exportFile("excel", reports.data)}>Excel</Button>
      <Button startIcon={<DownloadIcon />} variant="outlined" onClick={() => exportFile("csv", reports.data)}>CSV</Button>
    </Stack>
    <Grid container spacing={2}>
      {["Bug Summary", "Resolution Time", "Team Performance", "Project Status"].map((title) => <Grid key={title} size={{ xs: 12, md: 3 }}><Card><CardContent><Typography color="text.secondary">{title}</Typography><Typography variant="h4">{reports.data[title.toLowerCase().replace(/\s/g, "")]?.length ?? "-"}</Typography></CardContent></Card></Grid>)}
      <Grid size={{ xs: 12 }}><Card><CardContent><Typography variant="h6">Team Performance</Typography><ResponsiveContainer width="100%" height={320}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="user" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#0f62fe" /><Bar dataKey="resolved" fill="#24a148" /></BarChart></ResponsiveContainer></CardContent></Card></Grid>
    </Grid>
  </>;
}
