import { useForm, useWatch } from "react-hook-form";
import { useState } from "react";
import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import type { Issue, IssueCategory, IssueStatus, Project, Role, User, ModulePage } from "../types";
import { issueStatusLabel } from "../utils/issues";

const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statuses: IssueStatus[] = ["OPEN", "BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "REOPENED", "CLOSED"];
const categories: IssueCategory[] = ["UI Bug", "Backend Bug", "API Bug", "Database Bug", "Performance Bug", "Security Bug", "Mobile Bug", "Enhancement Request"];
const modulePages: ModulePage[] = ["Login Page", "Dashboard", "Reports", "User Management", "API", "Database", "Mobile UI", "Notifications", "Authentication", "Chat", "File Upload"];

export function IssueForm({
  projects,
  users,
  initial,
  currentUserRole,
  onSubmit
}: {
  projects: Project[];
  users: User[];
  initial?: Partial<Issue>;
  currentUserRole?: Role;
  onSubmit: (data: unknown, screenshots: File[]) => void;
}) {
  const canSetCoreFields = currentUserRole === "Admin" || currentUserRole === "Tester";
  const canSetTesterFields = currentUserRole === "Tester";
  const canSetStatusOnly = currentUserRole === "Developer";
  const canSetAssignee = currentUserRole === "Admin";
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      type: initial?.type ?? "Bug",
      category: initial?.category ?? "",
      modulePage: initial?.modulePage ?? "Login Page",
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      project: initial?.project?._id ?? projects[0]?._id ?? "",
      assignee: initial?.assignee?._id ?? "",
      priority: initial?.priority ?? "MEDIUM",
      status: initial?.status ?? (currentUserRole === "Tester" ? "BUG_BUCKET" : "OPEN"),
      dueDate: initial?.dueDate?.slice(0, 10) ?? ""
    }
  });

  const selectedProjectId = useWatch({ control, name: "project" });
  const selectedProject = projects.find(p => p._id === selectedProjectId);
  const projectMembers = selectedProject?.members ?? [];
  const projectMemberIds = new Set(projectMembers.map(m => typeof m === "string" ? m : m._id ?? m.id));
  const availableAssignees = users.filter(u => projectMemberIds.has(u._id ?? u.id));

  return (
    <Box component="form" onSubmit={handleSubmit((data) => {
      const payload: Record<string, unknown> = canSetStatusOnly && !canSetCoreFields ? { status: data.status } : { ...data };
      if (!payload.assignee) delete payload.assignee;
      if (!payload.dueDate) delete payload.dueDate;
      if (canSetTesterFields) {
        delete payload.severity;
        delete payload.labels;
        delete payload.assignee;
        delete payload.status;
      } else if (canSetCoreFields) {
        delete payload.priority;
        delete payload.severity;
        delete payload.status;
        delete payload.labels;
        delete payload.dueDate;
      } else {
        delete payload.priority;
        delete payload.severity;
        delete payload.labels;
        delete payload.dueDate;
      }
      onSubmit(payload, screenshots);
    })}>
      <Stack spacing={2}>
        {canSetCoreFields && (
          <>
            <TextField
              select
              label="Module/Page"
              error={Boolean(errors.modulePage)}
              helperText={errors.modulePage ? "Select module/page" : undefined}
              {...register("modulePage", { required: true })}
            >
              {modulePages.map((mp) => <MenuItem key={mp} value={mp}>{mp}</MenuItem>)}
            </TextField>
            <TextField label="Title" {...register("title", { required: true })} />
            <TextField label={initial?.type === "Task" ? "Task Requirements" : "Steps to Reproduce"} multiline minRows={4} {...register("description")} />
            {initial?.type !== "Task" && (
              <TextField select label="Bug Type" {...register("type")}>{["Bug", "Task", "Story", "Improvement"].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField>
            )}
            <TextField
              select
              label="Category"
              error={Boolean(errors.category)}
              helperText={errors.category ? "Select category" : undefined}
              {...register("category", { required: true })}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="">Select category</MenuItem>
              {categories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
            </TextField>
            <TextField select label="Project" {...register("project")}>{projects.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}</TextField>
            {canSetAssignee && <TextField select label="Suggested Developer" {...register("assignee")}><MenuItem value="">Unassigned</MenuItem>{availableAssignees.length > 0 ? availableAssignees.map((u) => <MenuItem key={u._id ?? u.id} value={u._id ?? u.id}>{u.name}</MenuItem>) : <MenuItem disabled>No members in this project</MenuItem>}</TextField>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
              <Button component="label" startIcon={<AttachFileIcon />} variant="outlined">
                Screenshots
                <input hidden type="file" accept="image/png,image/jpeg" multiple onChange={(e) => setScreenshots(Array.from(e.target.files ?? []).slice(0, 5))} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {screenshots.length ? `${screenshots.length} screenshot(s) selected` : "Max 5 screenshots. PNG or JPG."}
              </Typography>
            </Stack>
          </>
        )}
        {canSetTesterFields && (
          <>
            <TextField select label="Priority" {...register("priority")}>{priorities.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField>
            <TextField label="Due Date" type="date" InputLabelProps={{ shrink: true }} {...register("dueDate")} />
          </>
        )}
        {canSetStatusOnly && <TextField select label="Status" {...register("status")}>{statuses.map((x) => <MenuItem key={x} value={x}>{issueStatusLabel(x, currentUserRole)}</MenuItem>)}</TextField>}
        <Button variant="contained" type="submit">
          Save {initial?.type === "Task" ? "Task" : "Bug"}
        </Button>
      </Stack>
    </Box>
  );
}
