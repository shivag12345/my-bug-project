import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, ListSubheader, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Box, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ForumIcon from "@mui/icons-material/Forum";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useState, type MouseEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, crud, currentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { IssueForm } from "../components/IssueForm";
import { IssueDetailDialog } from "../components/IssueDetailDialog";
import { PageHeader } from "../components/PageHeader";
import type { Issue, IssueStatus, Project, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

const developerStatusOptions: { label: string; value: IssueStatus }[] = [
  { label: "Pick Bug", value: "ASSIGNED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Fixed", value: "FIXED" },
  { label: "Ready for Testing", value: "READY_FOR_TESTING" }
];

const testerStatusOptions: { label: string; value: IssueStatus }[] = [
  { label: "Reopen bug if failed", value: "REOPENED" },
  { label: "Close bug after successful testing", value: "CLOSED" }
];

const issueColumns = [
  { key: "id", label: "ID", width: 90 },
  { key: "title", label: "Title", width: 190 },
  { key: "project", label: "Project", width: 220 },
  { key: "category", label: "Category", width: 160 },
  { key: "status", label: "Status", width: 180 },
  { key: "priority", label: "Priority", width: 120 },
  { key: "severity", label: "Severity", width: 120 },
  { key: "assignee", label: "Assignee", width: 250 },
  { key: "dueDate", label: "Due Date", width: 130 },
  { key: "actions", label: "Actions", width: 160 }
];

const tableMinWidth = issueColumns.reduce((total, column) => total + column.width, 0);

const wrappingCellSx = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  whiteSpace: "normal",
  verticalAlign: "top"
};

function uploadIssueScreenshots(issueId: string, screenshots: File[]) {
  const form = new FormData();
  screenshots.forEach((file) => form.append("files", file));
  return api<Issue>(`/issues/${issueId}/uploads`, { method: "POST", body: form });
}

function userId(user?: User | null) {
  return user?._id ?? user?.id;
}

function isWatching(issue: Issue, id?: string) {
  if (!id) return false;
  return issue.watchers?.some((watcher) => (typeof watcher === "string" ? watcher : watcher._id ?? watcher.id) === id) ?? false;
}

export function IssuesPage({ scope }: { scope: "all" | "mine" | "watchlist" }) {
  const qc = useQueryClient();
  const me = currentUser<User>();
  const meId = userId(me);
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [statusMenu, setStatusMenu] = useState<{ anchorEl: HTMLElement; issue: Issue } | null>(null);
  const issues = useQuery({ queryKey: ["issues", scope], queryFn: () => api<Issue[]>("/issues") });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => crud.list<Project>("projects") });
  const users = useQuery({ queryKey: ["users"], queryFn: () => crud.list<User>("users") });
  const create = useMutation({
    mutationFn: async ({ data, screenshots }: { data: unknown; screenshots: File[] }) => {
      const issue = await crud.create<Issue>("issues", data);
      return screenshots.length ? uploadIssueScreenshots(issue._id, screenshots) : issue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      setCreateOpen(false);
    }
  });
  const update = useMutation({
    mutationFn: async ({ id, data, screenshots }: { id: string; data: unknown; screenshots: File[] }) => {
      const issue = await crud.update<Issue>("issues", id, data);
      return screenshots.length ? uploadIssueScreenshots(id, screenshots) : issue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      setEditing(null);
    }
  });
  const remove = useMutation({ mutationFn: (id: string) => crud.remove("issues", id), onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }) });
  const watch = useMutation({ mutationFn: (id: string) => api(`/issues/${id}/watch`, { method: "POST" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }) });
  const unwatch = useMutation({ mutationFn: (id: string) => api(`/issues/${id}/watch`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }) });
  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IssueStatus }) => crud.update<Issue>("issues", id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setStatusMenu(null);
    }
  });

  if (issues.isPending || projects.isPending || users.isPending || issues.error || projects.error || users.error) {
    return <DataState loading={issues.isPending || projects.isPending || users.isPending} error={issues.error || projects.error || users.error} />;
  }

  const canCreate = me?.role === "Admin" || me?.role === "Tester";
  const canEdit = me?.role === "Admin" || me?.role === "Tester";
  const canDelete = me?.role === "Admin";
  const statusOptions = me?.role === "Developer" ? developerStatusOptions : me?.role === "Tester" ? testerStatusOptions : [];
  const canChangeIssueStatus = statusOptions.length > 0;
  const createActionLabel = "Create Bug";
  const statusActionLabel = me?.role === "Tester" ? "Verify fix" : "Change status";
  const requestedStatus = searchParams.get("status");
  const activeStatus = (["OPEN", "BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "REOPENED", "CLOSED"] as IssueStatus[]).includes(requestedStatus as IssueStatus)
    ? requestedStatus as IssueStatus
    : undefined;

  const rows = issues.data!.filter((issue) => {
    const matchesScope = scope === "mine"
      ? issue.assignee?._id === meId || issue.assignee?.id === meId || issue.reporter?._id === meId || issue.reporter?.id === meId
      : scope === "watchlist"
        ? isWatching(issue, meId)
        : true;
    return matchesScope && (!activeStatus || issue.status === activeStatus);
  });

  const clearStatusFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    setSearchParams(next);
  };

  const openStatusMenu = (event: MouseEvent<HTMLElement>, issue: Issue) => {
    setStatusMenu({ anchorEl: event.currentTarget, issue });
  };

  return (
    <>
      <PageHeader title={scope === "mine" ? "My Bugs" : scope === "watchlist" ? "Watchlist" : "Bugs"} action={canCreate ? createActionLabel : undefined} onAction={canCreate ? () => setCreateOpen(true) : undefined} />
      {activeStatus && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Showing:</Typography>
          <Chip label={issueStatusLabel(activeStatus, me?.role)} color="primary" onDelete={clearStatusFilter} />
          <Button size="small" onClick={clearStatusFilter}>Clear filter</Button>
        </Stack>
      )}
      <TableContainer sx={{ maxWidth: "100%", overflowX: "auto", pb: 1 }}>
        <Table
          size="small"
          sx={{
            minWidth: tableMinWidth,
            tableLayout: "fixed",
            "& .MuiTableCell-root": { px: 1.25, py: 1.5 }
          }}
        >
          <TableHead>
            <TableRow>
              {issueColumns.map((column) => (
                <TableCell key={column.key} sx={{ width: column.width, fontWeight: 800, whiteSpace: "nowrap" }}>{column.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((issue) => {
              const watching = isWatching(issue, meId);
              return (
                <TableRow key={issue._id}>
                  <TableCell sx={wrappingCellSx}>
                    <Box
                      sx={{ cursor: "pointer", color: "primary.main", fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
                      onClick={() => setSelected(issue)}
                    >
                      {issue.issueNumber}
                    </Box>
                  </TableCell>
                  <TableCell sx={wrappingCellSx}>
                    <Tooltip title={issue.description || "No description provided"} arrow>
                      <Box sx={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSelected(issue)}>{issue.title}</Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={wrappingCellSx}>{issue.project?.name}</TableCell>
                  <TableCell sx={wrappingCellSx}>{issue.category}</TableCell>
                  <TableCell sx={wrappingCellSx}><Chip size="small" label={issueStatusLabel(issue.status, me?.role)} sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} /></TableCell>
                  <TableCell sx={wrappingCellSx}>{issue.priority}</TableCell>
                  <TableCell sx={wrappingCellSx}>{issue.severity}</TableCell>
                  <TableCell sx={wrappingCellSx}>{issue.assignee?.name ?? "Unassigned"}</TableCell>
                  <TableCell sx={wrappingCellSx}>{issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : ""}</TableCell>
                  <TableCell sx={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="View details and comments">
                        <IconButton size="small" aria-label="View bug details" onClick={() => setSelected(issue)}><ForumIcon /></IconButton>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip title="Edit bug">
                          <IconButton size="small" color="primary" aria-label="Edit bug" onClick={() => setEditing(issue)}><EditIcon /></IconButton>
                        </Tooltip>
                      )}
                      {canChangeIssueStatus && (
                        <Tooltip title={statusActionLabel}>
                          <IconButton size="small" aria-label={statusActionLabel} onClick={(event) => openStatusMenu(event, issue)}><MoreHorizIcon /></IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={watching ? "Remove from watchlist" : "Add to watchlist"}>
                        <IconButton size="small" aria-label={watching ? "Remove from watchlist" : "Add to watchlist"} onClick={() => (watching ? unwatch : watch).mutate(issue._id)}>
                          {watching ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </Tooltip>
                      {canDelete && (
                        <Tooltip title="Delete bug">
                          <IconButton size="small" color="error" aria-label="Delete bug" onClick={() => remove.mutate(issue._id)}><DeleteIcon /></IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Menu anchorEl={statusMenu?.anchorEl ?? null} open={Boolean(statusMenu)} onClose={() => setStatusMenu(null)}>
        <ListSubheader>{me?.role === "Tester" ? "Verify fix" : "Change status to"}</ListSubheader>
        {statusOptions.map((option) => (
          <MenuItem
            key={option.value}
            disabled={changeStatus.isPending || statusMenu?.issue.status === option.value}
            onClick={() => statusMenu && changeStatus.mutate({ id: statusMenu.issue._id, status: option.value })}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
      {canCreate && <Button sx={{ mt: 2 }} startIcon={<AddIcon />} variant="outlined" onClick={() => setCreateOpen(true)}>New Bug</Button>}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create Bug</DialogTitle>
        <DialogContent><IssueForm projects={projects.data!} users={users.data!} currentUserRole={me?.role} onSubmit={(data, screenshots) => create.mutate({ data, screenshots })} /></DialogContent>
      </Dialog>
      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Bug</DialogTitle>
        <DialogContent>
          {editing && <IssueForm projects={projects.data!} users={users.data!} initial={editing} currentUserRole={me?.role} onSubmit={(data, screenshots) => update.mutate({ id: editing._id, data, screenshots })} />}
        </DialogContent>
      </Dialog>
      <IssueDetailDialog
        issue={selected}
        open={Boolean(selected)}
        currentUserRole={me?.role}
        onClose={() => setSelected(null)}
        onIssuePatched={(patch) => setSelected((current) => (current ? { ...current, ...patch } : current))}
      />
    </>
  );
}
